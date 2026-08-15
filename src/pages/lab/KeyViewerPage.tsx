import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Copy, Keyboard } from 'lucide-react'

interface KeyInfo {
  key: string
  code: string
  keyCode: number
  modifiers: string[]
}

const keyboardLayout = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'],
]

const keyLabels: Record<string, string> = {
  Escape: 'Esc',
  Backquote: '`',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Minus: '-', Equal: '=',
  Backspace: '⌫',
  Tab: 'Tab',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'Caps',
  Semicolon: ';', Quote: "'", Enter: '↵',
  ShiftLeft: '⇧', ShiftRight: '⇧',
  Comma: ',', Period: '.', Slash: '/',
  ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
  MetaLeft: 'Win', MetaRight: 'Win',
  AltLeft: 'Alt', AltRight: 'Alt',
  Space: 'Space', ContextMenu: '≡',
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
}

function getKeyLabel(code: string): string {
  if (keyLabels[code]) return keyLabels[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Arrow')) return code.slice(5)
  return code
}

function getKeyWidth(code: string): string {
  switch (code) {
    case 'Backspace': return 'w-20'
    case 'Tab': return 'w-16'
    case 'CapsLock': return 'w-24'
    case 'Enter': return 'w-20'
    case 'ShiftLeft':
    case 'ShiftRight': return 'w-24'
    case 'ControlLeft':
    case 'ControlRight': return 'w-16'
    case 'Space': return 'flex-1 min-w-[200px]'
    default: return 'w-10'
  }
}

export default function KeyViewerPage() {
  const { t } = useI18n()
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [currentKey, setCurrentKey] = useState<KeyInfo | null>(null)
  const [copied, setCopied] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const newActiveKeys = new Set(activeKeys)
    newActiveKeys.add(e.code)
    setActiveKeys(newActiveKeys)

    const modifiers: string[] = []
    if (e.shiftKey) modifiers.push('Shift')
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.altKey) modifiers.push('Alt')
    if (e.metaKey) modifiers.push('Win')

    setCurrentKey({
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      modifiers,
    })
  }, [activeKeys])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const newActiveKeys = new Set(activeKeys)
    newActiveKeys.delete(e.code)
    setActiveKeys(newActiveKeys)
  }, [activeKeys])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const copyKeyInfo = async () => {
    if (!currentKey) return
    const text = `Key: ${currentKey.key}\nCode: ${currentKey.code}\nKeyCode: ${currentKey.keyCode}\nModifiers: ${currentKey.modifiers.join(', ') || 'None'}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* empty */ }
  }

  return (
    <LabLayout
      title={t('lab.tools.keyViewer.title')}
      description={t('lab.tools.keyViewer.desc')}
    >
      <div className="space-y-6">
        {/* Current Key Display */}
        <div className="bg-theme-tertiary rounded-xl p-6 border border-theme-color">
          <div className="flex items-center gap-4 mb-4">
            <Keyboard className="w-8 h-8 text-primary" />
            <h3 className="text-lg font-semibold text-theme-on-surface">
              {t('lab.keyViewer.currentKey')}
            </h3>
          </div>
          
          {currentKey ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-theme-bg rounded-lg p-3">
                <p className="text-xs text-theme-secondary mb-1">{t('lab.keyViewer.key')}</p>
                <p className="text-lg font-mono text-primary">{currentKey.key}</p>
              </div>
              <div className="bg-theme-bg rounded-lg p-3">
                <p className="text-xs text-theme-secondary mb-1">{t('lab.keyViewer.code')}</p>
                <p className="text-lg font-mono text-primary">{getKeyLabel(currentKey.code)}</p>
              </div>
              <div className="bg-theme-bg rounded-lg p-3">
                <p className="text-xs text-theme-secondary mb-1">{t('lab.keyViewer.keyCode')}</p>
                <p className="text-lg font-mono text-primary">{currentKey.keyCode}</p>
              </div>
              <div className="bg-theme-bg rounded-lg p-3">
                <p className="text-xs text-theme-secondary mb-1">{t('lab.keyViewer.modifiers')}</p>
                <p className="text-lg font-mono text-primary">
                  {currentKey.modifiers.length > 0 
                    ? currentKey.modifiers.join(' + ') 
                    : '—'
                  }
                </p>
              </div>
            </div>
          ) : (
            <p className="text-theme-secondary text-center py-4">
              {t('lab.keyViewer.pressAnyKey')}
            </p>
          )}

          {currentKey && (
            <button
              onClick={copyKeyInfo}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Copy className="w-4 h-4" />
              {copied ? t('lab.keyViewer.copied') : t('lab.keyViewer.copyInfo')}
            </button>
          )}
        </div>

        {/* Visual Keyboard */}
        <div className="bg-theme-tertiary rounded-xl p-4 overflow-x-auto">
          <div className="min-w-[600px] space-y-2">
            {keyboardLayout.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1 justify-center">
                {row.map((code) => (
                  <div
                    key={code}
                    className={`${getKeyWidth(code)} h-12 rounded-lg border text-xs font-medium transition-all duration-75 flex items-center justify-center select-none ${
                      activeKeys.has(code)
                        ? 'bg-primary border-primary text-white shadow-lg scale-95'
                        : 'bg-theme-bg border-theme-color text-theme-secondary hover:border-primary/50'
                    }`}
                  >
                    {getKeyLabel(code)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
          <p className="text-yellow-600 dark:text-yellow-400">
            {t('lab.keyViewer.mobileNotice')}
          </p>
        </div>
      </div>
    </LabLayout>
  )
}
