import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import works from '@/data/works.json'
import { useResetScroll } from '@/hooks/useResetScroll'
import TiltedCard from '@/components/TiltedCard'

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const currentLang = lang
  
  useResetScroll()

  const software = works.software.find((s) => s.id === id)

  if (!software) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">404</h1>
          <p className="text-gray-500 mb-6">{t('detail.back')}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('detail.back')}
          </Link>
        </div>
      </div>
    )
  }

  const formatDescription = (text: string) => {
    return text.split('\n').map((paragraph, index) => (
      <p key={index} className="text-gray-400 mb-4 leading-relaxed">
        {paragraph}
      </p>
    ))
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
              {software.title[currentLang]}
            </h1>
            <div className="flex flex-wrap justify-center gap-3">
              {software.tech.map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 bg-dark-800/50 text-gray-300 text-sm rounded-full border border-dark-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {software.thumbnail && (
            <div className="rounded-2xl overflow-hidden mb-8">
              <TiltedCard
                imageSrc={`/${software.thumbnail}`}
                altText={software.title[currentLang]}
                captionText={software.title[currentLang]}
                containerHeight="340px"
                containerWidth="100%"
                imageHeight="340px"
                imageWidth="100%"
                rotateAmplitude={12}
                scaleOnHover={1.03}
                showMobileWarning={false}
              />
            </div>
          )}

          {!software.thumbnail && (
            <div className="relative rounded-2xl overflow-hidden mb-8 bg-dark-700 h-80 md:h-96 flex items-center justify-center glow-secondary">
              <div className="text-center">
                <div className="w-24 h-24 bg-dark-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
                <p className="text-gray-500">{software.title[currentLang]}</p>
              </div>
            </div>
          )}

          <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
            <h2 className="font-display font-bold text-2xl text-white mb-6">
              {t('detail.aboutSoftware')}
            </h2>
            <div className="prose prose-invert max-w-none">
              {formatDescription(software.fullDescription[currentLang])}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity hover:scale-105"
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