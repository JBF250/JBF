import { useLenis } from '@/hooks/useLenis'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDown, Github, Mail } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { useTheme } from '@/context/ThemeContext'
import works from '@/data/works.json'
import { AnimatedSection, AnimatedElement } from '@/components/AnimatedSection'
import CertificateTimeline from '@/components/CertificateTimeline'
import DepthText from '@/components/DepthText'
import TiltedCard from '@/components/TiltedCard'
import BorderGlow from '@/components/BorderGlow'
import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const { t, lang } = useI18n()
  const { themeMode } = useTheme()
  const [heroVisible, setHeroVisible] = useState(true)
  const [showText, setShowText] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  
  useLenis()

  useEffect(() => {
    if (!heroRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setTimeout(() => {
      setShowText(true)
    }, 800)
  }, [])

  // 从其它页面点击导航项跳转：回到欢迎页后自动滚动到对应区块
  const scrollToState = useLocation().state as { scrollTo?: string } | null
  useEffect(() => {
    const target = scrollToState?.scrollTo
    if (typeof target === 'string' && target.startsWith('#')) {
      // 清除路由状态，避免刷新后再次触发
      window.history.replaceState({}, document.title, window.location.pathname)
      const el = document.querySelector(target)
      if (el) {
        const timer = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 450)
        return () => clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentLang = lang
  // 浅色模式用粉色深度色，深色模式保持青色
  const heroDepthColor = themeMode === 'light' ? '#f472b6' : '#22d3ee'

  return (
    <div className="relative">
      <section 
        id="hero" 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center"
      >
        <div className={`relative z-10 text-center px-4 max-w-6xl mx-auto animate-fade-in-delay transition-opacity duration-700 ${showText && heroVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col items-center leading-none">
            <DepthText
              text="JBF250"
              layers={20}
              depth={2}
              tilt={6}
              faceColor="#f8fafc"
              depthColor={heroDepthColor}
              fontSize="clamp(3.5rem, 10vw, 9rem)"
              fontWeight={900}
              orbitSpeed={0.15}
            />
            <DepthText
              text="概念1"
              layers={20}
              depth={2}
              tilt={6}
              faceColor="#f8fafc"
              depthColor={heroDepthColor}
              fontSize="clamp(3rem, 9vw, 8rem)"
              fontWeight={900}
              orbitSpeed={0.15}
            />
          </div>
          
          <AnimatedElement delay={400}>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mt-10 mb-8 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-sm font-medium">{t('hero.tag1')}</span>
              <span className="text-white/50">|</span>
              <span className="text-white text-sm font-medium">{t('hero.tag2')}</span>
              <span className="text-white/50">|</span>
              <span className="text-white text-sm font-medium">{t('hero.tag3')}</span>
            </div>
          </AnimatedElement>
          
          <AnimatedElement delay={700}>
            <p className="text-xl md:text-2xl text-white font-semibold mb-16 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              {t('hero.subtitle')}
            </p>
          </AnimatedElement>
          
          <AnimatedElement delay={1100}>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <a href="#about" className="text-white/80 hover:text-white transition-colors">
                <ArrowDown className="w-8 h-8" />
              </a>
            </div>
          </AnimatedElement>
        </div>
      </section>

      <AnimatedSection id="about" className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <AnimatedElement delay={100}>
                <span className="inline-block text-primary font-medium text-sm tracking-[0.3em] uppercase mb-6">
                  {t('about.title')}
                </span>
              </AnimatedElement>
              <AnimatedElement delay={200}>
                <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-white mt-4 mb-8 leading-tight">
                  {t('about.title')}
                </h2>
              </AnimatedElement>
              <AnimatedElement delay={300}>
                <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                  {t('about.intro')}
                </p>
              </AnimatedElement>
              <AnimatedElement delay={400}>
                <p className="text-gray-500 text-base leading-relaxed">
                  {t('about.description')}
                </p>
              </AnimatedElement>
            </div>
            <AnimatedElement delay={500}>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-theme-card/80 backdrop-blur-sm overflow-hidden glow-primary relative border border-theme-color">
                  <div className="flex items-center gap-2 px-4 py-3 bg-theme-tertiary border-b border-theme-color">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-theme-secondary text-xs ml-2">about.me.js</span>
                  </div>
                  <div className="p-4 font-mono text-sm overflow-auto h-[calc(100%-48px)]">
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      <code>
                        <span className="text-purple-500">const</span>{' '}
                        <span className="text-amber-400">developer</span> = {'{'}
                        {'\n'}  <span className="text-cyan-400">name</span>:{' '}
                        <span className="text-green-400">{'`JBF250`'}</span>,{'\n'}  <span className="text-cyan-400">alias</span>:{' '}
                        <span className="text-green-400">{'`概念1`'}</span>,{'\n'}  <span className="text-cyan-400">role</span>:{' '}
                        <span className="text-green-400">{'`Game Dev`'}</span>,{'\n'}  <span className="text-cyan-400">skills</span>:{' '}
                        <span className="text-purple-500">[</span>
                        <span className="text-green-400">{'`RPGMaker`'}</span>,{'\n    '}
                        <span className="text-green-400">{'`Godot`'}</span>,{'\n    '}
                        <span className="text-green-400">{'`React`'}</span>
                        <span className="text-purple-500">]</span>,{'\n'}  <span className="text-cyan-400">passion</span>:{' '}
                        <span className="text-green-400">{'`Creating meaningful products`'}</span>
                        {'\n'}{'}'};{'\n\n'}
                        <span className="text-purple-500">export default</span>{' '}
                        <span className="text-amber-400">developer</span>;
                      </code>
                    </pre>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-gradient-primary rounded-full blur-3xl opacity-20" />
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full blur-3xl opacity-15" />
              </div>
            </AnimatedElement>
          </div>
        </div>

        {/* 任务5：证书展示时间轴 */}
        <CertificateTimeline />
      </AnimatedSection>

      <AnimatedSection id="games" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <AnimatedElement delay={100}>
              <span className="inline-block text-primary font-medium text-sm tracking-[0.3em] uppercase mb-6">
                {t('games.title')}
              </span>
            </AnimatedElement>
            <AnimatedElement delay={200}>
              <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-theme-primary mt-4 mb-4">
                {t('games.title')}
              </h2>
            </AnimatedElement>
            <AnimatedElement delay={300}>
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto">
                {t('games.subtitle')}
              </p>
            </AnimatedElement>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.games.map((game, index) => (
              <AnimatedElement key={game.id} delay={400 + index * 150}>
                <div 
                  className="group card-glass rounded-3xl overflow-hidden hover:scale-105 transition-all duration-700 cursor-pointer"
                >
                  <TiltedCard
                    imageSrc={`/${game.thumbnail}`}
                    altText={game.title[currentLang]}
                    captionText={game.title[currentLang]}
                    containerHeight="230px"
                    containerWidth="100%"
                    imageHeight="230px"
                    imageWidth="100%"
                    rotateAmplitude={12}
                    scaleOnHover={1.05}
                    showMobileWarning={false}
                  />
                  <div className="p-6">
                    <h3 className="font-display font-bold text-2xl text-theme-primary mb-2 text-center">
                      {game.title[currentLang]}
                    </h3>
                    <p className="text-theme-secondary text-sm line-clamp-2 opacity-80 mb-6 text-center">
                      {game.description[currentLang]}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6 justify-center">
                      {game.tech.map((tech) => (
                        <span 
                          key={tech}
                          className="px-4 py-1.5 bg-theme-tertiary text-theme-on-surface text-xs rounded-full border border-theme-color"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <Link 
                      to={`/game/${game.id}`}
                      className="block w-full py-3 text-center bg-gradient-primary btn-primary-text text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {t('detail.overview')}
                    </Link>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="software" className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <AnimatedElement delay={100}>
              <span className="inline-block text-secondary font-medium text-sm tracking-[0.3em] uppercase mb-6">
                {t('software.title')}
              </span>
            </AnimatedElement>
            <AnimatedElement delay={200}>
              <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-theme-primary mt-4 mb-4">
                {t('software.title')}
              </h2>
            </AnimatedElement>
            <AnimatedElement delay={300}>
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto">
                {t('software.subtitle')}
              </p>
            </AnimatedElement>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            {works.software.map((software, index) => (
              <AnimatedElement key={software.id} delay={400 + index * 150} className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.333rem)]">
                <div 
                  className="group card-glass rounded-3xl overflow-hidden hover:scale-105 transition-all duration-700 cursor-pointer"
                >
                  {software.thumbnail ? (
                    <TiltedCard
                      imageSrc={`/${software.thumbnail}`}
                      altText={software.title[currentLang]}
                      captionText={software.title[currentLang]}
                      containerHeight="230px"
                      containerWidth="100%"
                      imageHeight="230px"
                      imageWidth="100%"
                      rotateAmplitude={12}
                      scaleOnHover={1.05}
                      showMobileWarning={false}
                    />
                  ) : (
                    <div className="h-40 bg-theme-tertiary flex items-center justify-center">
                      <div className="w-16 h-16 bg-theme-card rounded-2xl flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-theme-secondary">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="M3 9h18"/>
                          <path d="M9 21V9"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-display font-bold text-2xl text-theme-primary mb-2 text-center">
                      {software.title[currentLang]}
                    </h3>
                    <p className="text-theme-secondary text-sm line-clamp-2 opacity-80 mb-6 text-center">
                      {software.description[currentLang]}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6 justify-center">
                      {software.tech.map((tech) => (
                        <span 
                          key={tech}
                          className="px-4 py-1.5 bg-theme-card text-theme-on-surface text-xs rounded-full border border-theme-color"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <Link 
                      to={`/software/${software.id}`}
                      className="block w-full py-3 text-center bg-gradient-to-r from-secondary to-cyan-400 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {t('detail.overview')}
                    </Link>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="contact" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-primary rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <AnimatedElement delay={100}>
              <span className="inline-block text-primary font-medium text-sm tracking-[0.3em] uppercase mb-6">
                {t('contact.title')}
              </span>
            </AnimatedElement>
            <AnimatedElement delay={200}>
              <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-theme-primary mt-4 mb-4">
                {t('contact.title')}
              </h2>
            </AnimatedElement>
            <AnimatedElement delay={300}>
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto">
                {t('contact.message')}
              </p>
            </AnimatedElement>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <AnimatedElement delay={400}>
              <BorderGlow backgroundColor="var(--bg-card)" glowColor="180 40 70" colors={['#22d3ee','#94a3b8','#a5b4fc']} borderRadius={16} glowRadius={18} glowIntensity={0.9} coneSpread={28}>
                <a 
                  href="https://github.com/JBF250" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-4 p-8 transition-all"
                >
                  <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Github className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-theme-on-surface font-semibold text-lg">{t('contact.github')}</h3>
                    <p className="text-theme-secondary text-sm">@JBF250</p>
                  </div>
                </a>
              </BorderGlow>
            </AnimatedElement>
            
            <AnimatedElement delay={500}>
              <BorderGlow backgroundColor="var(--bg-card)" glowColor="180 40 70" colors={['#22d3ee','#94a3b8','#a5b4fc']} borderRadius={16} glowRadius={18} glowIntensity={0.9} coneSpread={28}>
                <a 
                  href="mailto:2686156845@qq.com" 
                  className="group flex items-center justify-center gap-4 p-8 transition-all"
                >
                  <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-theme-on-surface font-semibold text-lg">{t('contact.qqEmail')}</h3>
                    <p className="text-theme-secondary text-sm">2686156845@qq.com</p>
                  </div>
                </a>
              </BorderGlow>
            </AnimatedElement>

            <AnimatedElement delay={600}>
              <BorderGlow backgroundColor="var(--bg-card)" glowColor="180 40 70" colors={['#22d3ee','#94a3b8','#a5b4fc']} borderRadius={16} glowRadius={18} glowIntensity={0.9} coneSpread={28}>
                <a 
                  href="mailto:jiangbaofeng250@outlook.com" 
                  className="group flex items-center justify-center gap-4 p-8 transition-all"
                >
                  <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-theme-on-surface font-semibold text-lg">{t('contact.outlookEmail')}</h3>
                    <p className="text-theme-secondary text-sm">jiangbaofeng250@outlook.com</p>
                  </div>
                </a>
              </BorderGlow>
            </AnimatedElement>

            <AnimatedElement delay={700}>
              <BorderGlow backgroundColor="var(--bg-card)" glowColor="180 40 70" colors={['#22d3ee','#94a3b8','#a5b4fc']} borderRadius={16} glowRadius={18} glowIntensity={0.9} coneSpread={28}>
                <a 
                  href="https://space.bilibili.com/1016636140?spm_id_from=333.1007.0.0" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-4 p-8 transition-all"
                >
                  <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.32.124-.622.35-.846.226-.226.53-.35.846-.35.32 0 .624.124.85.35L8.32 4.533h7.307l2.267-2.267c.227-.226.53-.35.85-.35.32 0 .624.124.846.35a1.234 1.234 0 0 1 .35.906c0 .32-.124.622-.35.846l-1.127 1.08zM2.4 8.133v9.2c.027 1.027.4 1.907 1.12 2.64.734.734 1.614 1.107 2.64 1.134h11.68c1.027-.027 1.907-.4 2.64-1.134.734-.733 1.107-1.613 1.134-2.64v-9.2c-.027-1.027-.4-1.907-1.134-2.64-.733-.734-1.613-1.107-2.64-1.134H6.16c-1.026.027-1.906.4-2.64 1.134-.733.733-1.107 1.613-1.12 2.64zM8.4 8.8h1.2v1.2H8.4V8.8zm6 0h1.2v1.2h-1.2V8.8zM8.4 11.2h1.2v1.2H8.4v-1.2zm6 0h1.2v1.2h-1.2v-1.2z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-theme-on-surface font-semibold text-lg">{t('contact.bilibili')}</h3>
                    <p className="text-theme-secondary text-sm">1016636140</p>
                  </div>
                </a>
              </BorderGlow>
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}