import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, MailCheck, Send } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { register, resendVerification } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmail'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    setLoading(true)

    try {
      await register(email, password)
      setEmailSent(true)
    } catch (err: any) {
      // 处理重复邮箱错误
      if (err?.message === 'EMAIL_ALREADY_REGISTERED' ||
          err?.message?.includes('already been registered') || 
          err?.message?.includes('already exists') ||
          err?.message?.includes('already in use')) {
        setError(t('auth.emailAlreadyRegistered'))
      } else {
        setError(err?.message || t('auth.registerFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setResendMessage('')
    try {
      await resendVerification(email)
      setResendMessage(t('auth.resendSuccess'))
    } catch (err: any) {
      setResendMessage(err?.message || t('auth.resendFailed'))
    } finally {
      setResending(false)
    }
  }

  // 验证邮件已发送的提示页面
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-primary/20 flex items-center justify-center">
            <MailCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-3">
            {t('auth.verifyEmailTitle')}
          </h1>
          <p className="text-gray-400 mb-2">
            {t('auth.verifyEmailSent')}
          </p>
          <p className="text-primary font-medium mb-8 break-all">
            {email}
          </p>
          <div className="bg-dark-800/50 border border-dark-600 rounded-xl p-4 mb-6 text-left">
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('auth.verifyEmailTips')}
            </p>
          </div>

          {resendMessage && (
            <p className={`text-sm mb-4 ${resendMessage.includes('失败') || resendMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
              {resendMessage}
            </p>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-3 mb-3 bg-dark-800 border border-dark-600 text-white font-medium rounded-xl hover:bg-dark-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {resending ? t('auth.sending') : t('auth.resend')}
          </button>

          <Link
            to="/login"
            className="block w-full py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {t('auth.goLogin')}
          </Link>

          <button
            onClick={() => navigate('/')}
            className="mt-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backHome')}
          </button>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold">J</span>
            </div>
            <span className="font-display font-bold text-2xl text-white">JBF250</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            {t('auth.register')}
          </h1>
          <p className="text-gray-500">
            {t('auth.noAccount')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                placeholder={t('auth.password')}
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
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                placeholder={t('auth.confirmPassword')}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            {t('auth.hasAccount')}
            <Link 
              to="/login" 
              className="text-primary hover:underline ml-1"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
