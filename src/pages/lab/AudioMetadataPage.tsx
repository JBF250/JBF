import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { parseBlob } from 'music-metadata'
import { ID3Writer } from 'browser-id3-writer'
import { Upload, Download, Music, Loader2, Image as ImageIcon, X, Info } from 'lucide-react'

interface TagFields {
  title: string
  artist: string
  album: string
  year: string
}

interface CoverData {
  data: ArrayBuffer
  mime: string
}

type AudioExt = 'mp3' | 'm4a' | 'wav' | ''

function getExt(name: string): AudioExt {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'mp3' || ext === 'm4a' || ext === 'wav') return ext
  return ''
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) {
    out.set(a, off)
    off += a.length
  }
  return out
}

function typeBytes(type: string): Uint8Array {
  const b = new Uint8Array(4)
  for (let i = 0; i < 4; i++) b[i] = type.charCodeAt(i) & 0xff
  return b
}

function readType(bytes: Uint8Array, off: number): string {
  return String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3])
}

function u32be(bytes: Uint8Array, off: number): number {
  return ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0
}

// ---------- MP3 (ID3v2.3) ----------
function writeMp3(buf: ArrayBuffer, fields: TagFields, cover: CoverData | null): Blob {
  const writer = new ID3Writer(buf)
  if (fields.title) writer.setFrame('TIT2', fields.title)
  if (fields.artist) writer.setFrame('TPE1', [fields.artist])
  if (fields.album) writer.setFrame('TALB', fields.album)
  const year = parseInt(fields.year, 10)
  if (fields.year && !Number.isNaN(year)) writer.setFrame('TYER', year)
  if (cover) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writer.setFrame('APIC', { type: 3, data: cover.data, description: 'Cover' } as any)
  }
  return new Blob([writer.addTag()], { type: 'audio/mpeg' })
}

// ---------- WAV (RIFF INFO chunks, text only) ----------
function buildInfoChunk(fields: TagFields): Uint8Array {
  const subchunks: Uint8Array[] = []
  const add = (id: string, value: string) => {
    if (!value) return
    const data = utf8(value)
    const padLen = data.length % 2
    const sub = new Uint8Array(8 + data.length + padLen)
    sub.set(typeBytes(id), 0)
    new DataView(sub.buffer).setUint32(4, data.length, true)
    sub.set(data, 8)
    if (padLen) sub[8 + data.length] = 0
    subchunks.push(sub)
  }
  add('INAM', fields.title)
  add('IART', fields.artist)
  add('IPRD', fields.album)
  add('ICRD', fields.year)

  if (subchunks.length === 0) return new Uint8Array(0)

  const infoData = concatBytes(typeBytes('INFO'), ...subchunks)
  const listBodySize = infoData.length
  const padLen = listBodySize % 2
  const out = new Uint8Array(8 + listBodySize + padLen)
  out.set(typeBytes('LIST'), 0)
  new DataView(out.buffer).setUint32(4, listBodySize, true)
  out.set(infoData, 8)
  if (padLen) out[8 + listBodySize] = 0
  return out
}

function writeWavMetadata(buf: ArrayBuffer, fields: TagFields): Blob {
  const bytes = new Uint8Array(buf)
  if (bytes.length < 12 || readType(bytes, 0) !== 'RIFF' || readType(bytes, 8) !== 'WAVE') {
    throw new Error('不是有效的 WAV 文件')
  }

  const chunks: Uint8Array[] = []
  let off = 12
  while (off + 8 <= bytes.length) {
    const id = readType(bytes, off)
    const size = new DataView(bytes.buffer, off + 4, 4).getUint32(0, true)
    const dataStart = off + 8
    const dataEnd = dataStart + size
    if (dataEnd > bytes.length) break
    const padLen = size % 2
    const isInfoList = id === 'LIST' && size >= 4 && readType(bytes, dataStart) === 'INFO'
    if (!isInfoList) {
      chunks.push(bytes.subarray(off, dataEnd + padLen))
    }
    off = dataEnd + padLen
  }

  const infoChunk = buildInfoChunk(fields)
  const body = concatBytes(infoChunk, ...chunks)
  const riffSize = 4 + body.length // "WAVE" + chunks
  const out = new Uint8Array(8 + 4 + body.length)
  out.set(typeBytes('RIFF'), 0)
  new DataView(out.buffer).setUint32(4, riffSize, true)
  out.set(typeBytes('WAVE'), 8)
  out.set(body, 12)
  return new Blob([out], { type: 'audio/wav' })
}

// ---------- M4A / MP4 (iTunes metadata atoms) ----------
interface Mp4Box {
  type: string
  start: number
  headerSize: number
  size: number
  end: number
  contentStart: number
  contentEnd: number
  children: Mp4Box[]
}

const CONTAINER_TYPES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'ilst', 'meta', 'edts', 'dinf', 'mvex', 'moof', 'traf'])
const FULLBOX_TYPES = new Set(['meta', 'stco', 'co64', 'stsd', 'stts', 'stsc', 'stsz', 'stz2', 'ctts', 'hdlr', 'elst', 'mvhd', 'tkhd', 'mdhd', 'smhd', 'vmhd', 'dref', 'url ', 'esds', 'mp4a'])

function parseBoxes(bytes: Uint8Array, start: number, end: number): Mp4Box[] {
  const boxes: Mp4Box[] = []
  let off = start
  while (off + 8 <= end) {
    let size = u32be(bytes, off)
    const type = readType(bytes, off + 4)
    let headerSize = 8
    if (size === 1) {
      const hi = u32be(bytes, off + 8)
      const lo = u32be(bytes, off + 12)
      size = hi * 4294967296 + lo
      headerSize = 16
    } else if (size === 0) {
      size = end - off
    }
    if (size < headerSize || off + size > end) break
    const contentStart = off + headerSize + (FULLBOX_TYPES.has(type) ? 4 : 0)
    const box: Mp4Box = {
      type,
      start: off,
      headerSize,
      size,
      end: off + size,
      contentStart,
      contentEnd: off + size,
      children: [],
    }
    if (CONTAINER_TYPES.has(type) && contentStart < box.end) {
      box.children = parseBoxes(bytes, contentStart, box.end)
    }
    boxes.push(box)
    off += size
  }
  return boxes
}

function buildBox(type: string, body: Uint8Array): Uint8Array {
  const size = 8 + body.length
  const out = new Uint8Array(size)
  new DataView(out.buffer).setUint32(0, size)
  out.set(typeBytes(type), 4)
  out.set(body, 8)
  return out
}

function buildFullBox(type: string, versionFlags: number, body: Uint8Array): Uint8Array {
  const size = 12 + body.length
  const out = new Uint8Array(size)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, size)
  out.set(typeBytes(type), 4)
  dv.setUint32(8, versionFlags)
  out.set(body, 12)
  return out
}

function buildDataBox(typeIndicator: number, payload: Uint8Array): Uint8Array {
  const size = 12 + payload.length
  const out = new Uint8Array(size)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, size)
  out.set(typeBytes('data'), 4)
  dv.setUint32(8, typeIndicator)
  out.set(payload, 12)
  return out
}

function buildHdlr(): Uint8Array {
  const preDefined = new Uint8Array(4)
  const reserved = new Uint8Array(12)
  const name = new Uint8Array([0])
  return buildFullBox('hdlr', 0, concatBytes(preDefined, typeBytes('mdir'), reserved, name))
}

function buildIlst(fields: TagFields, cover: CoverData | null): Uint8Array {
  const items: Uint8Array[] = []
  if (fields.title) items.push(buildBox('©nam', buildDataBox(1, utf8(fields.title))))
  if (fields.artist) items.push(buildBox('©ART', buildDataBox(1, utf8(fields.artist))))
  if (fields.album) items.push(buildBox('©alb', buildDataBox(1, utf8(fields.album))))
  if (fields.year) items.push(buildBox('©day', buildDataBox(1, utf8(fields.year))))
  if (cover) {
    const indicator = cover.mime === 'image/png' ? 14 : 13
    items.push(buildBox('covr', buildDataBox(indicator, new Uint8Array(cover.data))))
  }
  return buildBox('ilst', concatBytes(...items))
}

function patchChunkOffsets(bytes: Uint8Array, delta: number): void {
  const topBoxes = parseBoxes(bytes, 0, bytes.length)
  const moov = topBoxes.find((b) => b.type === 'moov')
  if (!moov) return
  const dv = new DataView(bytes.buffer)

  const walk = (boxes: Mp4Box[]) => {
    for (const box of boxes) {
      if (box.type === 'stco' || box.type === 'co64') {
        const entryCount = dv.getUint32(box.contentStart)
        const entrySize = box.type === 'co64' ? 8 : 4
        for (let i = 0; i < entryCount; i++) {
          const entryOff = box.contentStart + 4 + i * entrySize
          if (box.type === 'co64') {
            const v = dv.getBigUint64(entryOff)
            dv.setBigUint64(entryOff, v + BigInt(delta))
          } else {
            const v = dv.getUint32(entryOff)
            dv.setUint32(entryOff, (v + delta) >>> 0)
          }
        }
      }
      walk(box.children)
    }
  }
  walk(moov.children)
}

function writeM4aMetadata(buf: ArrayBuffer, fields: TagFields, cover: CoverData | null): Blob {
  const bytes = new Uint8Array(buf)
  const topBoxes = parseBoxes(bytes, 0, bytes.length)
  const moov = topBoxes.find((b) => b.type === 'moov')
  if (!moov) throw new Error('不是有效的 M4A 文件（缺少 moov 盒子）')
  const mdat = topBoxes.find((b) => b.type === 'mdat')

  const udta = moov.children.find((b) => b.type === 'udta')
  const udtaChildren = udta ? udta.children : []
  const meta = udtaChildren.find((b) => b.type === 'meta')
  const metaChildren = meta ? meta.children : []
  const hdlr = metaChildren.find((b) => b.type === 'hdlr')

  const ilstBytes = buildIlst(fields, cover)
  const hdlrBytes = hdlr ? bytes.slice(hdlr.start, hdlr.end) : buildHdlr()
  const metaBytes = buildFullBox('meta', 0, concatBytes(hdlrBytes, ilstBytes))

  const otherUdta = udtaChildren.filter((b) => b.type !== 'meta').map((b) => bytes.slice(b.start, b.end))
  const udtaBytes = buildBox('udta', concatBytes(...otherUdta, metaBytes))

  const udtaStart = udta ? udta.start : moov.contentEnd
  const udtaEnd = udta ? udta.end : moov.contentEnd
  const delta = udtaBytes.length - (udtaEnd - udtaStart)

  const newBytes = new Uint8Array(bytes.length + delta)
  newBytes.set(bytes.subarray(0, udtaStart), 0)
  newBytes.set(udtaBytes, udtaStart)
  newBytes.set(bytes.subarray(udtaEnd), udtaStart + udtaBytes.length)

  const dv = new DataView(newBytes.buffer)
  const newMoovSize = moov.size + delta
  if (moov.headerSize === 16) {
    dv.setBigUint64(moov.start + 8, BigInt(newMoovSize))
  } else {
    dv.setUint32(moov.start, newMoovSize)
  }

  if (delta !== 0 && mdat && mdat.start > udtaStart) {
    patchChunkOffsets(newBytes, delta)
  }

  return new Blob([newBytes], { type: 'audio/mp4' })
}

export default function AudioMetadataPage() {
  const { t } = useI18n()
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [fileExt, setFileExt] = useState<AudioExt>('')
  const [reading, setReading] = useState(false)
  const [fields, setFields] = useState<TagFields>({ title: '', artist: '', album: '', year: '' })
  const [cover, setCover] = useState<CoverData | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cover) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(new Blob([cover.data], { type: cover.mime }))
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [cover])

  const resetAll = () => {
    setAudioFile(null)
    setFileExt('')
    setFields({ title: '', artist: '', album: '', year: '' })
    setCover(null)
    setError(null)
    setDone(false)
  }

  const handleFileSelect = async (file: File) => {
    const ext = getExt(file.name)
    if (!ext) {
      setError(t('lab.audioMetadata.invalidFormat'))
      return
    }
    setError(null)
    setDone(false)
    setAudioFile(file)
    setFileExt(ext)
    setFields({ title: '', artist: '', album: '', year: '' })
    setCover(null)

    setReading(true)
    try {
      const metadata = await parseBlob(file)
      const common = metadata.common
      setFields({
        title: common.title || '',
        artist: common.artist || '',
        album: common.album || '',
        year: common.year ? String(common.year) : '',
      })
      const pic = common.picture && common.picture[0]
      if (pic) {
        setCover({ data: toArrayBuffer(pic.data), mime: pic.format || 'image/jpeg' })
      }
    } catch {
      // 读取失败不阻断编辑，保留空表单让用户手动填写
    } finally {
      setReading(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    setCover({ data: buf, mime: file.type || 'image/jpeg' })
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleWrite = async () => {
    if (!audioFile) return
    setWriting(true)
    setError(null)
    setDone(false)
    try {
      const buf = await audioFile.arrayBuffer()
      let blob: Blob
      if (fileExt === 'mp3') {
        blob = writeMp3(buf, fields, cover)
      } else if (fileExt === 'wav') {
        blob = writeWavMetadata(buf, fields)
      } else {
        blob = writeM4aMetadata(buf, fields, cover)
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = audioFile.name
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err?.message || t('lab.audioMetadata.writeError'))
    } finally {
      setWriting(false)
    }
  }

  return (
    <LabLayout
      title={t('lab.tools.audioMetadata.title')}
      description={t('lab.tools.audioMetadata.desc')}
      showPrivacyNotice
    >
      <div className="space-y-6">
        {/* Upload Area */}
        {!audioFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleFileSelect(file)
            }}
            className="border-2 border-dashed border-theme-color rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-theme-secondary" />
            <p className="text-theme-on-surface font-medium mb-2">{t('lab.audioMetadata.dropFile')}</p>
            <p className="text-theme-secondary text-sm mb-4">{t('lab.audioMetadata.supportedFormats')}</p>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90">
              {t('lab.audioMetadata.selectFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info */}
            <div className="flex items-center gap-3 bg-theme-tertiary rounded-xl p-4">
              <Music className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-theme-on-surface text-sm font-medium truncate">{audioFile.name}</p>
                <p className="text-theme-tertiary text-xs">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB · {fileExt.toUpperCase()}
                </p>
              </div>
              <button
                onClick={resetAll}
                className="p-2 text-theme-tertiary hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reading && (
              <div className="flex items-center gap-2 text-theme-secondary text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                {t('lab.audioMetadata.reading')}
              </div>
            )}

            {/* WAV limitation notice */}
            {fileExt === 'wav' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-600 dark:text-yellow-400 text-sm">{t('lab.audioMetadata.wavNotice')}</p>
              </div>
            )}

            {/* Editable fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-1">{t('lab.audioMetadata.songTitle')}</label>
                <input
                  type="text"
                  value={fields.title}
                  onChange={(e) => setFields((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-1">{t('lab.audioMetadata.artist')}</label>
                <input
                  type="text"
                  value={fields.artist}
                  onChange={(e) => setFields((p) => ({ ...p, artist: e.target.value }))}
                  className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-1">{t('lab.audioMetadata.album')}</label>
                <input
                  type="text"
                  value={fields.album}
                  onChange={(e) => setFields((p) => ({ ...p, album: e.target.value }))}
                  className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-1">{t('lab.audioMetadata.year')}</label>
                <input
                  type="text"
                  value={fields.year}
                  onChange={(e) => setFields((p) => ({ ...p, year: e.target.value }))}
                  placeholder="2026"
                  className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface"
                />
              </div>
            </div>

            {/* Cover */}
            {fileExt !== 'wav' && (
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-2">{t('lab.audioMetadata.cover')}</label>
                <div className="flex items-center gap-4">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="cover"
                      className="w-24 h-24 object-cover rounded-lg border border-theme-color"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border border-dashed border-theme-color flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-theme-tertiary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary border border-theme-color text-theme-on-surface rounded-lg text-sm hover:border-primary/50 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {cover ? t('lab.audioMetadata.changeCover') : t('lab.audioMetadata.uploadCover')}
                    </button>
                    {cover && (
                      <button
                        onClick={() => setCover(null)}
                        className="flex items-center gap-2 px-4 py-2 text-theme-tertiary hover:text-red-400 text-sm"
                      >
                        <X className="w-4 h-4" />
                        {t('lab.audioMetadata.removeCover')}
                      </button>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={handleWrite}
              disabled={writing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {writing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('lab.audioMetadata.writing')}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t('lab.audioMetadata.writeAndDownload')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-green-500 text-sm">{t('lab.audioMetadata.success')}</p>
          </div>
        )}
      </div>
    </LabLayout>
  )
}
