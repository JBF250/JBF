import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://noiebpjyskscjtmdytxj.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaWVicGp5c2tzY2p0bWR5dHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjY2MzEsImV4cCI6MjEwMDQ0MjYzMX0.1KQOc02ySuxi-k845kbplnXyXndrlH6hxz58sFFb_Rs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // 隐式流程：邮件链接经 Supabase /verify 重定向后携带 access_token，
    // 由 ConfirmWait / ResetPassword 页面手动 setSession 完成登录与邮箱确认。
    flowType: 'implicit',
    // 关闭自动从 URL 解析会话，避免与页面手动 setSession 产生竞态
    detectSessionInUrl: false,
  },
})

export type User = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  theme_color: string
  language: string
  custom_cursor: boolean
}

export type CommunityPost = {
  id: string
  user_id: string
  title: string
  content: string
  images: string[]
  author_display_name: string
  author_avatar_url: string | null
  created_at: string
  updated_at: string
}