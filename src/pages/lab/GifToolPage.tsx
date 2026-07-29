import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Upload, Download, Grid3x3, Layers, Loader2, Trash2 } from 'lucide-react'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

type GifTab = 'split' | 'merge'

interface GifFrame {
  url: string
  delay: number
}

interface MergeFrame {
  url: string
  file: File
  delay: number
}

const MAX_GIF_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FRAMES = 45

export default function GifToolPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<GifTab>('split')
  
  // Split state
  const [gifFile, setGifFile] = useState<File | null>(null)
  const [frames, setFrames] = useState<GifFrame[]>([])
  const [gifInfo, setGifInfo] = useState({ frames: 0, width: 0, height: 0, duration: 0 })
  const [splitting, setSplitting] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

  // Merge state
  const [mergeFrames, setMergeFrames] = useState<MergeFrame[]>([])
  const [frameDelay, setFrameDelay] = useState(100)
  const [loopCount, setLoopCount] = useState(0) // 0 = infinite
  const [quality, setQuality] = useState(10)
  const [merging, setMerging] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewTimerRef = useRef<number | null>(null)

  // Parse GIF file
  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_GIF_SIZE) {
      alert(t('lab.gif.fileTooLarge'))
      return
    }

    setGifFile(file)
    setFrames([])
    setGifInfo({ frames: 0, width: 0, height: 0, duration: 0 })
    setSplitting(true)

    try {
      // Use gifuct-js to parse GIF
      const { parseGIF, decompressFrames } = await import('gifuct-js')
      
      const arrayBuffer = await file.arrayBuffer()
      const gif = parseGIF(arrayBuffer)
      const gifFrames = decompressFrames(gif, true)

      const extractedFrames: GifFrame[] = []
      let totalDuration = 0

      for (let i = 0; i < gifFrames.length; i++) {
        const frame = gifFrames[i]
        const delay = frame.delay || 100
        totalDuration += delay

        // Convert frame to image
        const canvas = document.createElement('canvas')
        canvas.width = frame.dims.width
        canvas.height = frame.dims.height
        const ctx = canvas.getContext('2d')!

        const imageData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height
        )
        ctx.putImageData(imageData, 0, 0)

        // Handle disposal method for proper frame composition
        if (i === 0 || gifFrames[i - 1].disposalType === 2) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        const url = canvas.toDataURL('image/png')
        extractedFrames.push({ url, delay })
        
        setSplitProgress(Math.round(((i + 1) / gifFrames.length) * 100))
      }

      setFrames(extractedFrames)
      setGifInfo({
        frames: gifFrames.length,
        width: gifFrames[0]?.dims.width || 0,
        height: gifFrames[0]?.dims.height || 0,
        duration: totalDuration,
      })
    } catch (err: any) {
      alert(t('lab.gif.parseError'))
    } finally {
      setSplitting(false)
    }
  }

  // Download single frame
  const downloadFrame = (frame: GifFrame, index: number) => {
    const link = document.createElement('a')
    link.href = frame.url
    link.download = `frame-${index + 1}.png`
    link.click()
  }

  // Download all frames as zip
  const downloadAllAsZip = async () => {
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      for (let i = 0; i < frames.length; i++) {
        const response = await fetch(frames[i].url)
        const blob = await response.blob()
        zip.file(`frame-${i + 1}.png`, blob)
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = 'frames.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert(t('lab.gif.zipError'))
    }
  }

  // Upload frames for merge
  const handleMergeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (mergeFrames.length + files.length > MAX_FRAMES) {
      alert(t('lab.gif.tooManyFrames', { max: MAX_FRAMES }))
      return
    }

    const newFrames: MergeFrame[] = []
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newFrames.push({
          url: URL.createObjectURL(file),
          file,
          delay: frameDelay,
        })
      }
    })

    setMergeFrames((prev) => [...prev, ...newFrames])
  }

  // Remove frame from merge list
  const removeFrame = (index: number) => {
    setMergeFrames((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].url)
      next.splice(index, 1)
      return next
    })
  }

  // Move frame up/down
  const moveFrame = (index: number, direction: -1 | 1) => {
    setMergeFrames((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  // Update frame delay
  const updateFrameDelay = (index: number, delay: number) => {
    setMergeFrames((prev) => {
      const next = [...prev]
      next[index].delay = delay
      return next
    })
  }

  // Generate GIF using gifenc library
  const generateGif = useCallback(async () => {
    if (mergeFrames.length < 2) {
      alert(t('lab.gif.needMoreFrames'))
      return
    }

    setMerging(true)
    setResultUrl('')

    try {
      const images = await Promise.all(
        mergeFrames.map(
          (frame) =>
            new Promise<HTMLImageElement>((resolve) => {
              const img = new Image()
              img.onload = () => resolve(img)
              img.src = frame.url
            })
        )
      )

      const width = images[0].width
      const height = images[0].height

      const mismatched = images.some(img => img.width !== width || img.height !== height)
      if (mismatched) {
        console.warn('GIF帧尺寸不一致，所有帧将按第一帧尺寸缩放')
      }

      const encoder = GIFEncoder()

      for (let i = 0; i < images.length; i++) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(images[i], 0, 0, width, height)

        const imageData = ctx.getImageData(0, 0, width, height)

        const palette = quantize(imageData.data, 256)
        const indexed = applyPalette(imageData.data, palette)

        const opts: { palette: any; delay: number; dispose: number; repeat?: number } = {
          palette,
          delay: frameDelay,
          dispose: 2,
        }
        if (i === 0) {
          opts.repeat = loopCount
        }

        encoder.writeFrame(indexed, width, height, opts)
      }

      encoder.finish()
      const gifData = encoder.bytes()
      const blob = new Blob([gifData as BlobPart], { type: 'image/gif' })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
    } catch (err: any) {
      console.error('GIF generation error:', err)
      alert(t('lab.gif.generateError'))
    } finally {
      setMerging(false)
    }
  }, [mergeFrames, frameDelay, loopCount, quality, t])

  // Preview animation — use a canvas ref to render frames directly in the DOM
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || mergeFrames.length === 0) return

    const ctx = canvas.getContext('2d')!
    let currentIndex = 0
    const loadedImages: HTMLImageElement[] = []
    let cancelled = false

    // Preload all images
    const loadPromises = mergeFrames.map((frame) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.src = frame.url
      })
    )

    Promise.all(loadPromises).then((imgs) => {
      if (cancelled) return
      loadedImages.push(...imgs)

      // Set canvas size to first frame dimensions (downscale for preview if too large)
      const maxDim = 320
      const scale = Math.min(1, maxDim / Math.max(imgs[0].width, imgs[0].height))
      canvas.width = Math.round(imgs[0].width * scale)
      canvas.height = Math.round(imgs[0].height * scale)

      const render = () => {
        if (cancelled) return
        const img = loadedImages[currentIndex]
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        currentIndex = (currentIndex + 1) % loadedImages.length
        previewTimerRef.current = window.setTimeout(render, frameDelay)
      }
      render()
    })

    return () => {
      cancelled = true
      if (previewTimerRef.current !== null) {
        clearTimeout(previewTimerRef.current)
        previewTimerRef.current = null
      }
    }
  }, [mergeFrames, frameDelay])

  return (
    <LabLayout
      title={t('lab.tools.gifTool.title')}
      description={t('lab.tools.gifTool.desc')}
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme-color pb-2 mb-6">
        <button
          onClick={() => {
            setActiveTab('split')
            setMergeFrames([])
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'split'
              ? 'bg-primary text-white'
              : 'text-theme-secondary hover:bg-theme-hover'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          {t('lab.gif.splitTab')}
        </button>
        <button
          onClick={() => {
            setActiveTab('merge')
            setGifFile(null)
            setFrames([])
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'merge'
              ? 'bg-primary text-white'
              : 'text-theme-secondary hover:bg-theme-hover'
          }`}
        >
          <Layers className="w-4 h-4" />
          {t('lab.gif.mergeTab')}
        </button>
      </div>

      {/* Split Tab */}
      {activeTab === 'split' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-theme-color rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={handleGifUpload}
            />
            <Upload className="w-12 h-12 text-theme-secondary mx-auto mb-4" />
            <p className="text-theme-primary font-medium mb-1">
              {gifFile ? gifFile.name : t('lab.gif.uploadGif')}
            </p>
            <p className="text-theme-secondary text-sm">
              {t('lab.gif.maxSize')}
            </p>
          </div>

          {/* Info Display */}
          {gifInfo.frames > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-theme-tertiary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{gifInfo.frames}</p>
                <p className="text-sm text-theme-secondary">{t('lab.gif.totalFrames')}</p>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {gifInfo.width}x{gifInfo.height}
                </p>
                <p className="text-sm text-theme-secondary">{t('lab.gif.resolution')}</p>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {(gifInfo.duration / 1000).toFixed(1)}s
                </p>
                <p className="text-sm text-theme-secondary">{t('lab.gif.totalDuration')}</p>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {Math.round(gifInfo.duration / gifInfo.frames)}ms
                </p>
                <p className="text-sm text-theme-secondary">{t('lab.gif.frameDelay')}</p>
              </div>
            </div>
          )}

          {/* Frames Grid */}
          {frames.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-theme-primary">
                  {t('lab.gif.extractedFrames')}
                </h3>
                <button
                  onClick={downloadAllAsZip}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  {t('lab.gif.downloadZip')}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto p-2">
                {frames.map((frame, index) => (
                  <div
                    key={index}
                    className="relative group bg-theme-tertiary rounded-lg p-1"
                  >
                    <img
                      src={frame.url}
                      alt={`Frame ${index + 1}`}
                      className="w-full aspect-square object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => downloadFrame(frame, index)}
                        className="p-2 bg-white rounded"
                      >
                        <Download className="w-4 h-4 text-black" />
                      </button>
                    </div>
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Progress */}
          {splitting && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>{t('lab.gif.parsing')} {splitProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Merge Tab */}
      {activeTab === 'merge' && (
        <div className="space-y-6">
          {/* Upload Frames */}
          <div
            onClick={() => mergeInputRef.current?.click()}
            className="border-2 border-dashed border-theme-color rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <input
              ref={mergeInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={handleMergeUpload}
            />
            <Upload className="w-12 h-12 text-theme-secondary mx-auto mb-4" />
            <p className="text-theme-primary font-medium mb-1">
              {t('lab.gif.uploadFrames')}
            </p>
            <p className="text-theme-secondary text-sm">
              {t('lab.gif.frameLimit', { max: MAX_FRAMES })}
            </p>
          </div>

          {/* Frame List */}
          {mergeFrames.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-4">
                {t('lab.gif.frameOrder')} ({mergeFrames.length}/{MAX_FRAMES})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mergeFrames.map((frame, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-theme-tertiary rounded-lg p-2"
                  >
                    <span className="w-6 text-center text-sm text-theme-secondary">
                      {index + 1}
                    </span>
                    <img
                      src={frame.url}
                      alt={`Frame ${index + 1}`}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      value={frame.delay}
                      onChange={(e) => updateFrameDelay(index, parseInt(e.target.value))}
                      className="w-20 px-2 py-1 bg-theme-bg border border-theme-color rounded text-sm text-theme-primary"
                    />
                    <span className="text-xs text-theme-secondary">ms</span>
                    <div className="flex-1" />
                    <button
                      onClick={() => moveFrame(index, -1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-theme-secondary hover:text-primary disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveFrame(index, 1)}
                      disabled={index === mergeFrames.length - 1}
                      className="px-2 py-1 text-theme-secondary hover:text-primary disabled:opacity-50"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeFrame(index)}
                      className="px-2 py-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                {t('lab.gif.frameDelay')} (ms)
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={frameDelay}
                onChange={(e) => setFrameDelay(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                {t('lab.gif.loopCount')}
              </label>
              <select
                value={loopCount}
                onChange={(e) => setLoopCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-primary"
              >
                <option value={0}>{t('lab.gif.infiniteLoop')}</option>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                {t('lab.gif.quality')}: {quality}
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-2 bg-theme-tertiary rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          {mergeFrames.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-4">
                {t('lab.gif.preview')}
              </h3>
              <div className="bg-theme-tertiary rounded-lg p-4 flex justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full rounded"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={generateGif}
            disabled={merging || mergeFrames.length < 2}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {merging ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('lab.gif.generating')}
              </>
            ) : (
              t('lab.gif.generateGif')
            )}
          </button>

          {/* Result */}
          {resultUrl && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <span className="font-medium">{t('lab.gif.generationComplete')}</span>
              </div>
              <div className="flex justify-center mb-4">
                <img src={resultUrl} alt="Generated GIF" className="max-w-xs" />
              </div>
              <a
                href={resultUrl}
                download="generated.gif"
                className="block w-full text-center py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {t('lab.gif.downloadGif')}
              </a>
            </div>
          )}
        </div>
      )}
    </LabLayout>
  )
}
