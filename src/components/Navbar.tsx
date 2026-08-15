import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Menu, X, User, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import Avatar from '@/components/Avatar'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // 用户菜单：isUserMenuOpen 控制动画方向，menuMounted 控制是否挂载（退场动画期间保持挂载）
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [menuMounted, setMenuMounted] = useState(false)
  const menuTimerRef = useRef<number | null>(null)
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    return () => {
      if (menuTimerRef.current !== null) {
        clearTimeout(menuTimerRef.current)
      }
    }
  }, [])

  const openUserMenu = () => {
    if (menuTimerRef.current !== null) {
      clearTimeout(menuTimerRef.current)
      menuTimerRef.current = null
    }
    setMenuMounted(true)
    requestAnimationFrame(() => setIsUserMenuOpen(true))
  }

  const closeUserMenu = () => {
    setIsUserMenuOpen(false)
    if (menuTimerRef.current !== null) clearTimeout(menuTimerRef.current)
    menuTimerRef.current = window.setTimeout(() => {
      setMenuMounted(false)
      menuTimerRef.current = null
    }, 180)
  }

  const toggleUserMenu = () => {
    if (isUserMenuOpen) {
      closeUserMenu()
    } else {
      openUserMenu()
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
    closeUserMenu()
  }

  const navLinks = [
    { id: 'welcome', href: '#hero', label: t('nav.welcome') },
    { id: 'about', href: '#about', label: t('nav.about') },
    { id: 'games', href: '#games', label: t('nav.games') },
    { id: 'software', href: '#software', label: t('nav.software') },
    { id: 'contact', href: '#contact', label: t('nav.contact') },
    { id: 'blog', href: '/blog', label: t('nav.blog') },
    { id: 'lab', href: '/lab', label: t('nav.lab') },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-nav-bg backdrop-blur-xl border-b border-theme-color' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="font-display font-bold text-xl text-theme-primary group-hover:text-gradient transition-all">
              JBF个人站
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <button
                  key={link.id}
                  onClick={() => {
                    if (location.pathname === '/') {
                      const element = document.querySelector(link.href)
                      element?.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      navigate('/')
                    }
                  }}
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-sm font-medium"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.id}
                  to={link.href}
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-sm font-medium"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className="w-10 h-10 rounded-full bg-theme-tertiary flex items-center justify-center hover:bg-theme-hover transition-colors relative overflow-hidden"
                >
                  {user.avatar_url ? (
                    <Avatar
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-10 h-10"
                    />
                  ) : (
                    <User className="w-5 h-5 text-theme-secondary" />
                  )}
                </button>
                
                {menuMounted && (
                  <div className={`absolute right-0 top-full mt-2 w-48 bg-theme-card rounded-xl border border-theme-color shadow-2xl py-2 z-50 ${isUserMenuOpen ? 'dropdown-enter' : 'dropdown-exit'}`}>
                    <div className="px-4 py-2 border-b border-theme-color">
                      <p className="text-sm text-theme-on-surface font-medium">{user.display_name}</p>
                      <p className="text-xs text-theme-tertiary">{user.username}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/settings'); closeUserMenu() }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      {t('settings.title')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-theme-secondary hover:text-red-400 hover:bg-theme-hover transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-sm font-medium"
                >
                  {t('auth.login')}
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-gradient-primary btn-primary-text text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t('auth.register')}
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-theme-secondary hover:text-theme-primary transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-nav-bg backdrop-blur-xl border-t border-theme-color">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <button
                  key={link.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    if (location.pathname === '/') {
                      const element = document.querySelector(link.href)
                      element?.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      navigate('/')
                    }
                  }}
                  className="block w-full text-left text-theme-secondary hover:text-theme-primary transition-colors py-2"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.id}
                  to={link.href}
                  className="block text-theme-secondary hover:text-theme-primary transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            
            {user && (
              <div className="pt-3 border-t border-theme-color space-y-2">
                <button
                  onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 text-theme-secondary hover:text-theme-primary transition-colors py-2"
                >
                  <Settings className="w-4 h-4" />
                  {t('settings.title')}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-theme-secondary hover:text-red-400 transition-colors py-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
                </button>
              </div>
            )}
            
            {!user && (
              <div className="pt-3 border-t border-theme-color space-y-2">
                <Link 
                  to="/login" 
                  className="block text-theme-secondary hover:text-theme-primary transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('auth.login')}
                </Link>
                <Link 
                  to="/register" 
                  className="block px-4 py-2 bg-gradient-primary btn-primary-text text-center rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('auth.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}