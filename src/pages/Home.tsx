import { useLenis } from '@/hooks/useLenis'
import { Link } from 'react-router-dom'
import { ArrowDown, Github, Mail } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import works from '@/data/works.json'
import { AnimatedSection, AnimatedElement } from '@/components/AnimatedSection'
import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const { t, lang } = useI18n()
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

  const currentLang = lang === 'ja' ? 'en' : lang

  return (
    <div className="relative">
      <section 
        id="hero" 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center"
      >
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${showText && heroVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative z-0">
            <h1 className="font-display font-bold text-7xl md:text-9xl lg:text-[10rem] text-white/90 leading-none">
              <span className="block relative z-0">JBF250</span>
              <br />
              <span className="block relative z-0 text-gradient">概念1</span>
            </h1>
          </div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto animate-fade-in-delay">
          <AnimatedElement delay={500}>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-sm font-medium">{t('hero.tag1')}</span>
              <span className="text-white/50">|</span>
              <span className="text-white text-sm font-medium">{t('hero.tag2')}</span>
              <span className="text-white/50">|</span>
              <span className="text-white text-sm font-medium">{t('hero.tag3')}</span>
            </div>
          </AnimatedElement>
          
          <AnimatedElement delay={800}>
            <p className="text-xl md:text-2xl text-white font-semibold mb-16 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              {t('hero.subtitle')}
            </p>
          </AnimatedElement>
          
          <AnimatedElement delay={1200}>
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
                  className="group bg-theme-card/50 backdrop-blur-sm rounded-3xl overflow-hidden hover:scale-105 transition-all duration-700 cursor-pointer border border-theme-color"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={game.thumbnail} 
                      alt={game.title[currentLang]}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-theme-primary/90 via-theme-primary/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="font-display font-bold text-2xl text-theme-primary mb-2">
                        {game.title[currentLang]}
                      </h3>
                      <p className="text-theme-primary text-sm line-clamp-2 opacity-80">
                        {game.description[currentLang]}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-6">
                      {game.tech.map((tech) => (
                        <span 
                          key={tech}
                          className="px-4 py-1.5 bg-theme-tertiary text-theme-primary text-xs rounded-full border border-theme-color"
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.software.map((software, index) => (
              <AnimatedElement key={software.id} delay={400 + index * 150}>
                <div 
                  className="group bg-theme-card/50 backdrop-blur-sm rounded-3xl overflow-hidden hover:scale-105 transition-all duration-700 cursor-pointer border border-theme-color"
                >
                  <div className="aspect-video relative overflow-hidden bg-theme-tertiary">
                    <img 
                      src={software.thumbnail} 
                      alt={software.title[currentLang]}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-theme-card rounded-2xl flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-theme-secondary">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="M3 9h18"/>
                          <path d="M9 21V9"/>
                        </svg>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-theme-primary/90 via-theme-primary/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="font-display font-bold text-2xl text-theme-primary mb-2">
                        {software.title[currentLang]}
                      </h3>
                      <p className="text-theme-primary text-sm line-clamp-2 opacity-80">
                        {software.description[currentLang]}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-6">
                      {software.tech.map((tech) => (
                        <span 
                          key={tech}
                          className="px-4 py-1.5 bg-theme-card text-theme-primary text-xs rounded-full border border-theme-color"
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
              <a 
                href="https://github.com/JBF250" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-4 p-8 bg-theme-card/50 backdrop-blur-sm rounded-2xl hover:bg-theme-hover transition-all hover:scale-105 border border-theme-color"
              >
                <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Github className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-theme-primary font-semibold text-lg">{t('contact.github')}</h3>
                  <p className="text-theme-secondary text-sm">@JBF250</p>
                </div>
              </a>
            </AnimatedElement>
            
            <AnimatedElement delay={500}>
              <a 
                href="mailto:2686156845@qq.com" 
                className="group flex items-center justify-center gap-4 p-8 bg-theme-card/50 backdrop-blur-sm rounded-2xl hover:bg-theme-hover transition-all hover:scale-105 border border-theme-color"
              >
                <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-theme-primary font-semibold text-lg">QQ邮箱</h3>
                  <p className="text-theme-secondary text-sm">2686156845@qq.com</p>
                </div>
              </a>
            </AnimatedElement>

            <AnimatedElement delay={600}>
              <a 
                href="mailto:jiangbaofeng250@outlook.com" 
                className="group flex items-center justify-center gap-4 p-8 bg-theme-card/50 backdrop-blur-sm rounded-2xl hover:bg-theme-hover transition-all hover:scale-105 border border-theme-color"
              >
                <div className="w-14 h-14 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-7 h-7 text-theme-secondary group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-theme-primary font-semibold text-lg">Outlook邮箱</h3>
                  <p className="text-theme-secondary text-sm">jiangbaofeng250@outlook.com</p>
                </div>
              </a>
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}