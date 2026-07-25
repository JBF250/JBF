import { useState, useEffect } from 'react'
import { ArrowLeft, User, Upload, Palette, Globe, Save, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { useTheme } from '@/context/ThemeContext'

export default function Settings() {
  const [displayName, setDisplayName] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [language, setLanguage] = useState<'zh' | 'en' | 'ja'>('zh')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { user, updateUserSettings, uploadAvatar } = useAuth()
  const { t, setLang } = useI18n()
  const { setThemeMode } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setIsDarkMode(user.theme_color !== '#ffffff')
      setLanguage((user.language || 'zh') as 'zh' | 'en' | 'ja')
    }
  }, [user])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const handleSave = async () => {
    if (!displayName.trim()) return
    
    setIsSaving(true)
    
    try {
      let avatarUrl = user?.avatar_url
      
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile)
      }
      
      const settings: Partial<{ display_name: string; theme_color: string; language: string; avatar_url: string | null }> = {
        display_name: displayName,
        theme_color: isDarkMode ? '#8b5cf6' : '#ffffff',
        language: language
      }
      
      if (avatarUrl) {
        settings.avatar_url = avatarUrl
      }
      
      await updateUserSettings(settings as Partial<any>)
      
      setLang(language)
      setThemeMode(isDarkMode ? 'dark' : 'light')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
    }
  }

  return (
    <div className="min-h-screen">
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('detail.back')}
          </button>

          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl text-theme-primary mb-2">{t('settings.title')}</h1>
            <p className="text-theme-secondary">{t('settings.profile')}</p>
          </div>

          <div className="bg-theme-card/80 backdrop-blur-xl rounded-2xl p-6 space-y-6 border border-theme-color">
            <div>
              <label className="flex items-center gap-2 text-theme-primary font-medium mb-4">
                <User className="w-5 h-5" />
                {t('settings.avatar')}
              </label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-theme-tertiary overflow-hidden flex items-center justify-center">
                  {avatarFile ? (
                    <img
                      src={URL.createObjectURL(avatarFile)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-theme-secondary" />
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg cursor-pointer hover:bg-theme-hover transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>上传头像</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-theme-primary font-medium mb-4">
                <User className="w-5 h-5" />
                {t('settings.displayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('settings.displayName')}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-theme-primary font-medium mb-4">
                <Palette className="w-5 h-5" />
                {t('settings.color')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isDarkMode
                      ? 'bg-theme-tertiary border-primary'
                      : 'bg-theme-tertiary/50 border-theme-color hover:border-primary'
                  }`}
                >
                  <Moon className="w-6 h-6 text-theme-secondary" />
                  <span className="text-theme-primary font-medium">深色模式</span>
                </button>
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    !isDarkMode
                      ? 'bg-white/10 border-primary'
                      : 'bg-theme-tertiary/50 border-theme-color hover:border-primary'
                  }`}
                >
                  <Sun className="w-6 h-6 text-yellow-400" />
                  <span className="text-theme-primary font-medium">浅色模式</span>
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-theme-primary font-medium mb-4">
                <Globe className="w-5 h-5" />
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setLanguage('zh')}
                  className={`p-4 rounded-xl border transition-all ${
                    language === 'zh'
                      ? 'bg-gradient-primary border-primary btn-primary-text'
                      : 'bg-theme-tertiary border-theme-color text-theme-primary hover:border-primary'
                  }`}
                >
                  {t('settings.chinese')}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`p-4 rounded-xl border transition-all ${
                    language === 'en'
                      ? 'bg-gradient-primary border-primary btn-primary-text'
                      : 'bg-theme-tertiary border-theme-color text-theme-primary hover:border-primary'
                  }`}
                >
                  {t('settings.english')}
                </button>
                <button
                  onClick={() => setLanguage('ja')}
                  className={`p-4 rounded-xl border transition-all ${
                    language === 'ja'
                      ? 'bg-gradient-primary border-primary btn-primary-text'
                      : 'bg-theme-tertiary border-theme-color text-theme-primary hover:border-primary'
                  }`}
                >
                  {t('settings.japanese')}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-theme-color">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-theme-tertiary text-theme-primary rounded-xl hover:bg-theme-hover transition-colors"
              >
                {t('detail.back')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !displayName.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-primary btn-primary-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? '保存中...' : t('settings.save')}
                {saved && <span className="text-green-400">{t('settings.saved')}</span>}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}