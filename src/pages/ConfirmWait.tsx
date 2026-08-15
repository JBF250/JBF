import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailCheck, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/context/I18nContext'

export default function ConfirmWait() {
  const navigate = useNavigate()
  const { t } = useI18n()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    const confirm = async () => {
      // 隐式流程：点击邮件链接后，Supabase 会把 access_token 放在 URL hash 中重定向回来
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(t('confirmWait.missingToken'))
        }
        return
      }

      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (cancelled) return

        if (error) {
          setStatus('error')
          setErrorMsg(t('confirmWait.failed'))
          return
        }

        // 清除 URL 中的 hash，避免刷新页面时重复处理
        window.history.replaceState(null, '', window.location.pathname)
        setStatus('success')
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 1500)
      } catch {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(t('confirmWait.failed'))
        }
      }
    }

    confirm()

    return () => {
      cancelled = true
    }
  }, [navigate, t])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-tertiary flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
            {t('confirmWait.verifying')}
          </h1>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
            {t('confirmWait.success')}
          </h1>
          <p className="text-theme-secondary">
            {t('confirmWait.successDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
          {t('confirmWait.failedTitle')}
        </h1>
        <p className="text-theme-secondary mb-8">
          {errorMsg}
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-theme-tertiary text-theme-primary rounded-xl hover:bg-theme-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('confirmWait.backHome')}
        </button>
      </div>
    </div>
  )
}
