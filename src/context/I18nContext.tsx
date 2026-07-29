import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import zh from '@/data/locales/zh.json'
import en from '@/data/locales/en.json'
import ja from '@/data/locales/ja.json'

export type Language = 'zh' | 'en' | 'ja'

export interface Translation {
  [key: string]: string | Translation
}

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations: Record<Language, Translation> = {
  zh,
  en,
  ja,
}

function getTranslation(key: string, lang: Language): string {
  const keys = key.split('.')
  let result: string | Translation = translations[lang]
  
  for (const k of keys) {
    if (typeof result === 'object' && result !== null && k in result) {
      result = result[k]
    } else {
      return key
    }
  }
  
  return typeof result === 'string' ? result : key
}

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Language }) {
  const [lang, setLangState] = useState<Language>(initialLang || 'zh')

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('language', newLang)
  }

  const t = (key: string, params?: Record<string, string | number>) => {
    let result = getTranslation(key, lang)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v))
      }
    }
    return result
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}