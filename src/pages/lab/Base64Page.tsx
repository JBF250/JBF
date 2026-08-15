import { useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { ArrowRightLeft, Copy, Code2 } from 'lucide-react'

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function decodeBase64(base64: string): string {
  const binary = atob(base64.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export default function Base64Page() {
  const { t } = useI18n()
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleConvert = () => {
    setError(null)
    setCopied(false)
    if (!input) {
      setOutput('')
      setError(t('lab.base64.emptyInput'))
      return
    }
    try {
      if (mode === 'encode') {
        setOutput(encodeBase64(input))
      } else {
        setOutput(decodeBase64(input))
      }
    } catch {
      setError(t('lab.base64.invalidBase64'))
    }
  }

  const copyOutput = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <LabLayout
      title={t('lab.tools.base64.title')}
      description={t('lab.tools.base64.desc')}
    >
      <div className="space-y-6">
        {/* Mode tabs */}
        <div className="flex gap-2 border-b border-theme-color pb-2">
          <button
            onClick={() => {
              setMode('encode')
              setInput('')
              setOutput('')
              setError(null)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'encode'
                ? 'bg-primary text-white'
                : 'text-theme-secondary hover:bg-theme-hover'
            }`}
          >
            <Code2 className="w-4 h-4" />
            {t('lab.base64.encodeTab')}
          </button>
          <button
            onClick={() => {
              setMode('decode')
              setInput('')
              setOutput('')
              setError(null)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'decode'
                ? 'bg-primary text-white'
                : 'text-theme-secondary hover:bg-theme-hover'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            {t('lab.base64.decodeTab')}
          </button>
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-theme-on-surface mb-2">
            {t('lab.base64.inputLabel')}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? t('lab.base64.encodePlaceholder') : t('lab.base64.decodePlaceholder')}
            rows={5}
            className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface resize-y font-mono text-sm"
          />
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <ArrowRightLeft className="w-5 h-5" />
          {mode === 'encode' ? t('lab.base64.encode') : t('lab.base64.decode')}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Output */}
        {output && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-theme-on-surface">
                {t('lab.base64.outputLabel')}
              </label>
              <button
                onClick={copyOutput}
                className="flex items-center gap-1 px-3 py-1.5 bg-theme-tertiary border border-theme-color text-theme-on-surface rounded-lg text-sm hover:border-primary/50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? t('lab.base64.copied') : t('lab.base64.copy')}
              </button>
            </div>
            <textarea
              readOnly
              value={output}
              rows={5}
              className="w-full px-3 py-2 bg-theme-tertiary border border-theme-color rounded-lg text-theme-on-surface resize-y font-mono text-sm"
            />
          </div>
        )}
      </div>
    </LabLayout>
  )
}
