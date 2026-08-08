import { useState, useRef, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Upload, Download, Image as ImageIcon, Check, X as XIcon } from 'lucide-react'

const ICO_SIZES = [16, 24, 32, 48, 64, 96, 128, 256]

async function createIcoBlob(pngBlobs: Blob[], sizes: number[]): Promise<Blob> {
  const headerSize = 6
  const dirEntrySize = 16
  const count = pngBlobs.length
  const headerBuf = new ArrayBuffer(headerSize + dirEntrySize * count)
  const dv = new DataView(headerBuf)

  // ICO header
  dv.setUint16(0, 0, true)
  dv.setUint16(2, 1, true)
  dv.setUint16(4, count, true)

  // Await all PNG ArrayBuffers first
  const pngData: ArrayBuffer[] = await Promise.all(
    pngBlobs.map((b) => b.arrayBuffer())
  )

  // Build directory entries
  let offset = headerSize + dirEntrySize * count
  for (let i = 0; i < count; i++) {
    const size = sizes[i]
    const dataLen = pngData[i].byteLength
    const entryOffset = headerSize + i * dirEntrySize

    dv.setUint8(entryOffset, size >= 256 ? 0 : size)
    dv.setUint8(entryOffset + 1, size >= 256 ? 0 : size)
    dv.setUint8(entryOffset + 2, 0)
    dv.setUint8(entryOffset + 3, 0)
    dv.setUint16(entryOffset + 4, 1, true)
    dv.setUint16(entryOffset + 6, 32, true)
    dv.setUint32(entryOffset + 8, dataLen, true)
    dv.setUint32(entryOffset + 12, offset, true)
    offset += dataLen
  }

  // Concatenate header + all PNG data
  const parts: BlobPart[] = [headerBuf, ...pngData]
  return new Blob(parts, { type: 'image/x-icon' })
}

async function imageToPngBlob(img: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, size, size)
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png')
  })
}

export default function IcoConverterPage() {
  const { t } = useI18n()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 48, 256])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [icoBlob, setIcoBlob] = useState<Blob | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size].sort((a, b) => a - b)
    )
    setIcoBlob(null)
  }

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    setIcoBlob(null)

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|bmp|gif)$/i)) {
      setError(t('lab.icoConverter.invalidFormat'))
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError(t('lab.icoConverter.fileTooLarge'))
      return
    }

    setSourceFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleConvert = async () => {
    if (!sourceImage || selectedSizes.length === 0) return
    setProcessing(true)
    setError(null)
    setIcoBlob(null)

    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = sourceImage
      })
      imgRef.current = img

      const pngBlobs = await Promise.all(
        selectedSizes.map((size) => imageToPngBlob(img, size))
      )

      const blob = await createIcoBlob(pngBlobs, selectedSizes)
      setIcoBlob(blob)
    } catch {
      setError(t('lab.icoConverter.convertError'))
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!icoBlob) return
    const url = URL.createObjectURL(icoBlob)
    const a = document.createElement('a')
    const baseName = sourceFile?.name.replace(/\.[^.]+$/, '') || 'icon'
    a.href = url
    a.download = `${baseName}.ico`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setSourceImage(null)
    setSourceFile(null)
    setSelectedSizes([16, 32, 48, 256])
    setError(null)
    setIcoBlob(null)
    imgRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <LabLayout
      title={t('lab.icoConverter.title')}
      description={t('lab.icoConverter.desc')}
      showPrivacyNotice
    >
      <div className="space-y-6">
        {/* Upload Area */}
        {!sourceImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-theme-color rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-theme-secondary" />
            <p className="text-theme-primary font-medium mb-2">{t('lab.icoConverter.dropFile')}</p>
            <p className="text-theme-secondary text-sm mb-4">{t('lab.icoConverter.supportedFormats')}</p>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90">
              {t('lab.icoConverter.selectFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,.png,.jpg,.jpeg,.webp,.bmp,.gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview & Controls */}
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Preview */}
              <div className="flex-shrink-0">
                <div className="bg-theme-tertiary rounded-xl p-4 text-center">
                  <p className="text-xs text-theme-secondary mb-2">{t('lab.icoConverter.preview')}</p>
                  <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center p-2 shadow-inner">
                    <img src={sourceImage} alt="preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <p className="text-xs text-theme-secondary mt-2 truncate max-w-[160px]">
                    {sourceFile?.name}
                  </p>
                </div>
              </div>

              {/* Size Selection */}
              <div className="flex-1">
                <p className="text-sm font-medium text-theme-primary mb-3">{t('lab.icoConverter.selectSizes')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {ICO_SIZES.map((size) => {
                    const selected = selectedSizes.includes(size)
                    return (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                          selected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-theme-tertiary text-theme-secondary border-theme-color hover:border-primary/50'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        {size}×{size}
                      </button>
                    )
                  })}
                </div>

                <p className="text-xs text-theme-secondary">
                  {t('lab.icoConverter.sizeHint', { count: selectedSizes.length })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleConvert}
                disabled={selectedSizes.length === 0 || processing}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <ImageIcon className="w-4 h-4" />
                {processing ? t('lab.icoConverter.processing') : t('lab.icoConverter.convert')}
              </button>

              {icoBlob && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('lab.icoConverter.download')} ({icoBlob.size < 1024
                    ? `${icoBlob.size}B`
                    : `${(icoBlob.size / 1024).toFixed(1)}KB`})
                </button>
              )}

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-theme-tertiary text-theme-primary rounded-lg hover:opacity-90 border border-theme-color"
              >
                <XIcon className="w-4 h-4" />
                {t('lab.icoConverter.reset')}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Result Info */}
        {icoBlob && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-green-500 text-sm font-medium mb-1">{t('lab.icoConverter.convertSuccess')}</p>
            <p className="text-green-400/70 text-xs">
              {t('lab.icoConverter.resultInfo', { sizes: selectedSizes.join('×, ') + '×' })}
            </p>
          </div>
        )}
      </div>
    </LabLayout>
  )
}