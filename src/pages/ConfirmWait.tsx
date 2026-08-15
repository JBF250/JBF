import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailCheck, XCircle, Loader2, Send, ArrowLeft, Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/context/I18nContext'

// 从 URL 读取 token_hash 与 type（优先 hash 片段，其次 query，兼容两种邮件模板）
function readTokenParams(): { token_hash: string | null; type: string } {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
  const hashParams = new URLSearchParams(hash)
  const searchParams = new URLSearchParams(window.location.search)

  return {
    token_hash: hashParams.get('token_hash') || searchParams.get('token_hash'),
    type: hashParams.get('type') || searchParams.get('type') || 'email',
  }
}

export default function ConfirmWait() {
  const navigate = useNavigate()
  const { t } = useI18n()

  const { token_hash, type } = readTokenParams()
  const isRecovery = type === 'recovery'

  // 邮箱确认状态
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // 重置密码表单状态
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 用户手动点击按钮才执行邮箱验证，禁止自动调用 verifyOtp
  const handleConfirmEmail = async () => {
    if (!token_hash) {
      setError(t('confirmWait.missingToken'))
      return
    }

    setVerifying(true)
    setError('')

    try {
      // 传入 URL 解析得到的原始 type，禁止写死 'email'
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        if (error.message?.includes('expired') || error.message?.includes('Token has expired')) {
          setError(t('confirmWait.expired'))
        } else {
          setError(t('confirmWait.failed'))
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    } catch {
      setError(t('confirmWait.failed'))
    } finally {
      setVerifying(false)
    }
  }

  // 重置密码：先 verifyOtp 建立会话，再更新密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token_hash) {
      setError(t('confirmWait.missingToken'))
      return
    }

    if (password.length < 6) {
      setError(t('resetPassword.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    setSubmitting(true)

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })

      if (verifyError) {
        if (verifyError.message?.includes('expired')) {
          setError(t('resetPassword.sessionExpired'))
        } else {
          setError(t('resetPassword.updateFailed'))
        }
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        const msg = updateError.message?.toLowerCase() || ''
        if (msg.includes('different') || msg.includes('same as')) {
          setError(t('resetPassword.passwordSame'))
        } else if (msg.includes('rate limit')) {
          setError(t('auth.rateLimit'))
        } else {
          setError(t('resetPassword.updateFailed'))
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 2000)
    } catch {
      setError(t('resetPassword.updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = () => {
    navigate(isRecovery ? '/forgot-password' : '/register')
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            {isRecovery ? <CheckCircle className="w-8 h-8 text-green-500" /> : <MailCheck className="w-8 h-8 text-green-500" />}
          </div>
          <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
            {isRecovery ? t('resetPassword.success') : t('confirmWait.success')}
          </h1>
          <p className="text-theme-secondary">
            {isRecovery ? t('resetPassword.successDesc') : t('confirmWait.successDesc')}
          </p>
        </div>
      </div>
    )
  }

  // 重置密码流程
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-tertiary flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-theme-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-2">
              {t('resetPassword.title')}
            </h1>
            <p className="text-theme-secondary">
              {t('resetPassword.description')}
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-theme-secondary">
                {t('resetPassword.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-theme-tertiary border border-theme-color rounded-xl text-theme-on-surface placeholder-theme-secondary focus:outline-none focus:border-primary transition-colors"
                  placeholder={t('resetPassword.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-theme-secondary">
                {t('resetPassword.confirmPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-on-surface placeholder-theme-secondary focus:outline-none focus:border-primary transition-colors"
                placeholder={t('resetPassword.passwordPlaceholder')}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('resetPassword.updating')}
                </>
              ) : (
                t('resetPassword.updateButton')
              )}
            </button>
          </form>

          <button
            onClick={handleResend}
            className="mt-6 w-full py-3 bg-theme-tertiary text-theme-on-surface font-medium rounded-xl hover:bg-theme-hover transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('resetPassword.requestNewLink')}
          </button>

          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('confirmWait.backHome')}
          </button>
        </div>
      </div>
    )
  }

  // 邮箱确认流程
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-tertiary flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-theme-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
          {t('confirmWait.title')}
        </h1>

        {error ? (
          <div className="mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={handleResend}
              className="w-full py-3 mb-3 bg-theme-tertiary text-theme-on-surface font-medium rounded-xl hover:bg-theme-hover transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t('confirmWait.resend')}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConfirmEmail}
            disabled={verifying}
            className="w-full py-3 mb-4 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('confirmWait.verifying')}
              </>
            ) : (
              t('confirmWait.confirmButton')
            )}
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-6 inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('confirmWait.backHome')}
        </button>
      </div>
    </div>
  )
}
