import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/context/I18nContext'

export default function ConfirmWait() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type') || 'email'
  const hasToken = !!tokenHash

  // 用户手动点击按钮后才兑换 token，避免邮箱安全自检提前消耗一次性 token
  const handleConfirm = async () => {
    if (!tokenHash) {
      setStatus('error')
      setErrorMsg(t('confirmWait.missingToken'))
      return
    }

    setStatus('verifying')
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType as any,
      })

      if (error) {
        console.error('Confirm email error:', error)
        setStatus('error')
        if (error.message?.includes('expired') || error.message?.includes('Token has expired')) {
          setErrorMsg(t('confirmWait.expired'))
        } else {
          setErrorMsg(t('confirmWait.failed'))
        }
        return
      }

      // 清除 URL 中的 token，避免刷新后重复验证
      window.history.replaceState(null, '', window.location.pathname)
      setStatus('success')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    } catch {
      setStatus('error')
      setErrorMsg(t('confirmWait.failed'))
    }
  }

  // 验证中
  if (status === 'verifying') {
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

  // 成功
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

  // 错误，或进入页面时缺少 token
  if (status === 'error' || !hasToken) {
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
            {errorMsg || t('confirmWait.missingToken')}
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

  // 待用户点击确认按钮
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-tertiary flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-theme-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-theme-primary mb-8">
          {t('confirmWait.title')}
        </h1>
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <MailCheck className="w-5 h-5" />
          {t('confirmWait.confirmButton')}
        </button>
      </div>
    </div>
  )
}
