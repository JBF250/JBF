import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import Turnstile, { type TurnstileHandle } from '@/components/Turnstile'

// 限流配置
const IP_LIMIT_WINDOW = 5 * 60 * 1000 // 5分钟
const IP_LIMIT_MAX = 3 // 最多3次
const EMAIL_LIMIT_WINDOW = 10 * 60 * 1000 // 10分钟
const EMAIL_LIMIT_MAX = 1 // 最多1次

// 存储限流数据的 Map
const ipRequestMap = new Map<string, number[]>()
const emailRequestMap = new Map<string, number[]>()

// 获取或创建IP标识（使用 localStorage 中的随机ID）
const getClientId = () => {
  let clientId = localStorage.getItem('client_id')
  if (!clientId) {
    clientId = Math.random().toString(36).substring(2, 15)
    localStorage.setItem('client_id', clientId)
  }
  return clientId
}

// 检查限流
const checkRateLimit = (email: string, t: (key: string, params?: Record<string, string>) => string): { allowed: boolean; message?: string } => {
  const now = Date.now()
  const clientId = getClientId()

  // 检查IP限制
  const ipTimestamps = ipRequestMap.get(clientId) || []
  const recentIpRequests = ipTimestamps.filter(t => now - t < IP_LIMIT_WINDOW)
  if (recentIpRequests.length >= IP_LIMIT_MAX) {
    const waitMinutes = Math.ceil((IP_LIMIT_WINDOW - (now - recentIpRequests[0])) / 60000)
    return {
      allowed: false,
      message: t('forgotPassword.rateLimitWait', { minutes: String(waitMinutes) })
    }
  }

  // 检查邮箱限制
  const emailTimestamps = emailRequestMap.get(email) || []
  const recentEmailRequests = emailTimestamps.filter(t => now - t < EMAIL_LIMIT_WINDOW)
  if (recentEmailRequests.length >= EMAIL_LIMIT_MAX) {
    const waitMinutes = Math.ceil((EMAIL_LIMIT_WINDOW - (now - recentEmailRequests[0])) / 60000)
    return {
      allowed: false,
      message: t('forgotPassword.emailRateLimit', { minutes: String(waitMinutes) })
    }
  }

  return { allowed: true }
}

// 记录请求
const recordRequest = (email: string) => {
  const now = Date.now()
  const clientId = getClientId()

  const ipTimestamps = ipRequestMap.get(clientId) || []
  ipTimestamps.push(now)
  ipRequestMap.set(clientId, ipTimestamps)

  const emailTimestamps = emailRequestMap.get(email) || []
  emailTimestamps.push(now)
  emailRequestMap.set(email, emailTimestamps)
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { resetPassword } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const turnstileRef = useRef<TurnstileHandle>(null)

  const doReset = async (token: string) => {
    setLoading(true)
    setError('')

    try {
      // 记录请求（仅在通过人机验证后实际发送时）
      recordRequest(email)

      // 无论邮箱是否存在，都显示成功信息（防止邮箱枚举攻击）
      await resetPassword(email, token)
      setSuccess(true)
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } catch (err: any) {
      const code = err?.message || ''
      if (code === 'TURNSTILE_FAILED' || code === 'TURNSTILE_NOT_CONFIGURED') {
        setError(t('auth.turnstileFailed'))
        turnstileRef.current?.reset()
        setTurnstileToken('')
      } else {
        // 其它错误同样显示成功，防止邮箱枚举
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 基本格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('forgotPassword.invalidEmail'))
      return
    }

    // 检查限流
    const rateLimitCheck = checkRateLimit(email, t)
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.message || '')
      return
    }

    if (!turnstileToken) {
      setError(t('auth.turnstileRequired'))
      return
    }

    setError('')
    doReset(turnstileToken)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            {t('forgotPassword.emailSent')}
          </h1>
          <p className="text-gray-400 mb-8">
            {t('forgotPassword.emailSentDesc')}
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {t('auth.login')}
          </Link>
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
            {t('forgotPassword.title')}
          </h1>
          <p className="text-gray-500">
            {t('forgotPassword.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('forgotPassword.emailLabel')}
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

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <Turnstile
            ref={turnstileRef}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => {
              setLoading(false)
              setTurnstileToken('')
              setError(t('auth.turnstileFailed'))
            }}
            onExpired={() => {
              setLoading(false)
              setTurnstileToken('')
              setError(t('auth.turnstileFailed'))
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="text-primary hover:underline text-sm"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
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