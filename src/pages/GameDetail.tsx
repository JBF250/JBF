import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import works from '@/data/works.json'
import { useResetScroll } from '@/hooks/useResetScroll'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const currentLang = lang
  
  useResetScroll()

  const game = works.games.find((g) => g.id === id)

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
    const isZhaoZha = game.id === 'game-2'
    return text.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return null
      
      const parts = paragraph.split(/\[([^\]]+)\]\(([^)]+)\)/g)
      const elements = parts.map((part, pIndex) => {
        if (pIndex % 3 === 1) {
          const url = parts[pIndex + 1]
          return (
            <a
              key={pIndex}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {part}
            </a>
          )
        }
        if (pIndex % 3 === 2) return null
        return part
      })
      
      return (
        <p key={index} className={`text-gray-400 mb-4 leading-relaxed ${isZhaoZha ? 'font-bold' : ''}`}>
          {elements}
        </p>
      )
    })
  }

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

          <div className="relative rounded-2xl overflow-hidden mb-8 glow-primary">
            <img
              src={`/${game.thumbnail}`}
              alt={game.title[currentLang]}
              className="w-full h-80 md:h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/60 to-transparent" />
          </div>

          <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
            <h2 className="font-display font-bold text-2xl text-white mb-6">
              {t('detail.aboutGame')}
            </h2>
            <div className="prose prose-invert max-w-none">
              {formatDescription(game.fullDescription[currentLang])}
            </div>
          </div>

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