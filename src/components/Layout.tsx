
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import HeroCanvas from './HeroCanvas'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { pathname, state } = useLocation()

  // 路由切换时强制滚动回顶部（修复进入博客页仍停留在底部的问题）
  useEffect(() => {
    // 若本次跳转来自导航栏“回到欢迎页并滚动到某区块”，跳过置顶交给 Home 处理
    const stateAny = state as { scrollTo?: string } | null
    if (stateAny?.scrollTo) return

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    const resetScroll = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    resetScroll()
    requestAnimationFrame(resetScroll)
    setTimeout(resetScroll, 100)
    setTimeout(resetScroll, 300)
  }, [pathname, state])

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <HeroCanvas />
      </div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-theme-primary/40 via-transparent to-theme-primary/80" />
      <Navbar />
      <main className="relative z-10 pt-16 lg:pt-20 animate-fade-in">
        {children}
      </main>
      <Footer />
    </div>
  )
}