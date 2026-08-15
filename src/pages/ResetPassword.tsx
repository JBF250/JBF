import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const { updatePassword } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResetPassword = async () => {
      try {
        // 手动解析 URL hash 中的参数（不用 useSearchParams，因为 token 在 hash 中）
        const hash = window.location.hash
        console.log('Reset password - URL hash:', hash)

        if (!hash || hash === '#') {
          setSessionError(t('resetPassword.invalidResetLink'))
          setLoading(false)
          return
        }

        // 解析 hash 参数，格式可能是 #access_token=xxx&refresh_token=xxx&type=recovery
        const hashStr = hash.startsWith('#') ? hash.substring(1) : hash
        const params = new URLSearchParams(hashStr)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const tokenType = params.get('type')

        console.log('Reset password - parsed params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          tokenType 
        })

        if (!accessToken) {
          setSessionError(t('resetPassword.missingAccessToken'))
          setLoading(false)
          return
        }

        // 使用 setSession 设置会话
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (error) {
          console.error('Set session error:', error)
          setSessionError(t('resetPassword.sessionExpired'))
        } else {
          // 成功设置会话，清除 URL 中的 hash
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch (err: any) {
        console.error('Reset password error:', err)
        setSessionError(t('resetPassword.sessionError'))
      } finally {
        setLoading(false)
      }
    }

    handleResetPassword()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      await updatePassword(password)
      setSuccess(true)
      // 延迟跳转到首页
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err: any) {
      const errMsg = err?.message?.toLowerCase() || ''
      if (errMsg.includes('different') || errMsg.includes('same as')) {
        setError(t('resetPassword.passwordSame'))
      } else if (errMsg.includes('rate limit')) {
        setError(t('auth.rateLimit'))
      } else {
        setError(t('resetPassword.updateFailed'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            {t('resetPassword.linkExpired')}
          </h1>
          <p className="text-gray-400 mb-8">
            {sessionError}
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {t('resetPassword.requestNewLink')}
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            {t('resetPassword.success')}
          </h1>
          <p className="text-gray-400">
            {t('resetPassword.successDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 mb-4 group"
          >
            <span className="font-display font-bold text-2xl text-white">JBF个人站</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            {t('resetPassword.title')}
          </h1>
          <p className="text-gray-500">
            {t('resetPassword.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('resetPassword.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                placeholder={t('resetPassword.passwordPlaceholder')}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('resetPassword.confirmPassword')}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
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
            className="w-full py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? t('resetPassword.updating') : t('resetPassword.updateButton')}
          </button>
        </form>

        <div className="mt-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('forgotPassword.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  )
}
