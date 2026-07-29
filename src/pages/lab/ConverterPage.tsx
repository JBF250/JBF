import { useState, useRef, useCallback, useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Upload, Download, FileImage, Music, Video, Scissors, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

type ConvertTab = 'image' | 'audio' | 'video' | 'extract'

interface ConvertConfig {
  [key: string]: any
}

const STORAGE_KEY = 'lab_converter_config'

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
  const [videoQuality, setVideoQuality] = useState('medium')
  const [videoBitrate, setVideoBitrate] = useState('10M')
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<Blob | null>(null)
  const [resultName, setResultName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ffmpegRef = useRef<any>(null)
  // 日志节流缓冲：FFmpeg 视频编码每帧都会输出日志，直接 setLogs 会导致数百次 re-render 拖慢主线程
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
        setVideoQuality(config.videoQuality || 'medium')
        setVideoBitrate(config.videoBitrate || '10M')
      } catch {
        // ignore
      }
    }
  }, [])

  // Save config
  useEffect(() => {
    const config: ConvertConfig = {
      outputFormat,
      quality,
      audioBitrate,
      audioSampleRate,
      videoQuality,
      videoBitrate,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [outputFormat, quality, audioBitrate, audioSampleRate, videoQuality, videoBitrate])

  // 节流刷新日志：批量合并 + 限制最大条数，避免视频编码时每帧日志触发 re-render 拖慢主线程
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

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (logFlushTimerRef.current !== null) {
        clearTimeout(logFlushTimerRef.current)
        logFlushTimerRef.current = null
      }
    }
  }, [])

  // Initialize ffmpeg with local files + toBlobURL to bypass Vite module resolution
  const initFfmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      
      const ffmpeg = new FFmpeg()
      
      ffmpeg.on('log', ({ message }: { message: string }) => {
        addLog(message)
      })

      ffmpeg.on('progress', ({ progress: p }: { progress: number }) => {
        // 夹紧进度值到 0-100%，防止 FFmpeg 初始化阶段上报异常值导致进度条溢出
        const clamped = Math.max(0, Math.min(100, Math.round(p * 100)))
        setProgress(clamped)
      })

      // 从 Supabase Storage 加载 ffmpeg-core，国内访问稳定
      // 使用 ESM 版本，因为 @ffmpeg/ffmpeg v0.12.x 创建的是 module worker，
      // module worker 中 importScripts 不可用，会 fallback 到 import()，
      // 而 UMD 版本没有 ES module 的 default 导出，导致加载失败
      const supabaseUrl = 'https://noiebpjyskscjtmdytxj.supabase.co'
      const baseURL = `${supabaseUrl}/storage/v1/object/public/ffmpeg-core`
      
      const hasSharedArrayBuffer = typeof (window as any).crossOriginIsolated !== 'undefined' && (window as any).crossOriginIsolated
      addLog(`FFmpeg 初始化中... ${hasSharedArrayBuffer ? '(多线程模式)' : '(单线程模式)'}`)

      // Use toBlobURL to fetch files and create blob URLs, bypassing Vite module resolution
      addLog(t('lab.converter.loadingFfmpeg'))
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core-esm.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')

      const loadPromise = ffmpeg.load({ coreURL, wasmURL })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FFmpeg 核心库加载超时 (60s)')), 60000)
      )

      await Promise.race([loadPromise, timeoutPromise])

      ffmpegRef.current = ffmpeg
      addLog('FFmpeg 核心库加载完成')
      return ffmpeg
    } catch (err: any) {
      console.error('FFmpeg init error:', err)
      setError(err.message || t('lab.converter.ffmpegLoadError'))
      return null
    }
  }, [t, addLog])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setError('')
      setResult(null)
      setProgress(0)
      setLogs([])
      logBufferRef.current = []
      
      if (selected.size > 500 * 1024 * 1024) {
        setError(t('lab.converter.fileTooLarge'))
        return
      }
      
      setFile(selected)
      
      // Auto-set output format suggestion
      const ext = selected.name.split('.').pop()?.toLowerCase()
      setOutputFormat(getDefaultOutputFormat(activeTab, ext))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setError('')
      setResult(null)
      setProgress(0)
      setLogs([])
      logBufferRef.current = []
      
      if (dropped.size > 500 * 1024 * 1024) {
        setError(t('lab.converter.fileTooLarge'))
        return
      }
      
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
    
    setConverting(true)
    setProgress(0)
    setError('')
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
      
      // Apply scaling if specified
      let targetWidth = img.width
      let targetHeight = img.height
      
      if (scaleWidth && scaleHeight) {
        targetWidth = parseInt(scaleWidth)
        targetHeight = parseInt(scaleHeight)
      } else if (scaleWidth) {
        targetWidth = parseInt(scaleWidth)
        targetHeight = Math.round(img.height * (targetWidth / img.width))
      } else if (scaleHeight) {
        targetHeight = parseInt(scaleHeight)
        targetWidth = Math.round(img.width * (targetHeight / img.height))
      }
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      URL.revokeObjectURL(url)

      addLog(t('lab.converter.processing'))
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b!),
          `image/${outputFormat}`,
          quality
        )
      })

      setResult(blob)
      setResultName(`converted.${outputFormat}`)
      setProgress(100)
      addLog(t('lab.converter.conversionComplete'))
    } catch (err: any) {
      setError(err.message || t('lab.converter.conversionFailed'))
      addLog(t('lab.converter.conversionFailed'))
    } finally {
      setConverting(false)
    }
  }

  const uint8ArrayToBlob = (data: Uint8Array, mimeType: string): Blob => {
    return new Blob([data.buffer as ArrayBuffer], { type: mimeType })
  }

  const convertWithFfmpeg = async (tab: 'audio' | 'video' | 'extract') => {
    if (!file || !outputFormat) return
    
    setConverting(true)
    setProgress(0)
    setError('')
    addLog(t('lab.converter.loadingFfmpeg'))
    
    // 视频文件大小警告：浏览器WASM转码性能有限，大文件需要很长时间
    if (tab === 'video' || tab === 'extract') {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      if (file.size > 50 * 1024 * 1024) {
        addLog(`⚠️ 警告: 文件较大 (${sizeMB}MB)，浏览器端转码可能需要5-15分钟，请耐心等待`)
      } else if (file.size > 20 * 1024 * 1024) {
        addLog(`💡 提示: 文件 ${sizeMB}MB，浏览器端转码预计需要2-8分钟`)
      } else {
        addLog(`文件大小: ${sizeMB}MB`)
      }
    }
    
    try {
      const ffmpeg = await initFfmpeg()
      if (!ffmpeg) throw new Error(t('lab.converter.ffmpegLoadError'))
      
      addLog(t('lab.converter.startingConversion'))
      
      const inputName = file.name
      const outputName = `output.${outputFormat}`
      
      // Read file as ArrayBuffer and write to ffmpeg
      const fileBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(fileBuffer)
      await ffmpeg.writeFile(inputName, fileData)
      addLog(t('lab.converter.inputLoaded'))

      // Build ffmpeg arguments
      const args = ['-i', inputName]
      
      if (tab === 'audio') {
        if (outputFormat === 'mp3') {
          args.push('-c:a', 'libmp3lame')
        } else if (outputFormat === 'wav') {
          args.push('-c:a', 'pcm_s16le')
        } else if (outputFormat === 'm4a') {
          args.push('-c:a', 'aac', '-f', 'ipod')
        } else if (outputFormat === 'ogg') {
          args.push('-c:a', 'libvorbis', '-f', 'ogg')
        }
        args.push('-b:a', audioBitrate)
        args.push('-ar', audioSampleRate)
      } else if (tab === 'video') {
        if (outputFormat === 'webm') {
          // WebM (VP8) 编码：根据用户选择的质量调整编码速度/质量平衡
          // -cpu-used: 0=最佳质量(最慢), 8=平衡, 16=最快(质量最低)
          // -deadline: realtime/good/best
          const webmQualityMap: Record<string, { cpuUsed: string; deadline: string; label: string }> = {
            fast:   { cpuUsed: '16', deadline: 'realtime', label: t('lab.converter.fast') },
            medium: { cpuUsed: '8',  deadline: 'good',     label: t('lab.converter.medium') },
            slow:   { cpuUsed: '0',  deadline: 'best',     label: t('lab.converter.slow') },
          }
          const q = webmQualityMap[videoQuality] || webmQualityMap.medium
          args.push('-c:v', 'libvpx')
          args.push('-cpu-used', q.cpuUsed)
          args.push('-deadline', q.deadline)
          args.push('-b:v', videoBitrate)
          args.push('-c:a', 'libvorbis')
          args.push('-f', 'webm')
          addLog(`WebM 编码: libvpx(VP8) ${q.label}模式, 码率 ${videoBitrate}`)
        } else {
          // MP4 / MKV / MOV: 使用 libx264 编码器
          // preset 映射：fast→veryfast(快/低质), medium→medium(平衡), slow→veryslow(慢/高质)
          const x264PresetMap: Record<string, string> = {
            fast: 'veryfast',
            medium: 'medium',
            slow: 'veryslow',
          }
          const preset = x264PresetMap[videoQuality] || 'medium'
          args.push('-c:v', 'libx264')
          args.push('-preset', preset)
          args.push('-b:v', videoBitrate)
          args.push('-c:a', 'aac')
          if (outputFormat === 'mkv') {
            args.push('-f', 'matroska')
          } else if (outputFormat === 'mov') {
            args.push('-f', 'mov')
          }
        }
      } else if (tab === 'extract') {
        args.push('-vn')
        if (outputFormat === 'mp3') {
          args.push('-c:a', 'libmp3lame')
        } else if (outputFormat === 'wav') {
          args.push('-c:a', 'pcm_s16le')
        } else if (outputFormat === 'm4a') {
          args.push('-c:a', 'aac', '-f', 'ipod')
        } else if (outputFormat === 'ogg') {
          args.push('-c:a', 'libvorbis', '-f', 'ogg')
        }
        args.push('-b:a', audioBitrate)
      }
      
      args.push('-y', outputName)
      
      addLog(t('lab.converter.processing'))
      await ffmpeg.exec(args)
      
      addLog(t('lab.converter.readingOutput'))
      const outputData = await ffmpeg.readFile(outputName)
      const getMimeType = () => {
        if (tab === 'video') {
          if (outputFormat === 'webm') return 'video/webm'
          if (outputFormat === 'mkv') return 'video/x-matroska'
          if (outputFormat === 'mov') return 'video/quicktime'
          return 'video/mp4'
        }
        if (tab === 'audio' || tab === 'extract') {
          if (outputFormat === 'mp3') return 'audio/mpeg'
          if (outputFormat === 'm4a') return 'audio/mp4'
          if (outputFormat === 'ogg') return 'audio/ogg'
          if (outputFormat === 'wav') return 'audio/wav'
        }
        return 'application/octet-stream'
      }
      const blob = uint8ArrayToBlob(outputData as Uint8Array, getMimeType())
      
      // Clean up
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
      
      setResult(blob)
      setResultName(`converted.${outputFormat}`)
      setProgress(100)
      addLog(t('lab.converter.conversionComplete'))
    } catch (err: any) {
      setError(err.message || t('lab.converter.conversionFailed'))
      addLog(t('lab.converter.conversionFailed'))
    } finally {
      setConverting(false)
    }
  }

  const handleConvert = async () => {
    switch (activeTab) {
      case 'image':
        await convertImage()
        break
      case 'audio':
      case 'video':
      case 'extract':
        await convertWithFfmpeg(activeTab)
        break
    }
  }

  const handleDownloadResult = () => {
    if (!result) return
    const url = URL.createObjectURL(result)
    const link = document.createElement('a')
    link.href = url
    link.download = resultName
    link.click()
    URL.revokeObjectURL(url)
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
      { value: 'webm', label: 'WebM' },
      { value: 'mp4', label: 'MP4 (H.264)' },
      { value: 'mkv', label: 'MKV (Matroska)' },
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
                setActiveTab(tab.id)
                setFile(null)
                setResult(null)
                setOutputFormat(getDefaultOutputFormat(tab.id))
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-theme-secondary hover:bg-theme-hover'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

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
            accept={
              activeTab === 'image'
                ? 'image/png,image/jpeg,image/gif,image/webp'
                : activeTab === 'audio'
                ? 'audio/*'
                : activeTab === 'video'
                ? 'video/*'
                : 'video/*'
            }
            onChange={handleFileSelect}
          />
          <Upload className="w-12 h-12 text-theme-secondary mx-auto mb-4" />
          <p className="text-theme-primary font-medium mb-1">
            {file ? file.name : t('lab.converter.dropFile')}
          </p>
          <p className="text-theme-secondary text-sm">
            {t('lab.converter.orClick')}
          </p>
          <p className="text-theme-secondary text-xs mt-2">
            {t('lab.converter.maxFileSize')}
          </p>
        </div>

        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="space-y-4">
              {/* Output Format */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  {t('lab.converter.outputFormat')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {formatOptions[activeTab].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setOutputFormat(opt.value)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        outputFormat === opt.value
                          ? 'bg-primary text-white'
                          : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image-specific settings */}
              {activeTab === 'image' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {t('lab.converter.quality')}: {Math.round(quality * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full h-2 bg-theme-tertiary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-2">
                        {t('lab.converter.width')}
                      </label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={scaleWidth}
                        onChange={(e) => setScaleWidth(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-2">
                        {t('lab.converter.height')}
                      </label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={scaleHeight}
                        onChange={(e) => setScaleHeight(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Audio-specific settings */}
              {(activeTab === 'audio' || activeTab === 'extract') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {t('lab.converter.bitrate')}
                    </label>
                    <select
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                    >
                      <option value="128k">128 kbps</option>
                      <option value="192k">192 kbps</option>
                      <option value="256k">256 kbps</option>
                      <option value="320k">320 kbps</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {t('lab.converter.sampleRate')}
                    </label>
                    <select
                      value={audioSampleRate}
                      onChange={(e) => setAudioSampleRate(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                    >
                      <option value="22050">22050 Hz</option>
                      <option value="44100">44100 Hz</option>
                      <option value="48000">48000 Hz</option>
                    </select>
                  </div>
                </>
              )}

              {/* Video-specific settings */}
              {activeTab === 'video' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {t('lab.converter.videoQuality')}
                    </label>
                    <select
                      value={videoQuality}
                      onChange={(e) => setVideoQuality(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                    >
                      <option value="fast">{t('lab.converter.fast')}</option>
                      <option value="medium">{t('lab.converter.medium')}</option>
                      <option value="slow">{t('lab.converter.slow')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {t('lab.converter.videoBitrate')}
                    </label>
                    <select
                      value={videoBitrate}
                      onChange={(e) => setVideoBitrate(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
                    >
                      <option value="1M">1 Mbps</option>
                      <option value="2M">2 Mbps</option>
                      <option value="5M">5 Mbps</option>
                      <option value="10M">10 Mbps</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Action & Logs */}
            <div className="space-y-4">
              <button
                onClick={handleConvert}
                disabled={converting || !file || !outputFormat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('lab.converter.converting')} {Math.min(100, Math.max(0, progress))}%
                  </>
                ) : (
                  t('lab.converter.convert')
                )}
              </button>

              {/* Progress Bar */}
              {converting && (
                <div className="w-full bg-theme-tertiary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              )}

              {/* Logs Panel */}
              {logs.length > 0 && (
                <div className="bg-black/50 rounded-lg p-3 max-h-32 overflow-y-auto text-xs font-mono">
                  {logs.map((log, i) => (
                    <div key={i} className="text-green-400">{log}</div>
                  ))}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t('lab.converter.conversionComplete')}</span>
                  </div>
                  <button
                    onClick={handleDownloadResult}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    {t('lab.converter.downloadResult')}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ffmpeg notice */}
        {(activeTab === 'audio' || activeTab === 'video' || activeTab === 'extract') && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <p className="text-blue-600 dark:text-blue-400">
              {t('lab.converter.ffmpegNotice')}
            </p>
          </div>
        )}
      </div>
    </LabLayout>
  )
}
