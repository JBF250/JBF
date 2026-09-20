import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Info, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import works from '@/data/works.json'
import { useResetScroll } from '@/hooks/useResetScroll'
import { recordDownload } from '@/lib/downloads'

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const currentLang = lang

  useResetScroll()

  const software = works.software.find((s) => s.id === id)

  const [iconFailed, setIconFailed] = useState(false)

  useEffect(() => {
    setIconFailed(false)
  }, [id])

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

  const downloads = software.downloads ?? []

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

          {/* 软件概览：图标 + 名称 + 简介 + 下载 */}
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {software.thumbnail && !iconFailed ? (
                <img
                  src={`/${software.thumbnail}`}
                  alt={software.title[currentLang]}
                  onError={() => setIconFailed(true)}
                  className="w-24 h-24 rounded-2xl object-contain shrink-0 bg-dark-700 border border-dark-600 p-1"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center shrink-0">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-3">
                  {software.title[currentLang]}
                </h1>
                <p className="text-gray-400 leading-relaxed mb-5">
                  {software.description[currentLang]}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
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
            </div>

            {downloads.length > 0 && (
              <div className="mt-8 pt-8 border-t border-dark-600">
                <h2 className="font-display font-bold text-2xl text-white mb-5 text-center sm:text-left">
                  {t('detail.download')}
                </h2>
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                  {downloads.map((item) => (
                    <a
                      key={item.arch}
                      href={item.url}
                      onClick={() => recordDownload(software.id, item.arch)}
                      className="inline-flex items-center justify-center gap-2 min-w-[210px] px-6 py-3.5 text-sm font-medium rounded-xl bg-gradient-primary btn-primary-text transition-all hover:opacity-90 hover:scale-105"
                    >
                      <Download className="w-4 h-4" />
                      {t('detail.downloadFor', { label: item.label })}
                    </a>
                  ))}
                </div>

                <div className="mt-5 flex flex-col items-center sm:items-start gap-2">
                  <span className="inline-flex items-center gap-2 text-gray-500 text-xs">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    {software.requirements?.[currentLang] ?? t('detail.requirements')}
                  </span>
                  {software.privacyUrl && (
                    <a
                      href={software.privacyUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-2 text-gray-500 hover:text-primary text-xs underline underline-offset-4 decoration-gray-600 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      {t('detail.privacyPolicy')}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-600">
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
