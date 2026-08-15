import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { LabLayout } from './LabLayout'
import { Leaderboard } from './Leaderboard'
import { submitScore, getUserHighScore } from '@/lib/leaderboard'
import { Play, RotateCcw, LogIn, Trophy, Zap } from 'lucide-react'

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'early'

const STORAGE_KEY = 'lab_reaction_highscore'
const MAX_ROUNDS = 5

export default function ReactionPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [gameState, setGameState] = useState<GameState>('idle')
  const [, setReactionTime] = useState(0)
  const [rounds, setRounds] = useState<number[]>([])
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0')
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [localHighScore, setLocalHighScore] = useState<number | null>(null)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timeoutRef = useRef<number | null>(null)
  const particleRef = useRef<HTMLDivElement>(null)

  // Load user's high score
  useEffect(() => {
    if (user) {
      getUserHighScore('reaction').then((score) => {
        if (score) setLocalHighScore(Number(score))
      })
    }
  }, [user])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const startGame = () => {
    setGameState('waiting')
    setRounds([])
    setReactionTime(0)
    setSubmitted(false)

    // Random wait time between 1-3 seconds
    const waitTime = Math.random() * 2000 + 1000
    timeoutRef.current = window.setTimeout(() => {
      setGameState('ready')
      startTimeRef.current = performance.now()
    }, waitTime)
  }

  const handleClick = useCallback(() => {
    if (gameState === 'idle' || gameState === 'result' || gameState === 'early') {
      startGame()
    } else if (gameState === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setGameState('early')
    } else if (gameState === 'ready') {
      // Calculate reaction time
      const time = Math.round(performance.now() - startTimeRef.current)
      setReactionTime(time)
      
      const newRounds = [...rounds, time]
      setRounds(newRounds)

      if (newRounds.length >= MAX_ROUNDS) {
        setGameState('result')
        const avgTime = Math.round(newRounds.reduce((a, b) => a + b, 0) / newRounds.length)
        
        if (avgTime > 0 && (highScore === 0 || avgTime < highScore)) {
          setHighScore(avgTime)
          localStorage.setItem(STORAGE_KEY, avgTime.toString())
        }
      } else {
        // Continue to next round
        setGameState('waiting')
        const waitTime = Math.random() * 2000 + 1000
        timeoutRef.current = window.setTimeout(() => {
          setGameState('ready')
          startTimeRef.current = performance.now()
        }, waitTime)
      }

      // Trigger particle effect
      createParticles()
    }
  }, [gameState, rounds, highScore])

  const createParticles = () => {
    if (!particleRef.current) return
    
    const container = particleRef.current
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div')
      const angle = (Math.PI * 2 * i) / 12
      const velocity = 80 + Math.random() * 60
      const dx = Math.cos(angle) * velocity
      const dy = Math.sin(angle) * velocity
      
      particle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: hsl(${Math.random() * 60 + 200}, 100%, 60%);
        border-radius: 50%;
        left: 50%;
        top: 50%;
        pointer-events: none;
        transition: all 0.6s ease-out;
      `
      
      container.appendChild(particle)
      
      requestAnimationFrame(() => {
        particle.style.transform = `translate(${dx}px, ${dy}px)`
        particle.style.opacity = '0'
      })
      
      setTimeout(() => particle.remove(), 600)
    }
  }

  const getAverageTime = () => {
    if (rounds.length === 0) return 0
    return Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length)
  }

  const getBestTime = () => {
    if (rounds.length === 0) return 0
    return Math.min(...rounds)
  }

  const submitScoreHandler = async () => {
    if (!user || submitted) return
    setSubmitting(true)
    const avgTime = getAverageTime()
    const result = await submitScore('reaction', avgTime)
    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
      setLocalHighScore(avgTime)
      setLeaderboardRefreshKey(k => k + 1)
    }
  }

  // Background color based on game state
  const getBackgroundColor = () => {
    switch (gameState) {
      case 'idle': return 'bg-blue-500'
      case 'waiting': return 'bg-red-500'
      case 'ready': return 'bg-green-500'
      case 'result': return 'bg-purple-500'
      case 'early': return 'bg-yellow-500'
    }
  }

  return (
    <LabLayout
      title={t('lab.games.reaction.title')}
      description={t('lab.games.reaction.desc')}
    >
      <div className="space-y-6">
        {/* Game Area */}
        <div
          onClick={handleClick}
          className={`relative w-full h-64 sm:h-80 rounded-xl cursor-pointer transition-colors duration-300 ${getBackgroundColor()} flex items-center justify-center overflow-hidden select-none`}
          ref={particleRef}
        >
          <div className="text-center text-white">
            {gameState === 'idle' && (
              <>
                <Play className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl font-bold">{t('lab.games.reaction.clickToStart')}</p>
              </>
            )}
            {gameState === 'waiting' && (
              <p className="text-xl font-bold animate-pulse">
                {t('lab.games.reaction.waitForGreen')}
              </p>
            )}
            {gameState === 'ready' && (
              <>
                <Zap className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                <p className="text-2xl font-bold">{t('lab.games.reaction.clickNow')}!</p>
              </>
            )}
            {gameState === 'result' && (
              <>
                <p className="text-4xl font-bold mb-2">
                  {getAverageTime()} <span className="text-2xl">ms</span>
                </p>
                <p className="text-lg">{t('lab.games.reaction.averageReaction')}</p>
                <p className="text-sm mt-2 opacity-80">
                  {t('lab.games.reaction.best')}: {getBestTime()}ms
                </p>
              </>
            )}
            {gameState === 'early' && (
              <>
                <p className="text-2xl font-bold mb-2">
                  {t('lab.games.reaction.tooEarly')}!
                </p>
                <p className="text-sm">{t('lab.games.reaction.clickToRetry')}</p>
              </>
            )}
          </div>
        </div>

        {/* Round Indicator */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-colors ${
                i < rounds.length
                  ? 'bg-green-500'
                  : i === rounds.length && gameState === 'waiting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-theme-tertiary'
              }`}
            />
          ))}
        </div>

        {/* Round Times */}
        {rounds.length > 0 && gameState === 'result' && (
          <div className="bg-theme-tertiary rounded-lg p-4">
            <h3 className="text-lg font-semibold text-theme-on-surface mb-2">
              {t('lab.games.reaction.roundTimes')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {rounds.map((time, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm ${
                    time === getBestTime()
                      ? 'bg-green-500 text-white'
                      : 'bg-theme-hover text-theme-secondary'
                  }`}
                >
                  {i + 1}: {time}ms
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-theme-tertiary rounded-lg p-4 text-center">
            <p className="text-sm text-theme-secondary">{t('lab.games.reaction.best')}</p>
            <p className="text-2xl font-bold text-primary">
              {highScore > 0 ? `${highScore}ms` : '—'}
            </p>
          </div>
          <div className="bg-theme-tertiary rounded-lg p-4 text-center">
            <p className="text-sm text-theme-secondary">{t('lab.games.reaction.averageReaction')}</p>
            <p className="text-2xl font-bold text-primary">
              {rounds.length > 0 ? `${getAverageTime()}ms` : '—'}
            </p>
          </div>
        </div>

        {/* Actions */}
        {gameState === 'result' && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              {t('lab.games.playAgain')}
            </button>
            {user ? (
              <button
                onClick={submitScoreHandler}
                disabled={submitting || submitted}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                {submitted ? t('lab.games.submitted') : t('lab.games.submitScore')}
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {t('lab.games.loginToSubmit')}
              </button>
            )}
          </div>
        )}

        {/* User's High Score */}
        {user && localHighScore !== null && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-500">
              {t('lab.games.yourHighScore')}: {localHighScore}ms
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-theme-secondary text-sm">
          <p>{t('lab.games.reaction.instructions')}</p>
        </div>

        {/* Leaderboard */}
        <Leaderboard gameType="reaction" refreshKey={leaderboardRefreshKey} />
      </div>
    </LabLayout>
  )
}
