import { useI18n } from '@/context/I18nContext'
import { useNavigate } from 'react-router-dom'
import AccordionGallery from '@/components/AccordionGallery'
import { QrCode, Image, Grid3x3, Keyboard, Timer, Rocket, FileImage, Music, ScanText, Mic, type LucideIcon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface LabItem {
  id: string
  path: string
  icon: LucideIcon
  titleKey: string
  descKey: string
}

const tools: LabItem[] = [
  { id: 'qrcode', path: '/lab/qrcode', icon: QrCode, titleKey: 'lab.tools.qrcode.title', descKey: 'lab.tools.qrcode.desc' },
  { id: 'converter', path: '/lab/converter', icon: Image, titleKey: 'lab.tools.converter.title', descKey: 'lab.tools.converter.desc' },
  { id: 'gif-tool', path: '/lab/gif-tool', icon: Grid3x3, titleKey: 'lab.tools.gifTool.title', descKey: 'lab.tools.gifTool.desc' },
  { id: 'key-viewer', path: '/lab/key-viewer', icon: Keyboard, titleKey: 'lab.tools.keyViewer.title', descKey: 'lab.tools.keyViewer.desc' },
  { id: 'ico-converter', path: '/lab/ico-converter', icon: FileImage, titleKey: 'lab.tools.icoConverter.title', descKey: 'lab.tools.icoConverter.desc' },
  { id: 'audio-metadata', path: '/lab/audio-metadata', icon: Music, titleKey: 'lab.tools.audioMetadata.title', descKey: 'lab.tools.audioMetadata.desc' },
  { id: 'image-text', path: '/lab/image-text', icon: ScanText, titleKey: 'lab.tools.imageText.title', descKey: 'lab.tools.imageText.desc' },
  { id: 'recorder', path: '/lab/recorder', icon: Mic, titleKey: 'lab.tools.recorder.title', descKey: 'lab.tools.recorder.desc' },
]

const games: LabItem[] = [
  { id: '2048', path: '/lab/game/2048', icon: Grid3x3, titleKey: 'lab.games.game2048.title', descKey: 'lab.games.game2048.desc' },
  { id: 'reaction', path: '/lab/game/reaction', icon: Timer, titleKey: 'lab.games.reaction.title', descKey: 'lab.games.reaction.desc' },
  { id: '3d-runner', path: '/lab/game/3d-runner', icon: Rocket, titleKey: 'lab.games.runner3d.title', descKey: 'lab.games.runner3d.desc' },
]

export default function LabHome() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)
  const [phase, setPhase] = useState<'loading' | 'visible' | 'exiting'>('loading')
  const exitTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('visible'), 500)
    return () => {
      clearTimeout(t1)
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  const handleSelect = (path: string) => {
    if (phase === 'exiting') return
    setPhase('exiting')
    exitTimerRef.current = window.setTimeout(() => {
      navigate(path)
    }, 400)
  }

  const toolItems = tools.map((tool) => ({
    icon: <tool.icon />,
    label: t(tool.titleKey),
    subtitle: t(tool.descKey),
    path: tool.path,
  }))

  const gameItems = games.map((game) => ({
    icon: <game.icon />,
    label: t(game.titleKey),
    subtitle: t(game.descKey),
    path: game.path,
  }))

  const accordionCommon = {
    trigger: 'hover',
    accentColor: 'var(--accent-cyan)',
    overlayColor: '#060010',
    textColor: 'var(--text-on-surface)',
    showLabels: true,
    grayscale: false,
    duration: 0.6,
    ease: 'power3.out',
    parallax: 0.4,
    tilt: 6,
    stagger: 0.04,
    gap: 10,
    radius: 14,
    orientation: 'horizontal',
  } as const

  return (
    <div className="min-h-screen py-8 sm:py-16 px-4">
      {/* Loading overlay */}
      {phase === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-theme-secondary text-sm">{t('lab.loading')}</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-7xl mx-auto space-y-8 sm:space-y-12 transition-opacity duration-500 ${
          phase === 'visible' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Hero Section */}
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-theme-primary mb-3 sm:mb-4">
            {t('lab.title')}
          </h1>
          <p className="text-theme-secondary text-base sm:text-lg max-w-2xl mx-auto">
            {t('lab.subtitle')}
          </p>
        </div>

        {/* Online Tools */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-theme-on-surface mb-4">
            {t('lab.toolsSection')}
          </h2>
          <AccordionGallery
            {...accordionCommon}
            items={toolItems}
            expandRatio={0.45}
            height={300}
            onSelect={(item) => handleSelect(item.path as string)}
          />
        </section>

        {/* Mini Games (desktop only) */}
        {isMobile ? (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-theme-on-surface mb-4">
              {t('lab.gamesSection')}
            </h2>
            <div className="bg-theme-card rounded-2xl border border-theme-color p-8 text-center">
              <Rocket className="w-12 h-12 mx-auto mb-4 text-theme-secondary opacity-40" />
              <p className="text-theme-on-surface font-medium text-lg mb-2">
                {t('lab.mobileGamesNotice')}
              </p>
              <p className="text-theme-secondary text-sm">
                {t('lab.mobileGamesNoticeHint')}
              </p>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-theme-on-surface mb-4">
              {t('lab.gamesSection')}
            </h2>
            <AccordionGallery
              {...accordionCommon}
              items={gameItems}
              expandRatio={0.5}
              height={300}
              onSelect={(item) => handleSelect(item.path as string)}
            />
          </section>
        )}
      </div>
    </div>
  )
}
