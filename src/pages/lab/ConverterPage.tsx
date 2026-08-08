import { useState, useRef, useCallback, useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Upload, Download, FileImage, Music, Video, Scissors, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'

type ConvertTab = 'image' | 'audio' | 'video' | 'extract'

interface ConvertConfig {
  [key: string]: any
}

const STORAGE_KEY = 'lab_converter_config'
const SUPABASE_URL = 'https://noiebpjyskscjtmdytxj.supabase.co'
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/ffmpeg-core`

export default function ConverterPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<ConvertTab>('image')
  const [file, setFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<string>('')
  const [quality, setQuality] = useState(1)
  const [scaleWidth, setScaleWidth] = useState('')
  const [scaleHeight, setScaleHeight] = useState('')
  const [audioBitrate, setAudioBitrate] = useState('320k')
  const [audioSampleRate, setAudioSampleRate] = useState('48000')
  const [videoQuality, setVideoQuality] = useState('slow')
  const [videoBitrate, setVideoBitrate] = useState('10M')
  const [volumeGain, setVolumeGain] = useState(0)
  const [trimStart, setTrimStart] = useState('')
  const [trimEnd, setTrimEnd] = useState('')
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<Blob | null>(null)
  const [resultName, setResultName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 两个独立的 FFmpeg 实例：mt 用于音频/提取（多线程高速），st 用于视频转码（完整编码器）
  const ffmpegMtRef = useRef<any>(null)
  const ffmpegStRef = useRef<any>(null)
  const logBufferRef = useRef<string[]>([])
  const logFlushTimerRef = useRef<number | null>(null)

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        setOutputFormat(config.outputFormat || '')
        setQuality(config.quality || 1)
        setAudioBitrate(config.audioBitrate || '320k')
        setAudioSampleRate(config.audioSampleRate || '48000')
        setVideoQuality(config.videoQuality || 'slow')
        setVideoBitrate(config.videoBitrate || '10M')
        setVolumeGain(config.volumeGain || 0)
        setTrimStart(config.trimStart || '')
        setTrimEnd(config.trimEnd || '')
      } catch { /* ignore */ }
    }
  }, [])

  // Save config
  useEffect(() => {
    const config: ConvertConfig = {
      outputFormat, quality, audioBitrate, audioSampleRate, videoQuality, videoBitrate, volumeGain, trimStart, trimEnd,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [outputFormat, quality, audioBitrate, audioSampleRate, videoQuality, videoBitrate, volumeGain, trimStart, trimEnd])

  const flushLogs = useCallback(() => {
    logFlushTimerRef.current = null
    if (logBufferRef.current.length === 0) return
    const buffered = logBufferRef.current
    logBufferRef.current = []
    setLogs((prev) => {
      const combined = [...prev, ...buffered]
      return combined.length > 200 ? combined.slice(-200) : combined
    })
  }, [])

  const addLog = useCallback((msg: string) => {
    logBufferRef.current.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
    if (logFlushTimerRef.current === null) {
      logFlushTimerRef.current = window.setTimeout(flushLogs, 150)
    }
  }, [flushLogs])

  useEffect(() => {
    return () => {
      if (logFlushTimerRef.current !== null) {
        clearTimeout(logFlushTimerRef.current)
        logFlushTimerRef.current = null
      }
    }
  }, [])

  // 多线程 FFmpeg — 用于音频 / 提取音频（从 Supabase 加载，速度快）
  const initFfmpegMt = useCallback(async () => {
    if (ffmpegMtRef.current) return ffmpegMtRef.current
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()
      ffmpeg.on('log', ({ message }: { message: string }) => { addLog(message) })
      ffmpeg.on('progress', ({ progress: p }: { progress: number }) => {
        setProgress(Math.max(0, Math.min(100, Math.round(p * 100))))
      })
      const hasSAB = typeof SharedArrayBuffer !== 'undefined'
      const isCOI = typeof (window as any).crossOriginIsolated !== 'undefined' && (window as any).crossOriginIsolated
      const useMt = hasSAB && isCOI
      addLog(`FFmpeg (音频) 初始化中... ${useMt ? '(多线程模式)' : '(单线程模式)'}`)
      let coreURL: string, wasmURL: string, workerURL: string | undefined
      if (useMt) {
        coreURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core-mt-esm.js`, 'text/javascript')
        wasmURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core-mt.wasm`, 'application/wasm')
        workerURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core-mt.worker.js`, 'text/javascript')
      } else {
        coreURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core-esm.js`, 'text/javascript')
        wasmURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core.wasm`, 'application/wasm')
      }
      const loadConfig: { coreURL: string; wasmURL: string; workerURL?: string } = { coreURL, wasmURL }
      if (workerURL) loadConfig.workerURL = workerURL
      await Promise.race([
        ffmpeg.load(loadConfig),
        new Promise((_, reject) => setTimeout(() => reject(new Error('FFmpeg 核心库加载超时 (60s)')), 60000)),
      ])
      ffmpegMtRef.current = ffmpeg
      addLog('FFmpeg (音频) 核心库加载完成')
      return ffmpeg
    } catch (err: any) {
      console.error('FFmpeg MT init error:', err)
      setError(err.message || 'FFmpeg 加载失败')
      return null
    }
  }, [addLog])

  // 单线程 FFmpeg（完整编码器：libx264 / libvpx-vp9）— 用于视频转码
  const initFfmpegSt = useCallback(async () => {
    if (ffmpegStRef.current) return ffmpegStRef.current
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()
      ffmpeg.on('log', ({ message }: { message: string }) => { addLog(message) })
      ffmpeg.on('progress', ({ progress: p }: { progress: number }) => {
        setProgress(Math.max(0, Math.min(100, Math.round(p * 100))))
      })
      addLog('FFmpeg (视频) 初始化中... (单线程)')
      const coreURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core-esm.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${STORAGE_BASE}/ffmpeg-core.wasm`, 'application/wasm')
      await Promise.race([
        ffmpeg.load({ coreURL, wasmURL }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('FFmpeg 核心库加载超时 (60s)')), 60000)),
      ])
      ffmpegStRef.current = ffmpeg
      addLog('FFmpeg (视频) 单线程初始化完成')
      return ffmpeg
    } catch (err: any) {
      console.error('FFmpeg ST init error:', err)
      setError(err.message || 'FFmpeg 加载失败')
      return null
    }
  }, [addLog])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setError(''); setResult(null); setProgress(0); setLogs([]); logBufferRef.current = []
      if (selected.size > 500 * 1024 * 1024) { setError(t('lab.converter.fileTooLarge')); return }
      setFile(selected)
      const ext = selected.name.split('.').pop()?.toLowerCase()
      setOutputFormat(getDefaultOutputFormat(activeTab, ext))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setError(''); setResult(null); setProgress(0); setLogs([]); logBufferRef.current = []
      if (dropped.size > 500 * 1024 * 1024) { setError(t('lab.converter.fileTooLarge')); return }
      setFile(dropped)
      const ext = dropped.name.split('.').pop()?.toLowerCase()
      setOutputFormat(getDefaultOutputFormat(activeTab, ext))
    }
  }

  const getDefaultOutputFormat = (tab: ConvertTab, _inputExt?: string): string => {
    switch (tab) {
      case 'image': return 'png'
      case 'audio': return 'mp3'
      case 'video': return 'webm'
      case 'extract': return 'mp3'
      default: return ''
    }
  }

  const convertImage = async () => {
    if (!file || !outputFormat) return
    setConverting(true); setProgress(0); setError('')
    addLog(t('lab.converter.startingConversion'))
    try {
      const img = new Image()
      const url = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = url
      })
      const canvas = document.createElement('canvas')
      let targetWidth = img.width, targetHeight = img.height
      if (scaleWidth && scaleHeight) { targetWidth = parseInt(scaleWidth); targetHeight = parseInt(scaleHeight) }
      else if (scaleWidth) { targetWidth = parseInt(scaleWidth); targetHeight = Math.round(img.height * (targetWidth / img.width)) }
      else if (scaleHeight) { targetHeight = parseInt(scaleHeight); targetWidth = Math.round(img.width * (targetHeight / img.height)) }
      canvas.width = targetWidth; canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      URL.revokeObjectURL(url)
      addLog(t('lab.converter.processing'))
      const blob = await new Promise<Blob>((resolve) => { canvas.toBlob((b) => resolve(b!), `image/${outputFormat}`, quality) })
      setResult(blob); setResultName(`converted.${outputFormat}`); setProgress(100)
      addLog(t('lab.converter.conversionComplete'))
    } catch (err: any) {
      setError(err.message || t('lab.converter.conversionFailed'))
      addLog(t('lab.converter.conversionFailed'))
    } finally { setConverting(false) }
  }

  const uint8ArrayToBlob = (data: Uint8Array, mimeType: string): Blob => {
    return new Blob([data.buffer as ArrayBuffer], { type: mimeType })
  }

  const convertWithFfmpeg = async (tab: 'audio' | 'video' | 'extract') => {
    if (!file || !outputFormat) return
    setConverting(true); setProgress(0); setError('')

    const isVideo = tab === 'video'
    addLog(isVideo ? 'FFmpeg (视频) 初始化中...' : t('lab.converter.loadingFfmpeg'))

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    if (isVideo) {
      if (file.size > 100 * 1024 * 1024) addLog(`警告: 视频文件较大 (${sizeMB}MB)，浏览器端转码可能耗时较长`)
      else if (file.size > 30 * 1024 * 1024) addLog(`提示: 视频 ${sizeMB}MB，建议使用较短视频进行转码`)
      else addLog(`视频大小: ${sizeMB}MB`)
    } else if (tab === 'extract') {
      if (file.size > 50 * 1024 * 1024) addLog(`警告: 文件较大 (${sizeMB}MB)，浏览器端处理可能需要5-15分钟`)
      else addLog(`文件大小: ${sizeMB}MB`)
    }

    try {
      // 音频/提取 → 多线程 mt；视频转码 → 单线程 st（完整编码器）
      const ffmpeg = isVideo ? await initFfmpegSt() : await initFfmpegMt()
      if (!ffmpeg) throw new Error('FFmpeg 加载失败')

      addLog(t('lab.converter.startingConversion'))
      const inputName = file.name
      const outputName = `output.${outputFormat}`
      const fileBuffer = await file.arrayBuffer()
      setProgress(3)
      await ffmpeg.writeFile(inputName, new Uint8Array(fileBuffer))
      addLog(t('lab.converter.inputLoaded'))
      setProgress(8)

      const args = ['-i', inputName]

      if (tab === 'audio') {
        // 裁剪：起始时间（需在 -i 之前）
        if (trimStart) {
          args.push('-ss', trimStart)
        }
        if (outputFormat === 'mp3') args.push('-c:a', 'libmp3lame')
        else if (outputFormat === 'wav') args.push('-c:a', 'pcm_s16le')
        else if (outputFormat === 'm4a') args.push('-c:a', 'aac', '-f', 'ipod')
        else if (outputFormat === 'ogg') args.push('-c:a', 'libvorbis', '-f', 'ogg')
        // 音量增益
        if (volumeGain !== 0) {
          args.push('-af', `volume=${volumeGain}dB`)
        }
        // 裁剪：结束时间
        if (trimEnd) {
          args.push('-to', trimEnd)
        }
        args.push('-b:a', audioBitrate, '-ar', audioSampleRate)
      } else if (tab === 'extract') {
        args.push('-vn')
        if (outputFormat === 'mp3') args.push('-c:a', 'libmp3lame')
        else if (outputFormat === 'wav') args.push('-c:a', 'pcm_s16le')
        else if (outputFormat === 'm4a') args.push('-c:a', 'aac', '-f', 'ipod')
        else if (outputFormat === 'ogg') args.push('-c:a', 'libvorbis', '-f', 'ogg')
        args.push('-b:a', audioBitrate)
      } else if (tab === 'video') {
        // 根据输出格式选择编码器参数
        if (outputFormat === 'webm') {
          args.push('-c:v', 'libvpx')
          if (videoQuality === 'fast') {
            args.push('-b:v', '2M', '-deadline', 'realtime', '-cpu-used', '8')
          } else if (videoQuality === 'medium') {
            args.push('-b:v', '5M', '-deadline', 'realtime', '-cpu-used', '5')
          } else {
            args.push('-b:v', videoBitrate, '-deadline', 'realtime', '-cpu-used', '2')
          }
          args.push('-c:a', 'libvorbis', '-b:a', '128k')
        } else if (outputFormat === 'mp4') {
          args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p')
          if (videoQuality === 'fast') {
            args.push('-preset', 'ultrafast', '-crf', '30')
          } else if (videoQuality === 'medium') {
            args.push('-preset', 'veryfast', '-crf', '26')
          } else {
            args.push('-preset', 'fast', '-crf', '23')
          }
          // 防止 sar 兼容性问题
          args.push('-vf', 'setsar=1')
          args.push('-c:a', 'aac', '-b:a', '128k')
        } else if (outputFormat === 'mov') {
          addLog('注意: MOV 格式在浏览器 WASM 环境中兼容性有限，建议优先使用 MP4')
          args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p')
          if (videoQuality === 'fast') {
            args.push('-preset', 'ultrafast', '-crf', '30')
          } else if (videoQuality === 'medium') {
            args.push('-preset', 'veryfast', '-crf', '26')
          } else {
            args.push('-preset', 'fast', '-crf', '23')
          }
          args.push('-vf', 'setsar=1')
          args.push('-c:a', 'aac', '-b:a', '128k', '-f', 'mov')
        }
        addLog(`视频编码参数: ${outputFormat} / ${videoQuality}`)
      }

      args.push('-y', outputName)
      addLog(t('lab.converter.processing'))
      setProgress(10)

      // 视频转码超时更长（300s）
      const timeout = isVideo ? 300000 : 120000
      await Promise.race([
        ffmpeg.exec(args),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`转换超时 (${timeout / 1000}s)`)), timeout)),
      ])
      setProgress(85)
      addLog(t('lab.converter.readingOutput'))
      const outputData = await ffmpeg.readFile(outputName)
      setProgress(92)
      const getMimeType = () => {
        if (tab === 'audio' || tab === 'extract') {
          if (outputFormat === 'mp3') return 'audio/mpeg'
          if (outputFormat === 'm4a') return 'audio/mp4'
          if (outputFormat === 'ogg') return 'audio/ogg'
          if (outputFormat === 'wav') return 'audio/wav'
        }
        if (tab === 'video') {
          if (outputFormat === 'mp4' || outputFormat === 'mov') return 'video/mp4'
          if (outputFormat === 'webm') return 'video/webm'
        }
        return 'application/octet-stream'
      }
      const blob = uint8ArrayToBlob(outputData as Uint8Array, getMimeType())
      setProgress(95)
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
      setResult(blob); setResultName(`converted.${outputFormat}`); setProgress(100)
      addLog(t('lab.converter.conversionComplete'))
    } catch (err: any) {
      setError(err.message || t('lab.converter.conversionFailed'))
      addLog(t('lab.converter.conversionFailed'))
    } finally { setConverting(false) }
  }

  const handleConvert = async () => {
    switch (activeTab) {
      case 'image': await convertImage(); break
      case 'audio': case 'video': case 'extract': await convertWithFfmpeg(activeTab); break
    }
  }

  const handleDownloadResult = () => {
    if (!result) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url; a.download = resultName
    a.click(); URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'image' as ConvertTab, icon: FileImage, label: t('lab.converter.imageTab') },
    { id: 'audio' as ConvertTab, icon: Music, label: t('lab.converter.audioTab') },
    { id: 'video' as ConvertTab, icon: Video, label: t('lab.converter.videoTab') },
    { id: 'extract' as ConvertTab, icon: Scissors, label: t('lab.converter.extractTab') },
  ]

  const formatOptions: Record<ConvertTab, { value: string; label: string }[]> = {
    image: [
      { value: 'png', label: 'PNG' },
      { value: 'jpg', label: 'JPG' },
      { value: 'webp', label: 'WebP' },
    ],
    audio: [
      { value: 'mp3', label: 'MP3' },
      { value: 'm4a', label: 'M4A' },
      { value: 'ogg', label: 'OGG' },
      { value: 'wav', label: 'WAV' },
    ],
    video: [
      { value: 'webm', label: 'WebM (VP8)' },
      { value: 'mp4', label: 'MP4 (H.264)' },
      { value: 'mov', label: 'MOV (QuickTime)' },
    ],
    extract: [
      { value: 'mp3', label: 'MP3' },
      { value: 'm4a', label: 'M4A' },
      { value: 'ogg', label: 'OGG' },
      { value: 'wav', label: 'WAV' },
    ],
  }

  return (
    <LabLayout
      title={t('lab.tools.converter.title')}
      description={t('lab.tools.converter.desc')}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-theme-color pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (converting) return
                setActiveTab(tab.id)
                setFile(null)
                setResult(null)
                setOutputFormat(getDefaultOutputFormat(tab.id))
              }}
              disabled={converting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-theme-secondary hover:bg-theme-hover'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 短视频提示（视频 Tab） */}
        {activeTab === 'video' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm">{t('lab.converter.shortVideoTip')}</p>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-theme-color rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={activeTab === 'image' ? 'image/*' : activeTab === 'audio' ? 'audio/*' : 'video/*,.mkv,.mov,.webm'}
          />
          {!file ? (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-theme-tertiary" />
              <p className="text-theme-secondary">{t('lab.converter.dropFile')}</p>
              <p className="text-xs text-theme-tertiary">{t('lab.converter.maxFileSize')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                {activeTab === 'image' ? <FileImage className="w-6 h-6 text-blue-400" /> : activeTab === 'audio' ? <Music className="w-6 h-6 text-purple-400" /> : activeTab === 'video' ? <Video className="w-6 h-6 text-orange-400" /> : <Scissors className="w-6 h-6 text-green-400" />}
                <div className="text-left">
                  <p className="text-theme-primary text-sm font-medium truncate max-w-[300px]">{file.name}</p>
                  <p className="text-theme-tertiary text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                  className="text-theme-tertiary hover:text-red-400 transition-colors"
                >x</button>
              </div>
              {!result && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleConvert() }}
                  disabled={converting}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {converting ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('lab.converter.converting')}</span>
                  ) : t('lab.converter.convert')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Output Format + Options */}
        {file && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-theme-secondary mb-2 block">{t('lab.converter.outputFormat')}</label>
              {activeTab === 'image' ? (
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary">
                  {formatOptions.image.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {formatOptions[activeTab].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => !converting && setOutputFormat(opt.value)}
                      disabled={converting}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${outputFormat === opt.value ? 'bg-primary text-white' : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>

            {activeTab === 'image' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-theme-secondary mb-2 block">{t('lab.converter.quality')}</label>
                  <input type="range" min="0.1" max="1" step="0.1" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-theme-tertiary mt-1"><span>{Math.round(quality * 100)}%</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.width')}</label>
                    <input type="number" value={scaleWidth} onChange={(e) => setScaleWidth(e.target.value)} placeholder="auto" className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.height')}</label>
                    <input type="number" value={scaleHeight} onChange={(e) => setScaleHeight(e.target.value)} placeholder="auto" className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary" />
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'audio' || activeTab === 'extract') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.bitrate')}</label>
                    <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary">
                      <option value="128k">128 kbps</option>
                      <option value="192k">192 kbps</option>
                      <option value="256k">256 kbps</option>
                      <option value="320k">320 kbps</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.sampleRate')}</label>
                    <select value={audioSampleRate} onChange={(e) => setAudioSampleRate(e.target.value)} className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary">
                      <option value="44100">44100 Hz</option>
                      <option value="48000">48000 Hz</option>
                    </select>
                  </div>
                </div>

                {/* 音频专属：音量增益 + 裁剪 */}
                {activeTab === 'audio' && (
                  <div className="space-y-3">
                    {/* 音量增益 */}
                    <div>
                      <label className="text-sm font-medium text-theme-secondary mb-1 block">
                        {t('lab.converter.volumeGain')} ({volumeGain > 0 ? '+' : ''}{volumeGain} dB)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min="-20" max="20" step="1" value={volumeGain}
                          onChange={(e) => setVolumeGain(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <button
                          onClick={() => setVolumeGain(0)}
                          className="text-xs text-theme-tertiary hover:text-theme-primary px-2 py-1 rounded border border-theme-color"
                        >{t('lab.converter.reset')}</button>
                      </div>
                    </div>

                    {/* 音频裁剪 */}
                    <div>
                      <label className="text-sm font-medium text-theme-secondary mb-2 block">{t('lab.converter.trimAudio')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-theme-tertiary mb-1 block">{t('lab.converter.trimStart')}</label>
                          <input
                            type="text"
                            value={trimStart}
                            onChange={(e) => setTrimStart(e.target.value)}
                            placeholder="0:00"
                            className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-theme-tertiary mb-1 block">{t('lab.converter.trimEnd')}</label>
                          <input
                            type="text"
                            value={trimEnd}
                            onChange={(e) => setTrimEnd(e.target.value)}
                            placeholder="3:00"
                            className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-theme-tertiary mt-1">{t('lab.converter.trimHint')}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'video' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.videoQuality')}</label>
                  <select value={videoQuality} onChange={(e) => setVideoQuality(e.target.value)} className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary">
                    <option value="fast">{t('lab.converter.fast')}</option>
                    <option value="medium">{t('lab.converter.medium')}</option>
                    <option value="slow">{t('lab.converter.slow')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-theme-secondary mb-1 block">{t('lab.converter.videoBitrate')}</label>
                  <select value={videoBitrate} onChange={(e) => setVideoBitrate(e.target.value)} className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary" disabled={videoQuality !== 'slow'}>
                    <option value="2M">2 Mbps</option>
                    <option value="5M">5 Mbps</option>
                    <option value="10M">10 Mbps</option>
                    <option value="20M">20 Mbps</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {converting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-theme-secondary">{t('lab.converter.converting')}</span>
              <span className="text-theme-tertiary">{progress}%</span>
            </div>
            <div className="w-full bg-theme-tertiary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            {logs.length > 0 && (
              <div className="bg-black/50 rounded-lg p-3 max-h-32 overflow-y-auto text-xs font-mono select-all">
                {logs.map((log, i) => (<div key={i} className="text-green-400 select-text">{log}</div>))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-green-400 text-sm truncate">{resultName}</span>
              <span className="text-theme-tertiary text-xs">({(result.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <button onClick={handleDownloadResult} className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm">
              <Download className="w-4 h-4" />{t('lab.converter.downloadResult')}
            </button>
          </div>
        )}
      </div>
    </LabLayout>
  )
}
