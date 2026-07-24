
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import HeroCanvas from './HeroCanvas'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {

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