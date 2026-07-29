import { supabase } from '@/lib/supabase'

export type GameType = '2048' | 'reaction' | '3drunner'

export interface LeaderboardEntry {
  id: string
  user_id: string
  score: number
  created_at: string
  user?: {
    display_name: string
    avatar_url: string | null
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function submitScore(
  gameType: GameType,
  score: number
): Promise<{ success: boolean; error?: string; isNewHighScore?: boolean }> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }

    // First check user's existing score for this game
    const { data: existingData, error: fetchError } = await supabase
      .from('game_leaderboard')
      .select('score')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .maybeSingle()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // For reaction games, lower score is better; for others, higher is better
    const isReaction = gameType === 'reaction'
    if (existingData) {
      const currentScore = existingData.score as number
      const isBetter = isReaction ? score < currentScore : score > currentScore
      if (!isBetter) {
        return { success: true, isNewHighScore: false }
      }
    }

    // Upsert: insert or update on (user_id, game_type)
    const { error } = await supabase.from('game_leaderboard').upsert(
      {
        user_id: userId,
        game_type: gameType,
        score,
      },
      { onConflict: 'user_id,game_type' }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, isNewHighScore: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}

export async function getLeaderboard(gameType: GameType, limit = 50) {
  try {
    // Step 1: Get leaderboard entries
    const { data: entries, error } = await supabase
      .from('game_leaderboard')
      .select('id, user_id, score, created_at')
      .eq('game_type', gameType)
      .order('score', { ascending: gameType === 'reaction' })
      .limit(limit)

    if (error) {
      return { data: [], error: error.message }
    }

    if (!entries || entries.length === 0) {
      return { data: [], error: null }
    }

    // Step 2: Get unique user IDs
    const userIds = [...new Set(entries.map((e: any) => e.user_id))]

    // Step 3: Fetch user profiles
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    // Create user map
    const userMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
    if (users && !userError) {
      for (const u of users as any[]) {
        userMap[u.id] = {
          display_name: u.display_name || 'Player',
          avatar_url: u.avatar_url,
        }
      }
    }

    // Step 4: Combine data
    const result: LeaderboardEntry[] = (entries as any[]).map((entry) => ({
      id: entry.id,
      user_id: entry.user_id,
      score: entry.score,
      created_at: entry.created_at,
      user: userMap[entry.user_id] || {
        display_name: 'Player',
        avatar_url: null,
      },
    }))

    return { data: result, error: null }
  } catch (err: any) {
    return { data: [], error: err.message || 'Unknown error' }
  }
}

export async function getUserHighScore(gameType: GameType): Promise<number | null> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('game_leaderboard')
      .select('score')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data.score as number
  } catch {
    return null
  }
}
