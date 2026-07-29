import { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Trophy, Loader2 } from 'lucide-react'
import { getLeaderboard, type GameType, type LeaderboardEntry } from '@/lib/leaderboard'
import Avatar from '@/components/Avatar'

interface LeaderboardProps {
  gameType: GameType
  refreshKey?: number
}

export function Leaderboard({ gameType, refreshKey }: LeaderboardProps) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    
    async function fetchLeaderboard() {
      setLoading(true)
      try {
        const { data, error } = await getLeaderboard(gameType)
        if (cancelled) return
        if (error) {
          setEntries([])
        } else {
          setEntries(data)
        }
      } catch {
        if (!cancelled) {
          setEntries([])
        }
      }
      if (!cancelled) setLoading(false)
    }
    
    fetchLeaderboard()
    return () => { cancelled = true }
  }, [gameType, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-theme-secondary">{t('lab.loading')}</span>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="mt-6 sm:mt-8 bg-theme-tertiary rounded-xl p-4 sm:p-6 border border-theme-color">
        <h3 className="text-base sm:text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {t('lab.leaderboard')}
        </h3>
        <div className="text-center py-6 sm:py-8 text-theme-secondary">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm sm:text-base">{t('lab.noLeaderboardData')}</p>
          <p className="text-xs sm:text-sm mt-1 opacity-70">
            {gameType === '2048' && t('lab.emptyHint2048')}
            {gameType === 'reaction' && t('lab.emptyHintReaction')}
            {gameType === '3drunner' && t('lab.emptyHint3drunner')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 sm:mt-8 bg-theme-tertiary rounded-xl p-4 sm:p-6 border border-theme-color">
      <h3 className="text-base sm:text-lg font-semibold text-theme-primary mb-3 sm:mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        {t('lab.leaderboard')}
        <span className="text-xs sm:text-sm font-normal text-theme-secondary ml-2">
          TOP {entries.length}
        </span>
      </h3>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg ${
              index === 0
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : index === 1
                ? 'bg-gray-400/10 border border-gray-400/30'
                : index === 2
                ? 'bg-orange-500/10 border border-orange-500/30'
                : 'bg-theme-bg'
            }`}
          >
            <span className={`w-6 sm:w-8 text-center font-bold text-sm sm:text-base ${
              index < 3 ? 'text-yellow-500' : 'text-theme-secondary'
            }`}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Avatar
                src={entry.user?.avatar_url}
                alt={entry.user?.display_name || t('lab.unknownPlayer')}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm shrink-0 ${
                  index === 0 ? 'ring-2 ring-yellow-500' :
                  index === 1 ? 'ring-2 ring-gray-400' :
                  index === 2 ? 'ring-2 ring-orange-500' : ''
                }`}
              />
              <span className="text-theme-primary font-medium text-sm sm:text-base truncate">
                {entry.user?.display_name || t('lab.unknownPlayer')}
              </span>
            </div>
            <span className="text-primary font-bold text-base sm:text-lg shrink-0">
              {entry.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
