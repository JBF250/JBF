import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type User } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  logout: () => Promise<void>
  updateUserSettings: (settings: Partial<User>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureUserProfile = async (authUser: any) => {
    console.log('ensureUserProfile called with authUser:', authUser?.id)
    
    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    console.log('ensureUserProfile result:', { profile, fetchError })
    
    if (fetchError) {
      console.error('Failed to fetch user profile:', fetchError)
      return null
    }
    
    if (profile) {
      console.log('User profile found, avatar_url:', profile.avatar_url)
      return profile as User
    }

    // Only create new profile if user doesn't exist yet
    console.log('Creating new user profile for:', authUser.id)
    const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user'
    const { data: newProfile, error: insertError } = await supabase.from('users').insert({
      id: authUser.id,
      username,
      display_name: authUser.email || '用户',
      theme_color: '#8b5cf6',
      language: 'zh',
      avatar_url: null,
      email: authUser.email || null
    }).select('*').single()
    
    if (insertError) {
      console.error('Failed to create user profile:', insertError)
      return null
    }
    
    console.log('New profile created:', newProfile)
    return newProfile as User || null
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const profile = await ensureUserProfile(authUser)
        if (profile) {
          setUser(profile)
        }
      }
      setLoading(false)
    }
    fetchUser()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await ensureUserProfile(session.user)
        if (profile) {
          setUser(profile)
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
      const profile = await ensureUserProfile(data.session.user)
      if (profile) {
        setUser(profile)
      }
    }
  }

  const register = async (email: string, password: string) => {
    // 先检查邮箱是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    
    if (existingUser) {
      const error = new Error('EMAIL_ALREADY_REGISTERED')
      throw error
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })

    if (error) {
      // 处理 Supabase 返回的重复邮箱错误
      if (error.message?.includes('already been registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('already in use')) {
        throw new Error('EMAIL_ALREADY_REGISTERED')
      }
      throw error
    }

    // 注册后不自动登录，等待用户验证邮箱
    // Supabase 会自动发送验证邮件
    if (data.user) {
      // 生成随机ID作为初始用户名
      const randomId = Math.random().toString(36).substring(2, 10)
      try {
        await supabase.from('users').insert({
          id: data.user.id,
          username: randomId,
          display_name: '用户_' + randomId.slice(0, 4),
          email: email,
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

  const resetPassword = async (email: string) => {
    // 根据当前环境设置正确的 redirectTo
    const isLocalhost = window.location.hostname === 'localhost'
    const redirectUrl = isLocalhost 
      ? 'http://localhost:5173/auth/reset-password'
      : `${window.location.origin}/auth/reset-password`
    
    console.log('Reset password redirectTo:', redirectUrl)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
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
    <AuthContext.Provider value={{ user, loading, login, register, resendVerification, resetPassword, updatePassword, logout, updateUserSettings, uploadAvatar }}>
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