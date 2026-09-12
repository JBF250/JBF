import { useRef, useState, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { ScanText, Loader2, Copy, Download, X, Info, Languages } from 'lucide-react'
import { getEngine, setEngineProgress } from '@/lib/ocr'

const ACCEPTED = ['image/png']
const MAX_SIZE = 20 * 1024 * 1024

type EngineState = 'idle' | 'loading' | 'ready' | 'error'

export default function OcrPage() {
  const { t } = useI18n()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [engineState, setEngineState] = useState<EngineState>('idle')
  const [engineProgress, setEngineProgressState] = useState(0)
  const [recognizing, setRecognizing] = useState(false)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setImageFile(null)
    setImagePreview(null)
    setResultText('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError(t('lab.imageText.invalidFormat'))
      return
    }
    if (file.size > MAX_SIZE) {
      setError(t('lab.imageText.fileTooLarge'))
      return
    }
    setError(null)
    setResultText('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRecognize = useCallback(async () => {
    if (!imageFile) return
    setRecognizing(true)
    setError(null)
    setResultText('')
    try {
      if (engineState !== 'ready') {
        setEngineState('loading')
        setEngineProgressState(0)
        setEngineProgress((p) => setEngineProgressState(p))
      }
      const engine = await getEngine()
      setEngineState('ready')
      setEngineProgress(null)
      const result = await engine.recognize(imageFile)
      setResultText(result.fullText.trim())
      if (!result.fullText.trim()) {
        setError(t('lab.imageText.recognizeError'))
      }
    } catch {
      setEngineState('error')
      setError(t('lab.imageText.recognizeError'))
    } finally {
      setRecognizing(false)
    }
  }, [imageFile, engineState, t])

  const copyText = async () => {
    if (!resultText) return
    try {
      await navigator.clipboard.writeText(resultText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const downloadText = () => {
    if (!resultText) return
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${imageFile?.name.replace(/\.[^.]+$/, '') || 'ocr-result'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const recognizingLabel =
    engineState === 'loading' || (recognizing && engineState !== 'ready')
      ? `${t('lab.imageText.engineLoading')} ${engineState === 'loading' ? Math.round(engineProgress * 100) + '%' : ''}`
      : t('lab.imageText.recognizing')

  return (
    <LabLayout
      title={t('lab.tools.imageText.title')}
      description={t('lab.tools.imageText.desc')}
      showPrivacyNotice
    >
      <div className="space-y-6">
        {/* Upload Area */}
        {!imageFile ? (
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
            <ScanText className="w-12 h-12 mx-auto mb-4 text-theme-secondary" />
            <p className="text-theme-on-surface font-medium mb-2">{t('lab.imageText.dropFile')}</p>
            <p className="text-theme-secondary text-sm mb-4">{t('lab.imageText.supportedFormats')}</p>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90">
              {t('lab.imageText.selectFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image preview + info */}
            <div className="flex flex-col sm:flex-row gap-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full sm:w-64 h-40 object-cover rounded-xl border border-theme-color"
                />
              )}
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3 bg-theme-tertiary rounded-xl p-4">
                  <ScanText className="w-6 h-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-theme-on-surface text-sm font-medium truncate">{imageFile.name}</p>
                    <p className="text-theme-tertiary text-xs">
                      {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="p-2 text-theme-tertiary hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Multilingual engine note */}
                <div className="flex items-start gap-2 bg-theme-tertiary rounded-xl p-3">
                  <Languages className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-theme-secondary text-sm">{t('lab.imageText.multilingualHint')}</p>
                </div>
              </div>
            </div>

            {/* First-time notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">{t('lab.imageText.firstTimeNotice')}</p>
            </div>

            {/* Recognize button */}
            <button
              onClick={handleRecognize}
              disabled={recognizing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {recognizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {recognizingLabel}
                </>
              ) : (
                <>
                  <ScanText className="w-5 h-5" />
                  {t('lab.imageText.recognize')}
                </>
              )}
            </button>

            {/* Result */}
            {resultText !== '' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-theme-on-surface">
                    {t('lab.imageText.resultLabel')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyText}
                      className="flex items-center gap-1 px-3 py-1.5 bg-theme-tertiary border border-theme-color text-theme-on-surface rounded-lg text-sm hover:border-primary/50 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? t('lab.imageText.copied') : t('lab.imageText.copy')}
                    </button>
                    <button
                      onClick={downloadText}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                      {t('lab.imageText.download')}
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={resultText}
                  rows={8}
                  className="allow-select w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface resize-y text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
      </div>
    </LabLayout>
  )
}