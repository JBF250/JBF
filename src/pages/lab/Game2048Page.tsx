import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/context/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { LabLayout } from './LabLayout'
import { Leaderboard } from './Leaderboard'
import { submitScore } from '@/lib/leaderboard'
import { RotateCcw, LogIn } from 'lucide-react'

const GRID_SIZE = 4
const STORAGE_KEY = 'lab_2048_state'

type Board = number[][]

// Tile tracking for animations
interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew?: boolean
  isMerged?: boolean
}

let nextTileId = 1

function createEmptyBoard(): Board {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0))
}

function addRandomTile(board: Board, tiles: Tile[]): { board: Board; tiles: Tile[] } {
  const empty: [number, number][] = []
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) empty.push([i, j])
    }
  }
  if (empty.length === 0) return { board, tiles }
  const [x, y] = empty[Math.floor(Math.random() * empty.length)]
  const newBoard = board.map((row) => [...row])
  const value = Math.random() < 0.9 ? 2 : 4
  newBoard[x][y] = value
  const newTile: Tile = {
    id: nextTileId++,
    value,
    row: x,
    col: y,
    isNew: true,
  }
  return { board: newBoard, tiles: [...tiles, newTile] }
}

function initBoard(): { board: Board; tiles: Tile[] } {
  let board = createEmptyBoard()
  let tiles: Tile[] = []
  const result1 = addRandomTile(board, tiles)
  board = result1.board
  tiles = result1.tiles
  const result2 = addRandomTile(board, tiles)
  board = result2.board
  tiles = result2.tiles
  return { board, tiles }
}

// Rotate a tile's position 90 degrees clockwise (board[row][col] -> new[col][size-1-row])
function rotateTile(row: number, col: number, size: number): { row: number; col: number } {
  return { row: col, col: size - 1 - row }
}

// Apply rotation multiple times
function rotateTileN(row: number, col: number, size: number, times: number): { row: number; col: number } {
  let r = row, c = col
  for (let i = 0; i < times; i++) {
    const rotated = rotateTile(r, c, size)
    r = rotated.row
    c = rotated.col
  }
  return { row: r, col: c }
}

function moveLeftTiles(tiles: Tile[]): { tiles: Tile[]; score: number; moved: boolean } {
  let score = 0
  let moved = false
  const size = GRID_SIZE
  
  // Group tiles by row
  const rows: Tile[][] = Array.from({ length: size }, () => [])
  for (const tile of tiles) {
    rows[tile.row].push(tile)
  }
  
  const newTiles: Tile[] = []
  
  for (let r = 0; r < size; r++) {
    const rowTiles = rows[r].sort((a, b) => a.col - b.col)
    const resultRow: Tile[] = []
    
    // Filter non-zero tiles
    let filtered = rowTiles.filter(t => t.value !== 0)
    
    // Merge tiles
    let i = 0
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
        // Merge: double the value, mark as merged
        const mergedValue = filtered[i].value * 2
        score += mergedValue
        const mergedTile: Tile = {
          id: nextTileId++,
          value: mergedValue,
          row: r,
          col: resultRow.length,
          isMerged: true,
        }
        resultRow.push(mergedTile)
        i += 2
      } else {
        resultRow.push({ ...filtered[i], row: r, col: resultRow.length })
        i++
      }
    }
    
    // Check if any tile moved
    for (const tile of rowTiles) {
      const newPos = resultRow.find(t => t.id === tile.id)
      if (!newPos || newPos.col !== tile.col || newPos.row !== tile.row) {
        moved = true
        break
      }
    }
    
    newTiles.push(...resultRow)
  }
  
  return { tiles: newTiles, score, moved }
}

function moveTiles(tiles: Tile[], direction: 'left' | 'right' | 'up' | 'down'): { tiles: Tile[]; score: number; moved: boolean } {
  const size = GRID_SIZE
  
  if (direction === 'left') {
    return moveLeftTiles(tiles)
  }
  
  // For other directions, rotate tiles, move left, then rotate back
  let rotationCount: number
  if (direction === 'up') {
    // Up: rotate clockwise 3 times (= counter-clockwise once), move left, rotate back (1 CW)
    rotationCount = 3
  } else if (direction === 'down') {
    // Down: rotate clockwise once, move left, rotate back (3 CW = counter-clockwise once)
    rotationCount = 1
  } else { // right
    // Right: rotate clockwise twice (= 180), move left, rotate clockwise twice
    rotationCount = 2
  }
  
  // Rotate tiles
  const rotatedTiles = tiles.map(t => {
    const newPos = rotateTileN(t.row, t.col, size, rotationCount)
    return { ...t, row: newPos.row, col: newPos.col }
  })
  
  // Move left
  const { tiles: movedTiles, score, moved } = moveLeftTiles(rotatedTiles)
  
  if (!moved) return { tiles, score: 0, moved: false }
  
  // Rotate back
  const backRotationCount = (4 - rotationCount) % 4
  const finalTiles = movedTiles.map(t => {
    const newPos = rotateTileN(t.row, t.col, size, backRotationCount)
    return { ...t, row: newPos.row, col: newPos.col }
  })
  
  return { tiles: finalTiles, score, moved }
}

function tilesToBoard(tiles: Tile[]): Board {
  const board = createEmptyBoard()
  for (const tile of tiles) {
    if (tile.value !== 0) {
      board[tile.row][tile.col] = tile.value
    }
  }
  return board
}

function isGameOver(board: Board): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) return false
      if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return false
      if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return false
    }
  }
  return true
}

function hasWon(board: Board): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] >= 2048) return true
    }
  }
  return false
}

const TILE_COLORS: Record<number, string> = {
  2: 'bg-[#eee4da] text-[#776e65]',
  4: 'bg-[#ede0c8] text-[#776e65]',
  8: 'bg-[#f2b179] text-white',
  16: 'bg-[#f59563] text-white',
  32: 'bg-[#f67c5f] text-white',
  64: 'bg-[#f65e3b] text-white',
  128: 'bg-[#edcf72] text-white',
  256: 'bg-[#edcc61] text-white',
  512: 'bg-[#edc850] text-white',
  1024: 'bg-[#edc53f] text-white',
  2048: 'bg-[#edc22e] text-white',
}

const TILE_SIZES: Record<number, string> = {
  2: 'text-2xl',
  4: 'text-2xl',
  8: 'text-2xl',
  16: 'text-2xl',
  32: 'text-2xl',
  64: 'text-2xl',
  128: 'text-xl',
  256: 'text-xl',
  512: 'text-xl',
  1024: 'text-lg',
  2048: 'text-lg',
}

export default function Game2048Page() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && Array.isArray(parsed.tiles)) {
          nextTileId = Math.max(...parsed.tiles.map((t: Tile) => t.id), 0) + 1
          return parsed.tiles
        }
      } catch {}
    }
    const { tiles: initTiles } = initBoard()
    return initTiles
  })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Save game state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tiles }))
  }, [tiles])

  const gameAction = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return

    const { tiles: movedTiles, score: moveScore, moved } = moveTiles(tiles, direction)
    
    if (!moved) return

    // Add new random tile (marked as isNew for spawn animation)
    const boardAfterMove = tilesToBoard(movedTiles)
    const { tiles: tilesWithNew } = addRandomTile(boardAfterMove, movedTiles)
    
    // Keep isMerged flags from moveTiles and isNew from addRandomTile for animation
    setTiles(tilesWithNew)
    
    const newScore = score + moveScore
    setScore(newScore)

    if (!won && hasWon(tilesToBoard(tilesWithNew))) {
      setWon(true)
    }

    if (isGameOver(tilesToBoard(tilesWithNew))) {
      setGameOver(true)
    }
    
    // Clear animation flags after animation completes
    setTimeout(() => {
      setTiles(prev => prev.map(t => ({ ...t, isNew: false, isMerged: false })))
    }, 250)
  }, [tiles, score, gameOver, won])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          gameAction('left')
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          gameAction('right')
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          gameAction('up')
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          gameAction('down')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameAction, gameOver])

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y
    const minSwipe = 50

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        gameAction(deltaX > 0 ? 'right' : 'left')
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        gameAction(deltaY > 0 ? 'down' : 'up')
      }
    }
    touchStart.current = null
  }

  const resetGame = () => {
    const { tiles: initTiles } = initBoard()
    setTiles(initTiles)
    setScore(0)
    setGameOver(false)
    setWon(false)
    setSubmitted(false)
    setLeaderboardRefreshKey(k => k + 1)
  }

  const submitScoreHandler = async () => {
    if (!user || submitted) return
    setSubmitting(true)
    const result = await submitScore('2048', score)
    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
      // Refresh leaderboard
      setLeaderboardRefreshKey(k => k + 1)
    }
  }

  // Calculate tile positions for animation
  const boardSize = 4
  const tileSize = 80 // w-20 = 80px for sm, w-16 = 64px default
  const gapSize = 12 // gap-3 = 12px
  
  const getTilePositionStyle = (tile: Tile) => {
    const x = tile.col * (tileSize + gapSize)
    const y = tile.row * (tileSize + gapSize)
    
    return {
      position: 'absolute' as const,
      width: `${tileSize}px`,
      height: `${tileSize}px`,
      transform: `translate3d(${x}px, ${y}px, 0)`,
      transition: 'transform 0.12s ease-in-out',
      zIndex: tile.isMerged ? 2 : 1,
    }
  }

  const getTileAnimationStyle = (tile: Tile) => {
    if (tile.isNew) {
      return { animation: 'tile-pop 0.2s ease-out' }
    }
    if (tile.isMerged) {
      return { animation: 'tile-merge 0.2s ease-out' }
    }
    return {}
  }

  return (
    <LabLayout
      title={t('lab.games.game2048.title')}
      description={t('lab.games.game2048.desc')}
    >
      <div className="space-y-6">
        {/* Score Display */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="bg-theme-tertiary rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-theme-secondary">{t('lab.games.score')}</p>
              <p className="text-2xl font-bold text-primary">{score}</p>
            </div>
          </div>
          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            {t('lab.games.restart')}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-theme-tertiary rounded-lg p-4 text-sm text-theme-secondary">
          <p className="font-semibold text-theme-on-surface mb-2">{t('lab.games.game2048.operationTitle')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-mono bg-theme-color px-2 py-0.5 rounded">↑ ↓ ← →</span> {t('lab.games.game2048.keyboardControl')}</li>
            <li><span className="font-mono bg-theme-color px-2 py-0.5 rounded">W A S D</span> {t('lab.games.game2048.wasdControl')}</li>
            <li>{t('lab.games.game2048.mobileControl')}</li>
            <li>{t('lab.games.game2048.goal')}</li>
          </ul>
        </div>

        {/* Game Board */}
        <div
          className="relative bg-[#bbada0] rounded-xl p-3 mx-auto"
          style={{ width: `${boardSize * tileSize + (boardSize + 1) * gapSize}px` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background grid */}
          <div className="grid grid-cols-4 gap-3 relative" style={{ width: `${boardSize * tileSize + (boardSize - 1) * gapSize}px` }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={`bg-${i}`}
                className={`rounded-lg ${TILE_COLORS[0] || 'bg-slate-700/50'}`}
                style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
              />
            ))}
            
            {/* Animated tiles */}
            {tiles.map((tile) => (
              <div
                key={tile.id}
                style={getTilePositionStyle(tile)}
              >
                <div
                  className={`w-full h-full rounded-lg flex items-center justify-center font-bold ${
                    TILE_COLORS[tile.value] || 'bg-yellow-700 text-white'
                  } ${TILE_SIZES[tile.value] || 'text-lg'}`}
                  style={getTileAnimationStyle(tile)}
                >
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {/* Game Over / Win Overlay */}
          {(gameOver || won) && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center z-50">
              <h2 className="text-3xl font-bold text-white mb-4">
                {won && !gameOver ? t('lab.games.youWin') : t('lab.games.gameOver')}
              </h2>
              <p className="text-white mb-6">
                {t('lab.games.finalScore')}: {score}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={resetGame}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t('lab.games.playAgain')}
                </button>
                {user ? (
                  <button
                    onClick={submitScoreHandler}
                    disabled={submitting || submitted || score <= 0}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {submitted ? t('lab.games.submitted') : t('lab.games.submitScore')}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    {t('lab.games.loginToSubmit')}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard with refresh key */}
        <Leaderboard gameType="2048" refreshKey={leaderboardRefreshKey} />
      </div>

      {/* Tile animations */}
      <style>{`
        @keyframes tile-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes tile-merge {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-tile-pop {
          animation: tile-pop 0.2s ease-out;
        }
        .animate-tile-merge {
          animation: tile-merge 0.2s ease-out;
        }
      `}</style>
    </LabLayout>
  )
}
