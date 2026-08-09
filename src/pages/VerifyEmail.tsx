import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/context/I18nContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    const verify = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'signup'

      if (!token_hash) {
        setStatus('error')
        setErrorMsg(t('verify.missingToken'))
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        })

        if (error) {
          console.error('Verify OTP error:', error)
          setStatus('error')
          if (error.message?.includes('expired') || error.message?.includes('Token has expired')) {
            setErrorMsg(t('verify.expired'))
          } else {
            setErrorMsg(t('verify.failed'))
          }
          return
        }

        setStatus('success')
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          navigate('/login?verified=1', { replace: true })
        }, 2000)
      } catch (err: any) {
        console.error('Verify error:', err)
        setStatus('error')
        setErrorMsg(t('verify.failed'))
      }
    }

    verify()
  }, [searchParams, navigate, t])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-tertiary flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
              {t('verify.verifying')}
            </h1>
            <p className="text-theme-secondary">
              {t('verify.verifyingDesc')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
              {t('verify.success')}
            </h1>
            <p className="text-theme-secondary">
              {t('verify.successDesc')}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-4">
              {t('verify.failedTitle')}
            </h1>
            <p className="text-theme-secondary mb-8">
              {errorMsg}
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-theme-tertiary text-theme-primary rounded-xl hover:bg-theme-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('verify.backToLogin')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
