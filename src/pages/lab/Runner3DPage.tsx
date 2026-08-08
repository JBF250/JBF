import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/context/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { LabLayout } from './LabLayout'
import { Leaderboard } from './Leaderboard'
import { submitScore } from '@/lib/leaderboard'
import SubwaySurferGame, { type GameState, type GameStats } from './SubwaySurferGame'
import { RotateCcw, LogIn, Trophy, Play, Shield, Magnet, Zap, Gauge } from 'lucide-react'

export default function Runner3DPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [gameState, setGameState] = useState<GameState>('ready')
  const [score, setScore] = useState(0)
  const [distance, setDistance] = useState(0)
  const [coinCount, setCoinCount] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [gameSpeed, setGameSpeed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isNewHighScore, setIsNewHighScore] = useState(false)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  const [activePowerups, setActivePowerups] = useState<{ shield: number; magnet: number; doubleScore: number; speed: number }>({
    shield: 0, magnet: 0, doubleScore: 0, speed: 0
  })
  // 道具拾取提示 (显示几秒后自动消失)
  const [powerupToast, setPowerupToast] = useState<{ type: 'shield' | 'magnet' | 'double' | 'speed'; name: string; desc: string } | null>(null)
  const powerupToastTimerRef = useRef<number | null>(null)

  const handleGameStateChange = useCallback((state: GameState) => {
    setGameState(state)
  }, [])

  const handleStatsUpdate = useCallback((stats: GameStats) => {
    setScore(stats.score)
    setDistance(stats.distance)
    setCoinCount(stats.coins)
    setComboCount(stats.combo)
    setGameSpeed(stats.speed)
    setActivePowerups({ ...stats.powerups })
  }, [])

  const handlePowerupPickup = useCallback((type: 'shield' | 'magnet' | 'double' | 'speed') => {
    const info = {
      shield: { name: t('lab.games.runner3d.shield'), desc: t('lab.games.runner3d.shieldDesc') },
      magnet: { name: t('lab.games.runner3d.magnet'), desc: t('lab.games.runner3d.magnetDesc') },
      double: { name: t('lab.games.runner3d.doubleScore'), desc: t('lab.games.runner3d.doubleDesc') },
      speed: { name: t('lab.games.runner3d.speedBoost'), desc: t('lab.games.runner3d.speedDesc') },
    }[type]
    setPowerupToast({ type, ...info })
    if (powerupToastTimerRef.current) clearTimeout(powerupToastTimerRef.current)
    powerupToastTimerRef.current = window.setTimeout(() => {
      setPowerupToast(null)
      powerupToastTimerRef.current = null
    }, 2500)
  }, [t])

  const startGame = useCallback(() => {
    setScore(0)
    setDistance(0)
    setCoinCount(0)
    setComboCount(0)
    setGameSpeed(0)
    setSubmitted(false)
    setIsNewHighScore(false)
    setActivePowerups({ shield: 0, magnet: 0, doubleScore: 0, speed: 0 })
    setPowerupToast(null)
    if (powerupToastTimerRef.current) {
      clearTimeout(powerupToastTimerRef.current)
      powerupToastTimerRef.current = null
    }
    // First reset to clear obstacles, then start
    const surf = (window as any).__subwaySurfer
    if (surf) {
      surf.reset()
      // Delay a frame to let cleanup happen
      requestAnimationFrame(() => {
        surf.start()
      })
    }
  }, [])

  const resetGame = useCallback(() => {
    const surf = (window as any).__subwaySurfer
    if (surf) surf.reset()
    setGameState('ready')
    setScore(0)
    setDistance(0)
    setCoinCount(0)
    setComboCount(0)
    setGameSpeed(0)
    setSubmitted(false)
    setIsNewHighScore(false)
    setActivePowerups({ shield: 0, magnet: 0, doubleScore: 0, speed: 0 })
    setPowerupToast(null)
    if (powerupToastTimerRef.current) {
      clearTimeout(powerupToastTimerRef.current)
      powerupToastTimerRef.current = null
    }
  }, [])

  const submitScoreHandler = async () => {
    if (!user || submitted || score <= 0) return
    setSubmitting(true)
    const result = await submitScore('3drunner', score)
    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
      setLeaderboardRefreshKey(k => k + 1)
    }
  }

  const hasShield = activePowerups.shield > 0
  const hasMagnet = activePowerups.magnet > 0
  const hasDouble = activePowerups.doubleScore > 0
  const hasSpeed = activePowerups.speed > 0

  return (
    <LabLayout
      title={t('lab.games.runner3d.title')}
      description={t('lab.games.runner3d.desc')}
    >
      <div className="space-y-4">
        {/* HUD - 顶部信息栏 */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <div className="bg-theme-tertiary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[65px] sm:min-w-[80px]">
              <p className="text-xs text-theme-secondary">{t('lab.games.score')}</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{score.toLocaleString()}</p>
            </div>
            <div className="bg-theme-tertiary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[65px] sm:min-w-[80px]">
              <p className="text-xs text-theme-secondary">{t('lab.games.runner3d.distance')}</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{distance}m</p>
            </div>
            <div className="bg-theme-tertiary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[65px] sm:min-w-[80px]">
              <p className="text-xs text-theme-secondary">{t('lab.games.runner3d.coins')}</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-500">{coinCount}</p>
            </div>
            <div className="bg-theme-tertiary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[50px] sm:min-w-[60px]">
              <p className="text-xs text-theme-secondary">{t('lab.games.speed')}</p>
              <p className="text-lg sm:text-xl font-bold text-green-400">{Math.floor(gameSpeed)}</p>
            </div>
          </div>

          {/* 激活的道具 */}
          <div className="flex gap-2 flex-wrap">
            {hasShield && (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">{Math.ceil(activePowerups.shield)}s</span>
              </div>
            )}
            {hasMagnet && (
              <div className="flex items-center gap-1 px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-lg">
                <Magnet className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-pink-400">{Math.ceil(activePowerups.magnet)}s</span>
              </div>
            )}
            {hasDouble && (
                <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">{Math.ceil(activePowerups.doubleScore)}s</span>
                </div>
              )}
              {hasSpeed && (
                <div className="flex items-center gap-1 bg-orange-500/20 px-2 py-1 rounded-full">
                  <Gauge className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400">{Math.ceil(activePowerups.speed)}s</span>
                </div>
              )}
          </div>
        </div>

        {/* 游戏容器 */}
        <div
          className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-slate-900"
        >
          <SubwaySurferGame
            onGameStateChange={handleGameStateChange}
            onStatsUpdate={handleStatsUpdate}
            onPowerupPickup={handlePowerupPickup}
          />

          {/* 开始界面覆盖层 */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-50 gap-4 sm:gap-5 px-4 overflow-y-auto py-4">
              <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">{t('lab.games.runner3d.title')}</h2>

              {/* 操作说明 */}
              <div className="bg-theme-tertiary/90 rounded-lg p-3 sm:p-4 max-w-md text-xs sm:text-sm text-center">
                <p className="font-semibold text-theme-primary mb-2">{t('lab.games.runner3d.operationGuide')}</p>
                <ul className="text-theme-secondary space-y-1 text-left">
                  <li><kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">←→</kbd> / <kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">A/D</kbd>：{t('lab.games.runner3d.switchLanes')}</li>
                  <li><kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">↑</kbd> / <kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">Space</kbd>：{t('lab.games.runner3d.jump')}</li>
                  <li><kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">↓</kbd> / <kbd className="bg-theme-color px-1.5 py-0.5 rounded text-xs">S</kbd>：{t('lab.games.runner3d.slide')}</li>
                  <li className="text-xs opacity-70 pt-1">{t('lab.games.runner3d.mobileControl')}</li>
                </ul>
              </div>

              {/* 道具说明 */}
              <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-theme-secondary flex-wrap justify-center">
                <div className="flex items-center gap-1"><Shield className="w-4 h-4 text-blue-400" /> {t('lab.games.runner3d.shield')}</div>
                <div className="flex items-center gap-1"><Magnet className="w-4 h-4 text-pink-400" /> {t('lab.games.runner3d.magnet')}</div>
                <div className="flex items-center gap-1"><Zap className="w-4 h-4 text-green-400" /> {t('lab.games.runner3d.doubleScore')}</div>
                <div className="flex items-center gap-1"><Gauge className="w-4 h-4 text-orange-400" /> {t('lab.games.runner3d.speedBoost')}</div>
              </div>

              <button
                onClick={startGame}
                className="flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white text-lg sm:text-xl font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                {t('lab.games.startGame')}
              </button>
            </div>
          )}

          {/* 游戏中HUD - playing 和 dying 状态都显示 */}
          {['playing', 'dying'].includes(gameState) && (
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-40">
              <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-2">
                <p className="text-white text-xl font-bold">{score.toLocaleString()}</p>
                <p className="text-white/60 text-xs">{distance}m · {coinCount}💰 · {Math.floor(gameSpeed)}km/h</p>
                {comboCount > 1 && (
                  <p className="text-yellow-400 text-xs font-bold mt-0.5">{comboCount}x 连击!</p>
                )}
              </div>

              {/* 道具状态 */}
              <div className="flex flex-col gap-1 items-end">
                {hasShield && (
                  <div className="bg-blue-500/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">{Math.ceil(activePowerups.shield)}s</span>
                  </div>
                )}
                {hasMagnet && (
                  <div className="bg-pink-500/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                    <Magnet className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">{Math.ceil(activePowerups.magnet)}s</span>
                  </div>
                )}
                {hasDouble && (
                  <div className="bg-green-500/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">x2</span>
                  </div>
                )}
                {hasSpeed && (
                  <div className="bg-orange-500/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">{Math.ceil(activePowerups.speed)}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 道具拾取提示 - 居中下方显示几秒 */}
          {powerupToast && ['playing', 'dying'].includes(gameState) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-pulse">
              {powerupToast.type === 'shield' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 shadow-2xl backdrop-blur bg-blue-500/30 border-blue-400/70">
                  <Shield className="w-6 h-6 text-blue-300" />
                  <div>
                    <p className="text-blue-200 text-base font-bold">{t('lab.games.runner3d.obtained', { name: powerupToast.name })}</p>
                    <p className="text-white/80 text-xs">{powerupToast.desc}</p>
                  </div>
                </div>
              )}
              {powerupToast.type === 'magnet' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 shadow-2xl backdrop-blur bg-pink-500/30 border-pink-400/70">
                  <Magnet className="w-6 h-6 text-pink-300" />
                  <div>
                    <p className="text-pink-200 text-base font-bold">{t('lab.games.runner3d.obtained', { name: powerupToast.name })}</p>
                    <p className="text-white/80 text-xs">{powerupToast.desc}</p>
                  </div>
                </div>
              )}
              {powerupToast.type === 'double' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 shadow-2xl backdrop-blur bg-green-500/30 border-green-400/70">
                  <Zap className="w-6 h-6 text-green-300" />
                  <div>
                    <p className="text-green-200 text-base font-bold">{t('lab.games.runner3d.obtained', { name: powerupToast.name })}</p>
                    <p className="text-white/80 text-xs">{powerupToast.desc}</p>
                  </div>
                </div>
              )}
              {powerupToast.type === 'speed' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 shadow-2xl backdrop-blur bg-orange-500/30 border-orange-400/70">
                  <Gauge className="w-6 h-6 text-orange-300" />
                  <div>
                    <p className="text-orange-200 text-base font-bold">{t('lab.games.runner3d.obtained', { name: powerupToast.name })}</p>
                    <p className="text-white/80 text-xs">{powerupToast.desc}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 游戏结束覆盖层 */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 gap-3 sm:gap-4 p-4 sm:p-6 overflow-y-auto">
              <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">{t('lab.games.gameOver')}</h2>

              <div className="bg-theme-tertiary/90 rounded-xl p-4 sm:p-6 text-center space-y-2 sm:space-y-3 min-w-[220px] sm:min-w-[240px]">
                <div>
                  <p className="text-xs sm:text-sm text-theme-secondary">{t('lab.games.finalScore')}</p>
                  <p className="text-3xl sm:text-4xl font-bold text-primary">{score.toLocaleString()}</p>
                </div>
                <div className="flex justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
                  <div>
                    <span className="text-theme-secondary">{t('lab.games.runner3d.distance')}</span>
                    <p className="font-bold">{distance}m</p>
                  </div>
                  <div>
                    <span className="text-theme-secondary">{t('lab.games.runner3d.coins')}</span>
                    <p className="font-bold text-yellow-500">{coinCount}</p>
                  </div>
                </div>
                {isNewHighScore && (
                  <div className="text-yellow-400 font-bold animate-pulse text-base sm:text-lg">
                    {t('lab.games.runner3d.newRecord')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-primary text-white text-sm sm:text-base rounded-lg hover:opacity-90"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('lab.games.playAgain')}
                </button>

                {user ? (
                  <button
                    onClick={submitScoreHandler}
                    disabled={submitting || submitted || score <= 0}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-yellow-500 text-white text-sm sm:text-base rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    <Trophy className="w-4 h-4" />
                    {submitted ? t('lab.games.runner3d.uploaded') : submitting ? t('lab.games.runner3d.uploading') : t('lab.games.runner3d.uploadScore')}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-500 text-white text-sm sm:text-base rounded-lg hover:bg-blue-600"
                  >
                    <LogIn className="w-4 h-4" />
                    {t('lab.games.runner3d.loginToUpload')}
                  </Link>
                )}

                <button
                  onClick={resetGame}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 bg-theme-tertiary text-theme-primary text-sm sm:text-base rounded-lg hover:opacity-90 border border-theme-color"
                >
                  {t('lab.games.runner3d.back')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 操作提示 */}
        <div className="text-center text-theme-secondary text-xs sm:text-sm space-y-1">
          <p>{t('lab.games.runner3d.controlHint')}</p>
          <p className="opacity-70">{t('lab.games.runner3d.tip')}</p>
        </div>

        {/* 排行榜 */}
        <Leaderboard gameType="3drunner" refreshKey={leaderboardRefreshKey} />
      </div>
    </LabLayout>
  )
}
