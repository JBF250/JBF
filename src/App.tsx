import React, { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { I18nProvider, useI18n, type Language } from '@/context/I18nContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Blog from '@/pages/Blog'
import BlogDetail from '@/pages/BlogDetail'
import GameDetail from '@/pages/GameDetail'
import SoftwareDetail from '@/pages/SoftwareDetail'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

// 当用户切换（登录/退出）时，将该账户保存的语言和主题配置同步应用
function ConfigSync() {
  const { user } = useAuth()
  const { setLang, lang: currentLang } = useI18n()
  const { setThemeMode, themeMode: currentTheme } = useTheme()
  const lastSyncedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      lastSyncedUserId.current = null
      return
    }
    // 只在用户身份切换时同步一次配置，避免每次 user 状态更新都覆盖用户当前的设置
    if (lastSyncedUserId.current === user.id) return
    lastSyncedUserId.current = user.id

    // 同步语言
    if (user.language && ['zh', 'en', 'ja'].includes(user.language)) {
      const targetLang = user.language as Language
      if (targetLang !== currentLang) {
        setLang(targetLang)
      }
    }
    // 同步主题（theme_color === '#ffffff' 表示浅色模式，否则深色）
    const targetTheme = user.theme_color === '#ffffff' ? 'light' : 'dark'
    if (targetTheme !== currentTheme) {
      setThemeMode(targetTheme)
    }
  }, [user, setLang, setThemeMode, currentLang, currentTheme])

  return null
}

function AppContent() {
  const { user } = useAuth()
  const savedLang = localStorage.getItem('language') as 'zh' | 'en' | 'ja' | null
  const savedTheme = localStorage.getItem('themeMode') as 'dark' | 'light' | null

  return (
    <ThemeProvider initialMode={savedTheme || 'dark'}>
      <I18nProvider initialLang={savedLang || 'zh'}>
        <ConfigSync />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:type/:id" element={<BlogDetail />} />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/software/:id" element={<SoftwareDetail />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}