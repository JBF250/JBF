import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, initialMode }: { children: ReactNode; initialMode?: ThemeMode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode || 'dark')

  useEffect(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode | null
    if (saved) {
      setThemeModeState(saved)
    }
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('themeMode', mode)
  }

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      document.documentElement.style.setProperty('--bg-primary', '#0a0a0f')
      document.documentElement.style.setProperty('--bg-secondary', '#12121a')
      document.documentElement.style.setProperty('--bg-tertiary', '#1a1a25')
      document.documentElement.style.setProperty('--bg-card', '#1a1a25')
      document.documentElement.style.setProperty('--bg-hover', '#252530')
      document.documentElement.style.setProperty('--text-primary', '#ffffff')
      document.documentElement.style.setProperty('--text-secondary', '#b0b0b8')
      document.documentElement.style.setProperty('--text-tertiary', '#8a8a93')
      document.documentElement.style.setProperty('--text-on-surface', '#ffffff')
      document.documentElement.style.setProperty('--border-color', '#27272a')
      document.documentElement.style.setProperty('--nav-bg', 'rgba(10, 10, 15, 0.9)')
      document.documentElement.style.setProperty('--bg-settings', '#14141c')
      document.documentElement.style.setProperty('--btn-primary', 'linear-gradient(135deg, #8b5cf6, #06b6d4)')
      document.documentElement.style.setProperty('--btn-primary-text', '#ffffff')
      document.documentElement.style.setProperty('--accent-pink', '#f472b6')
      document.documentElement.style.setProperty('--accent-cyan', '#06b6d4')
      document.documentElement.style.setProperty('--accent-purple', '#8b5cf6')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.style.setProperty('--bg-primary', '#0a0a0f')
      document.documentElement.style.setProperty('--bg-secondary', '#ffffff')
      document.documentElement.style.setProperty('--bg-tertiary', '#f3f4f6')
      document.documentElement.style.setProperty('--bg-card', '#ffffff')
      document.documentElement.style.setProperty('--bg-hover', '#f3f4f6')
      document.documentElement.style.setProperty('--text-primary', '#ffffff')
      document.documentElement.style.setProperty('--text-secondary', '#4b5563')
      document.documentElement.style.setProperty('--text-tertiary', '#6b7280')
      document.documentElement.style.setProperty('--text-on-surface', '#1f2937')
      document.documentElement.style.setProperty('--border-color', '#e5e7eb')
      document.documentElement.style.setProperty('--nav-bg', 'rgba(255, 255, 255, 0.95)')
      document.documentElement.style.setProperty('--bg-settings', '#fafbfc')
      document.documentElement.style.setProperty('--btn-primary', 'linear-gradient(135deg, #f472b6, #c084fc)')
      document.documentElement.style.setProperty('--btn-primary-text', '#1f2937')
      document.documentElement.style.setProperty('--accent-pink', '#f472b6')
      document.documentElement.style.setProperty('--accent-cyan', '#06b6d4')
      document.documentElement.style.setProperty('--accent-purple', '#c084fc')
    }
  }, [themeMode])

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}