import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { QRCodeCanvas } from 'qrcode.react'
import { LabLayout } from './LabLayout'
import { Download, Copy, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react'

type QRLevel = 'L' | 'M' | 'Q' | 'H'
type ExportSize = 128 | 256 | 512 | 1024 | 2048

interface QRConfig {
  size: number
  fgColor: string
  bgColor: string
  level: QRLevel
  rounded: boolean
  logoUrl: string | null
}

const DEFAULT_CONFIG: QRConfig = {
  size: 256,
  fgColor: '#000000',
  bgColor: '#ffffff',
  level: 'M',
  rounded: false,
  logoUrl: null,
}

const EXPORT_SIZES: ExportSize[] = [128, 256, 512, 1024, 2048]

const STORAGE_KEY = 'lab_qrcode_config'
const MAX_TEXT_LENGTH = 1200
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

export default function QrCodePage() {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [config, setConfig] = useState<QRConfig>(DEFAULT_CONFIG)
  const [showLogo, setShowLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [textError, setTextError] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const getLevelDesc = (level: QRLevel): string => ({
    L: t('lab.qrcode.levelLow'),
    M: t('lab.qrcode.levelMedium'),
    Q: t('lab.qrcode.levelHigh'),
    H: t('lab.qrcode.levelHighest'),
  })[level]

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig({ ...DEFAULT_CONFIG, ...parsed })
      } catch {
        // ignore
      }
    }
  }, [])

  // Save config (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }, 300)
    return () => clearTimeout(timer)
  }, [config])

  // Text validation with debounce
  const handleTextChange = useCallback((value: string) => {
    setText(value)
    if (value.length > MAX_TEXT_LENGTH) {
      setTextError(t('lab.qrcode.textTooLong', { max: MAX_TEXT_LENGTH }))
    } else {
      setTextError('')
    }
  }, [t])

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('')
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(t('lab.qrcode.logoTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setConfig((prev) => ({ ...prev, logoUrl: event.target?.result as string }))
      setShowLogo(true)
    }
    reader.readAsDataURL(file)
  }, [t])

  const handleClear = () => {
    setText('')
    setTextError('')
  }

  const handleDownload = (format: 'png' | 'svg') => {
    if (!text) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const exportSize = config.size

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `qrcode-${exportSize}x${exportSize}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else {
      // For SVG, create SVG with embedded image
      const dataUrl = canvas.toDataURL('image/png')
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportSize}" height="${exportSize}" viewBox="0 0 ${exportSize} ${exportSize}">
        <image href="${dataUrl}" width="${exportSize}" height="${exportSize}"/>
      </svg>`
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `qrcode-${exportSize}x${exportSize}-${Date.now()}.svg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b))
      })
      if (!blob) throw new Error('Failed to create blob')
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that don't support ClipboardItem
      const url = canvas.toDataURL()
      const img = document.createElement('img')
      img.src = url
      document.body.appendChild(img)
      const range = document.createRange()
      range.selectNode(img)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      document.execCommand('copy')
      document.body.removeChild(img)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <LabLayout
      title={t('lab.tools.qrcode.title')}
      description={t('lab.tools.qrcode.desc')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Input & Settings */}
        <div className="space-y-6">
          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-theme-on-surface mb-2">
              {t('lab.qrcode.inputLabel')}
            </label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={t('lab.qrcode.inputPlaceholder')}
                className="w-full h-32 px-4 py-3 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface placeholder:text-theme-secondary/50 focus:outline-none focus:border-primary transition-colors resize-none"
                maxLength={MAX_TEXT_LENGTH + 100}
              />
              {text && (
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 p-1 text-theme-secondary hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${textError ? 'text-red-500' : 'text-theme-secondary'}`}>
                {textError || `${text.length} / ${MAX_TEXT_LENGTH}`}
              </span>
              {textError && (
                <span className="flex items-center text-xs text-red-500">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {textError}
                </span>
              )}
            </div>
          </div>

          {/* Size Control */}
          <div>
            <label className="block text-sm font-medium text-theme-on-surface mb-2">
              {t('lab.qrcode.sizeLabel')}: {config.size}px
              <span className="text-xs text-theme-secondary ml-2">({t('lab.qrcode.exportSize')})</span>
            </label>
            <input
              type="range"
              min={128}
              max={2048}
              step={32}
              value={config.size}
              onChange={(e) => setConfig((p) => ({ ...p, size: Number(e.target.value) }))}
              className="w-full h-2 bg-theme-tertiary rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Color Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-on-surface mb-2">
                {t('lab.qrcode.fgColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.fgColor}
                  onChange={(e) => setConfig((p) => ({ ...p, fgColor: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-theme-color"
                />
                <input
                  type="text"
                  value={config.fgColor}
                  onChange={(e) => setConfig((p) => ({ ...p, fgColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-on-surface mb-2">
                {t('lab.qrcode.bgColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.bgColor}
                  onChange={(e) => setConfig((p) => ({ ...p, bgColor: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-theme-color"
                />
                <input
                  type="text"
                  value={config.bgColor}
                  onChange={(e) => setConfig((p) => ({ ...p, bgColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface text-sm"
                />
              </div>
            </div>
          </div>

          {/* Error Level */}
          <div>
            <label className="block text-sm font-medium text-theme-on-surface mb-2">
              {t('lab.qrcode.errorLevel')}
              <span className="text-xs font-normal text-theme-secondary ml-2">
                {getLevelDesc(config.level)}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['L', 'M', 'Q', 'H'] as QRLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setConfig((p) => ({ ...p, level }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.level === level
                      ? 'bg-primary text-white'
                      : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                  }`}
                  title={getLevelDesc(level)}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-theme-secondary mt-1">
              {t('lab.qrcode.errorLevelHint')}
            </p>
          </div>

          {/* Rounded Option */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-theme-on-surface">
              {t('lab.qrcode.rounded')}
            </label>
            <button
              onClick={() => setConfig((p) => ({ ...p, rounded: !p.rounded }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.rounded ? 'bg-primary' : 'bg-theme-tertiary'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.rounded ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-theme-on-surface mb-2">
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => {
                  setShowLogo(e.target.checked)
                  if (!e.target.checked) {
                    setConfig((p) => ({ ...p, logoUrl: null }))
                  }
                }}
                className="w-4 h-4 rounded border-theme-color text-primary focus:ring-primary"
              />
              {t('lab.qrcode.addLogo')}
            </label>
            {showLogo && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-theme-color rounded-lg text-theme-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  {config.logoUrl ? t('lab.qrcode.changeLogo') : t('lab.qrcode.uploadLogo')}
                </button>
                {config.logoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={config.logoUrl} alt="Logo" className="w-12 h-12 rounded object-cover" />
                    <button
                      onClick={() => setConfig((p) => ({ ...p, logoUrl: null }))}
                      className="text-red-500 text-sm hover:underline"
                    >
                      {t('lab.qrcode.removeLogo')}
                    </button>
                  </div>
                )}
                {logoError && (
                  <p className="text-red-500 text-xs mt-1">{logoError}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Preview & Actions */}
        <div className="flex flex-col items-center space-y-6">
          {/* QR Code Preview - fixed 256px display, canvas generated at export resolution */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            {text ? (
              <div
                style={{ width: 256, height: 256 }}
                className="relative"
              >
                <QRCodeCanvas
                  ref={canvasRef}
                  value={text}
                  size={config.size}
                  fgColor={config.fgColor}
                  bgColor={config.bgColor}
                  level={config.level}
                  includeMargin={true}
                  style={{ width: '100%', height: '100%' }}
                  imageSettings={
                    config.logoUrl
                      ? {
                          src: config.logoUrl,
                          height: Math.floor(config.size * 0.2),
                          width: Math.floor(config.size * 0.2),
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <div
                style={{ width: 256, height: 256 }}
                className="flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded"
              >
                {t('lab.qrcode.inputPlaceholder')}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* Quick Size Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-theme-secondary whitespace-nowrap">{t('lab.qrcode.exportSize')}:</span>
              {EXPORT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setConfig((p) => ({ ...p, size }))}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    config.size === size
                      ? 'bg-primary text-white'
                      : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDownload('png')}
                disabled={!text}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                PNG
              </button>
              <button
                onClick={() => handleDownload('svg')}
                disabled={!text}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-theme-tertiary text-theme-on-surface rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                SVG
              </button>
            </div>
            <button
              onClick={handleCopyToClipboard}
              disabled={!text}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-tertiary text-theme-on-surface rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-5 h-5" />
              {copied ? t('lab.qrcode.copied') : t('lab.qrcode.copyImage')}
            </button>
          </div>
        </div>
      </div>
    </LabLayout>
  )
}
