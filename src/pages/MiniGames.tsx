import { useI18n } from '@/context/I18nContext'

export default function MiniGames() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-theme-primary mb-4">
            {t('miniGames.title')}
          </h1>
          <p className="text-theme-secondary text-lg">
            {t('miniGames.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 预留卡片位置 - 后续开发 */}
          <div className="bg-theme-card rounded-2xl border border-theme-color p-6 hover:border-primary/50 transition-colors">
            <div className="w-full aspect-video bg-theme-tertiary rounded-lg mb-4 flex items-center justify-center">
              <span className="text-theme-secondary text-sm">{t('miniGames.comingSoon')}</span>
            </div>
            <h3 className="text-xl font-semibold text-theme-primary mb-2">
              {t('miniGames.comingSoonTitle')}
            </h3>
            <p className="text-theme-secondary text-sm">
              {t('miniGames.comingSoonDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
