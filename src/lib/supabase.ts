import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://noiebpjyskscjtmdytxj.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaWVicGp5c2tzY2p0bWR5dHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjY2MzEsImV4cCI6MjEwMDQ0MjYzMX0.1KQOc02ySuxi-k845kbplnXyXndrlH6hxz58sFFb_Rs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // PKCE 流程：邮件使用 token_hash 链接跳转到本站页面，
    // 用户手动点击确认按钮后调用 verifyOtp 兑换会话，避免邮箱安全自检预先消耗一次性 token。
    flowType: 'pkce',
    detectSessionInUrl: true,
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