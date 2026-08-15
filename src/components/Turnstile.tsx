import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Cloudflare Turnstile 站点密钥（公开，仅用于前端加载人机验证组件）
const TURNSTILE_SITE_KEY = '0x4AAAAAAEQ0QIp21rS6l5ty'
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoaded = false
let scriptLoading: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`)
    if (existing) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      scriptLoading = null
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })

  return scriptLoading
}

export interface TurnstileHandle {
  execute: () => void
  reset: () => void
}

interface TurnstileProps {
  onSuccess: (token: string) => void
  onError?: () => void
  onExpired?: () => void
}

type TurnstileGlobal = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>
  ) => string
  execute: (widgetId: string) => void
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

function getTurnstile(): TurnstileGlobal | undefined {
  return (window as unknown as { turnstile?: TurnstileGlobal }).turnstile
}

const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  ({ onSuccess, onError, onExpired }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    // 用 ref 持有最新回调，避免 render 时闭包捕获旧值
    const handlersRef = useRef({ onSuccess, onError, onExpired })

    useEffect(() => {
      handlersRef.current = { onSuccess, onError, onExpired }
    }, [onSuccess, onError, onExpired])

    useEffect(() => {
      let cancelled = false

      const renderWidget = () => {
        const tw = getTurnstile()
        const container = containerRef.current
        if (!tw || !container) return

        widgetIdRef.current = tw.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'invisible',
          callback: (token: string) => handlersRef.current.onSuccess(token),
          'error-callback': () => handlersRef.current.onError?.(),
          'expired-callback': () => handlersRef.current.onExpired?.(),
        })
      }

      loadTurnstileScript()
        .then(() => {
          if (!cancelled) renderWidget()
        })
        .catch(() => {
          if (!cancelled) handlersRef.current.onError?.()
        })

      return () => {
        cancelled = true
        const tw = getTurnstile()
        if (widgetIdRef.current && tw?.remove) {
          try {
            tw.remove(widgetIdRef.current)
          } catch {
            // 忽略卸载时可能出现的清理异常
          }
        }
        widgetIdRef.current = null
      }
    }, [])

    useImperativeHandle(ref, () => ({
      execute: () => {
        const tw = getTurnstile()
        if (widgetIdRef.current && tw) {
          tw.execute(widgetIdRef.current)
        } else {
          handlersRef.current.onError?.()
        }
      },
      reset: () => {
        const tw = getTurnstile()
        if (widgetIdRef.current && tw) {
          tw.reset(widgetIdRef.current)
        }
      },
    }))

    return <div ref={containerRef} className="turnstile-container" />
  }
)

Turnstile.displayName = 'Turnstile'

export default Turnstile
