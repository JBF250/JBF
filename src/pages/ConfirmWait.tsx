import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, XCircle, Loader2, Send, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/context/I18nContext'

export default function ConfirmWait() {
  const [searchParams] = useSearchParams()
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { t } = useI18n()

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') || 'signup'

  // 用户手动点击按钮才执行验证
  const handleConfirm = async () => {
    if (!token_hash) {
      setError(t('confirmWait.missingToken'))
      return
    }

    setVerifying(true)
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('Verify OTP error:', error)
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
    } catch (err: any) {
      console.error('Verify error:', err)
      setError(t('confirmWait.failed'))
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = () => {
    if (type === 'recovery') {
      navigate('/forgot-password')
    } else {
      navigate('/register')
    }
  }

  if (success) {
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
              className="w-full py-3 mb-3 bg-theme-tertiary text-theme-primary font-medium rounded-xl hover:bg-theme-hover transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t('confirmWait.resend')}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConfirm}
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
