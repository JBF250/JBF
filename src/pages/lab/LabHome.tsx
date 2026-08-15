import { useI18n } from '@/context/I18nContext'
import { Link } from 'react-router-dom'
import { QrCode, Image, Grid3x3, Keyboard, Timer, Rocket, FileImage } from 'lucide-react'
import { useState, useEffect } from 'react'

const tools = [
  {
    id: 'qrcode',
    path: '/lab/qrcode',
    icon: QrCode,
    titleKey: 'lab.tools.qrcode.title',
    descKey: 'lab.tools.qrcode.desc',
  },
  {
    id: 'converter',
    path: '/lab/converter',
    icon: Image,
    titleKey: 'lab.tools.converter.title',
    descKey: 'lab.tools.converter.desc',
  },
  {
    id: 'gif-tool',
    path: '/lab/gif-tool',
    icon: Grid3x3,
    titleKey: 'lab.tools.gifTool.title',
    descKey: 'lab.tools.gifTool.desc',
  },
  {
    id: 'key-viewer',
    path: '/lab/key-viewer',
    icon: Keyboard,
    titleKey: 'lab.tools.keyViewer.title',
    descKey: 'lab.tools.keyViewer.desc',
  },
  {
    id: 'ico-converter',
    path: '/lab/ico-converter',
    icon: FileImage,
    titleKey: 'lab.tools.icoConverter.title',
    descKey: 'lab.tools.icoConverter.desc',
  },
]

const games = [
  {
    id: '2048',
    path: '/lab/game/2048',
    icon: Grid3x3,
    titleKey: 'lab.games.game2048.title',
    descKey: 'lab.games.game2048.desc',
  },
  {
    id: 'reaction',
    path: '/lab/game/reaction',
    icon: Timer,
    titleKey: 'lab.games.reaction.title',
    descKey: 'lab.games.reaction.desc',
  },
  {
    id: '3d-runner',
    path: '/lab/game/3d-runner',
    icon: Rocket,
    titleKey: 'lab.games.runner3d.title',
    descKey: 'lab.games.runner3d.desc',
  },
]

export default function LabHome() {
  const { t } = useI18n()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="min-h-screen py-8 sm:py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-theme-primary mb-3 sm:mb-4">
            {t('lab.title')}
          </h1>
          <p className="text-theme-secondary text-base sm:text-lg max-w-2xl mx-auto">
            {t('lab.subtitle')}
          </p>
        </div>

        {/* Tools Section */}
        <section className="mb-8 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-1 h-5 sm:h-6 bg-gradient-primary rounded" />
            {t('lab.toolsSection')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="group bg-theme-card rounded-2xl border border-theme-color p-4 sm:p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                  <tool.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-theme-on-surface mb-1 sm:mb-2">
                  {t(tool.titleKey)}
                </h3>
                <p className="text-theme-secondary text-xs sm:text-sm">
                  {t(tool.descKey)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Games Section */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-1 h-5 sm:h-6 bg-gradient-primary rounded" />
            {t('lab.gamesSection')}
          </h2>

          {isMobile ? (
            <div className="bg-theme-card rounded-2xl border border-theme-color p-8 sm:p-10 text-center">
              <Rocket className="w-12 h-12 mx-auto mb-4 text-theme-secondary opacity-40" />
              <p className="text-theme-primary font-medium text-lg mb-2">
                {t('lab.mobileGamesNotice')}
              </p>
              <p className="text-theme-secondary text-sm">
                {t('lab.mobileGamesNoticeHint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {games.map((game) => (
                <Link
                  key={game.id}
                  to={game.path}
                  className="group bg-theme-card rounded-2xl border border-theme-color p-4 sm:p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                    <game.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-theme-on-surface mb-1 sm:mb-2">
                    {t(game.titleKey)}
                  </h3>
                  <p className="text-theme-secondary text-xs sm:text-sm">
                    {t(game.descKey)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
