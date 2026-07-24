import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type User } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  logout: () => Promise<void>
  updateUserSettings: (settings: Partial<User>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          setUser(profile as User)
        }
      }
      setLoading(false)
    }
    fetchUser()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUser(profile as User)
        }
      } else {
        setUser(null)
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) throw error
    
    if (data.session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      
      if (profile) {
        setUser(profile as User)
      }
    }
  }

  const register = async (email: string, username: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin
      }
    })

    if (error) throw error

    // 注册后不自动登录，等待用户验证邮箱
    // Supabase 会自动发送验证邮件
    if (data.user) {
      // 先在 users 表中创建资料（标记为未验证）
      // 用户验证邮箱后即可正常登录使用
      try {
        await supabase.from('users').insert({
          id: data.user.id,
          username,
          display_name: '游客',
          theme_color: '#8b5cf6',
          language: 'zh'
        })
      } catch (e) {
        // 资料创建失败不阻塞流程，用户验证邮箱后可以补全
        console.warn('Failed to create user profile:', e)
      }
    }
  }

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateUserSettings = async (settings: Partial<User>) => {
    if (!user) return
    const { error } = await supabase
      .from('users')
      .update(settings)
      .eq('id', user.id)
    
    if (error) throw error
    
    setUser(prev => prev ? { ...prev, ...settings } : null)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return null
    
    const fileName = `avatars/${user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage
      .from('blog-images')
      .upload(fileName, file)
    
    if (error) {
      console.error('Upload failed:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resendVerification, logout, updateUserSettings, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}