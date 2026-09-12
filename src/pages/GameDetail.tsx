import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Globe, Download, ExternalLink } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import works from '@/data/works.json'
import { useResetScroll } from '@/hooks/useResetScroll'
import TiltedCard from '@/components/TiltedCard'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const currentLang = lang
  
  useResetScroll()

  const game = works.games.find((g) => g.id === id) as
    | ((typeof works.games)[number] & {
        engineUpdates?: { tech: string; from: string; to: string }[]
        links?: { type: string; url: string; code?: string }[]
      })
    | undefined

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">404</h1>
          <p className="text-gray-500 mb-6">{t('detail.back')}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('detail.back')}
          </Link>
        </div>
      </div>
    )
  }

  const formatDescription = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return null
      return (
        <p key={index} className="text-gray-400 mb-4 leading-relaxed">
          {paragraph}
        </p>
      )
    })
  }

  const renderLinkButton = (link: { type: string; url: string; code?: string }) => {
    const baseClass =
      'inline-flex items-center justify-center gap-2 min-w-[220px] px-6 py-3.5 text-sm font-medium rounded-xl transition-all hover:opacity-90 hover:scale-105'
    switch (link.type) {
      case 'official':
        return (
          <a
            key="official"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClass} bg-gradient-primary btn-primary-text`}
          >
            <Globe className="w-4 h-4" />
            {t('detail.visitOfficial')}
          </a>
        )
      case 'download':
        return (
          <a
            key="download"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClass} bg-gradient-primary btn-primary-text`}
          >
            <Download className="w-4 h-4" />
            {t('detail.download')}
          </a>
        )
      case 'bilibili':
        return (
          <a
            key="bilibili"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClass} bg-gradient-primary btn-primary-text`}
          >
            <ExternalLink className="w-4 h-4" />
            {t('detail.watchBilibili')}
          </a>
        )
      default:
        return null
    }
  }

  const hasEngineUpdates = game.engineUpdates && game.engineUpdates.length > 0
  const hasLinks = game.links && game.links.length > 0
  const downloadCode = game.links?.find((l) => l.type === 'download')?.code

  return (
    <div className="min-h-screen">
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('detail.back')}
          </Link>

          <div className="text-center mb-12">
            <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
              {game.title[currentLang]}
            </h1>
            <div className="flex flex-wrap justify-center gap-3">
              {game.tech.map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 bg-dark-800/50 text-gray-300 text-sm rounded-full border border-dark-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden mb-8">
            <TiltedCard
              imageSrc={`/${game.thumbnail}`}
              altText={game.title[currentLang]}
              captionText={game.title[currentLang]}
              containerHeight="340px"
              containerWidth="100%"
              imageHeight="340px"
              imageWidth="100%"
              rotateAmplitude={12}
              scaleOnHover={1.03}
              showMobileWarning={false}
            />
          </div>

          <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
            <h2 className="font-display font-bold text-2xl text-white mb-6">
              {t('detail.aboutGame')}
            </h2>
            <div className="prose prose-invert max-w-none">
              {formatDescription(game.fullDescription[currentLang])}
            </div>
          </div>

          {hasEngineUpdates && (
            <div className="mt-8 bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
              <h2 className="font-display font-bold text-2xl text-white mb-6">
                {t('detail.engineUpdates')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {game.engineUpdates!.map((update) => (
                  <div
                    key={update.tech}
                    className="flex items-center justify-between gap-4 bg-dark-700/50 rounded-xl px-5 py-4 border border-dark-600"
                  >
                    <span className="text-white font-semibold">{update.tech}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400 line-through">{update.from}</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-cyan-400 font-semibold">{update.to}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasLinks && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center items-center gap-4">
                {game.links!.map(renderLinkButton)}
              </div>
              {downloadCode && (
                <span className="text-gray-500 text-xs">{t('detail.downloadCode', { code: downloadCode })}</span>
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('detail.back')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}