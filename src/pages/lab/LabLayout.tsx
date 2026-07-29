import { useI18n } from '@/context/I18nContext'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ReactNode } from 'react'

interface LabLayoutProps {
  children: ReactNode
  title: string
  description?: string
  showPrivacyNotice?: boolean
}

export function LabLayout({ children, title, description, showPrivacyNotice = false }: LabLayoutProps) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen py-8 sm:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back to Lab */}
        <Link
          to="/lab"
          className="inline-flex items-center gap-2 text-theme-secondary hover:text-primary transition-colors mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('lab.backToLab')}</span>
        </Link>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">{title}</h1>
          {description && (
            <p className="text-theme-secondary text-sm sm:text-base">{description}</p>
          )}
        </div>

        {/* Privacy Notice */}
        {showPrivacyNotice && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
            <p className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm">
              {t('lab.privacyNotice')}
            </p>
          </div>
        )}

        {/* Page Content */}
        <div className="bg-theme-card rounded-2xl border border-theme-color p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
