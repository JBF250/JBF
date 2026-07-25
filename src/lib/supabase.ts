import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://noiebpjyskscjtmdytxj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaWVicGp5c2tzY2p0bWR5dHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjY2MzEsImV4cCI6MjEwMDQ0MjYzMX0.1KQOc02ySuxi-k845kbplnXyXndrlH6hxz58sFFb_Rs'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type User = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  theme_color: string
  language: string
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