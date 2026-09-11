import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import certificates from '@/data/certificates.json'
import TiltedCard from '@/components/TiltedCard'

interface Certificate {
  id: string
  date: string
  image: string
  title: { zh: string; en: string; ja: string }
  description: { zh: string; en: string; ja: string }
}

export default function CertificateTimeline() {
  const { t, lang } = useI18n()
  const [active, setActive] = useState<Certificate | null>(null)
  const list = certificates.certificates as Certificate[]

  // 打开证书详情时，复用顶部栏“关于”的跳转逻辑跳回证书所在区块，并立即显示详情图。
  const openCert = (cert: Certificate) => {
    const about = document.querySelector('#about')
    if (about) about.scrollIntoView({ behavior: 'smooth' })
    setActive(cert)
  }

  return (
    <div className="mt-24">
      {/* 区块标题 */}
      <div className="text-center mb-20">
        <h3 className="font-display font-bold text-3xl md:text-4xl text-theme-primary mb-3">
          {t('about.certificates')}
        </h3>
        <p className="text-theme-secondary">{t('about.certificatesDesc')}</p>
      </div>

      {/* 时间轴 */}
      <div className="relative max-w-5xl mx-auto px-4">
        {/* 横向基线：从节点中央穿过 */}
        <div className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <div className="flex flex-wrap justify-center gap-x-16 relative">
          {list.map((cert) => (
            <div key={cert.id} className="flex flex-col items-center w-[300px]">
              {/* 证书卡片：漂浮在线上方 */}
              <div className="flex items-end h-[250px] w-full justify-center">
                <div
                  onClick={() => openCert(cert)}
                  className="cert-card float-animate cursor-pointer"
                >
                  <TiltedCard
                    imageSrc={cert.image}
                    altText={cert.title[lang]}
                    captionText={cert.title[lang]}
                    containerHeight="250px"
                    containerWidth="300px"
                    imageHeight="250px"
                    imageWidth="300px"
                    rotateAmplitude={12}
                    scaleOnHover={1.05}
                    showMobileWarning={false}
                    showTooltip={false}
                  />
                </div>
              </div>

              {/* 节点：位于横线上，被线穿过 */}
              <div className="relative z-10 w-5 h-5 rounded-full bg-cyan-300 border-4 border-theme-card shadow-[0_0_16px_rgba(34,211,238,0.8)] -mt-[2px]" />

              {/* 节点下方说明 */}
              <div className="pt-8 h-[250px] w-full text-center">
                <div className="flex items-center justify-center gap-1.5 text-theme-secondary text-xs mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{cert.date}</span>
                </div>
                <h4 className="font-display font-bold text-lg text-theme-primary">
                  {cert.title[lang]}
                </h4>
                <p className="text-theme-secondary text-sm mt-1 leading-relaxed">
                  {cert.description[lang]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 点击放大的弹窗：挂载到 body，铺满当前全屏并居中展示 */}
      {active &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActive(null)}
          >
            <div
              className="relative flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActive(null)}
                className="absolute -top-12 right-0 p-2 text-theme-secondary hover:text-white transition-colors"
                aria-label="close"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="cert-card">
                <TiltedCard
                  imageSrc={active.image}
                  altText={active.title[lang]}
                  captionText={active.title[lang]}
                  containerHeight="420px"
                  containerWidth="560px"
                  imageHeight="420px"
                  imageWidth="560px"
                  rotateAmplitude={14}
                  scaleOnHover={1.04}
                  showMobileWarning={false}
                />
              </div>
              <div className="mt-6 text-center">
                <h4 className="font-display font-bold text-2xl text-theme-primary mb-1">
                  {active.title[lang]}
                </h4>
                <p className="text-theme-secondary">{active.description[lang]}</p>
                <p className="text-theme-secondary text-sm mt-2">{active.date}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}