import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { gameAudio } from './GameAudioManager'

export type GameState = 'ready' | 'playing' | 'dying' | 'gameover'

export interface GameStats {
  score: number
  distance: number
  speed: number
  coins: number
  powerups: { shield: number; magnet: number; doubleScore: number }
}

// ==================== 游戏配置常量 ====================
const CONFIG: {
  LANE_WIDTH: number
  LANE_POSITIONS: number[]
  PLAYER_START_SPEED: number
  MAX_SPEED: number
  SPEED_INCREMENT: number
  JUMP_VELOCITY: number
  GRAVITY: number
  SLIDE_DURATION: number
  SPAWN_INTERVAL: number
  DESPAWN_Z: number
  COIN_VALUE: number
  POWERUP_DURATION: number
  SHIELD_DURATION: number
  MAGNET_RANGE: number
  BASE_SCORE_PER_SECOND: number
  TRACK_SEGMENT_LENGTH: number
  VISIBLE_SEGMENTS: number
} = {
  LANE_WIDTH: 2.5,
  LANE_POSITIONS: [-2.5, 0, 2.5],
  PLAYER_START_SPEED: 15,
  MAX_SPEED: 55,
  SPEED_INCREMENT: 0.6,
  JUMP_VELOCITY: 16,
  GRAVITY: 45,
  SLIDE_DURATION: 0.6,
  // 生成间隔调大：因障碍物从远处生成（z≈-115），到达玩家需要更长时间
  // 调整后约 2-3 个障碍物同时在屏幕上
  SPAWN_INTERVAL: 3.5,
  DESPAWN_Z: -15,
  COIN_VALUE: 100,
  POWERUP_DURATION: 8,
  SHIELD_DURATION: 6,
  MAGNET_RANGE: 4,
  BASE_SCORE_PER_SECOND: 10,
  TRACK_SEGMENT_LENGTH: 30,
  VISIBLE_SEGMENTS: 3,
}

interface SubwaySurferGameProps {
  onGameStateChange?: (state: GameState) => void
  onStatsUpdate?: (stats: GameStats) => void
  onPowerupPickup?: (type: 'shield' | 'magnet' | 'double') => void
  supabase?: any
  user?: any
}

// ==================== 实体创建函数 ====================
function createPlayer(): THREE.Group {
  const group = new THREE.Group()

  // 身体
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 })
  )
  body.position.y = 0.8
  body.castShadow = true
  group.add(body)

  // 头
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 })
  )
  head.position.y = 1.55
  head.castShadow = true
  group.add(head)

  // 腿
  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.4, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1e3a5f })
  )
  leftLeg.position.set(-0.15, 0.2, 0)
  leftLeg.castShadow = true
  group.add(leftLeg)

  const rightLeg = leftLeg.clone()
  rightLeg.position.x = 0.15
  group.add(rightLeg)

  // 手臂
  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.5, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
  )
  leftArm.position.set(-0.5, 0.9, 0)
  leftArm.castShadow = true
  group.add(leftArm)

  const rightArm = leftArm.clone()
  rightArm.position.x = 0.5
  group.add(rightArm)

  // 护盾
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
      side: THREE.DoubleSide,
    })
  )
  shield.position.y = 0.9
  shield.visible = false
  shield.name = 'shield'
  group.add(shield)

  return group
}

function createBarrier(): THREE.Group {
  const group = new THREE.Group()

  // 横栏（需跳跃）
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.4, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7 })
  )
  bar.position.y = 1.2
  bar.castShadow = true
  group.add(bar)

  // 支柱
  const postGeo = new THREE.BoxGeometry(0.12, 2, 0.12)
  const postMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 })
  const leftPost = new THREE.Mesh(postGeo, postMat)
  leftPost.position.set(-1.05, 1.2, 0)
  leftPost.castShadow = true
  group.add(leftPost)

  const rightPost = new THREE.Mesh(postGeo, postMat)
  rightPost.position.set(1.05, 1.2, 0)
  rightPost.castShadow = true
  group.add(rightPost)

  group.userData.type = 'barrier'
  group.userData.height = 1.4
  return group
}

// 双跑道障碍物 - 横跨两个车道
function createWideBarrier(): THREE.Group {
  const group = new THREE.Group()

  // 主体 - 横跨 2 个车道（宽度 = 2 * LANE_WIDTH = 5）
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.0, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
      metalness: 0.3,
    })
  )
  body.position.y = 0.6
  body.castShadow = true
  group.add(body)

  // 顶部警示条
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xff4400,
    emissiveIntensity: 0.5,
  })
  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.1, 0.42),
      stripeMat
    )
    stripe.position.set(i * 0.9, 1.15, 0)
    group.add(stripe)
  }

  // 支柱
  const postGeo = new THREE.BoxGeometry(0.15, 0.6, 0.5)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x374151 })
  const post1 = new THREE.Mesh(postGeo, postMat)
  post1.position.set(-2.6, 0.3, 0)
  post1.castShadow = true
  group.add(post1)
  const post2 = new THREE.Mesh(postGeo, postMat)
  post2.position.set(2.6, 0.3, 0)
  post2.castShadow = true
  group.add(post2)

  group.userData.type = 'wideBarrier'
  return group
}

function createTrain(): THREE.Group {
  const group = new THREE.Group()

  // 真实地铁车厢尺寸（单位：米）
  const W = 2.2   // 宽度（ fits in 2.5m lane ）
  const H = 2.5   // 高度
  const L = 7.0   // 长度（一节车厢）

  // 主车身
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, L),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.4, metalness: 0.6 })
  )
  body.position.y = H / 2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // 车顶（略窄，营造弧形车顶效果）
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.85, 0.2, L * 0.95),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.5 })
  )
  roof.position.y = H + 0.1
  roof.castShadow = true
  group.add(roof)

  // 侧窗材质（发光蓝玻璃）
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x1e40af,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.8,
  })

  // 两侧车窗（沿长度方向均匀分布）
  const windowCount = 4
  const windowSpacing = (L - 1.5) / windowCount
  for (const side of [-1, 1]) {
    for (let i = 0; i < windowCount; i++) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.6, 0.9),
        winMat
      )
      const zPos = -L / 2 + 0.9 + i * windowSpacing
      win.position.set(side * (W / 2 + 0.01), H * 0.65, zPos)
      group.add(win)
    }
  }

  // 前挡风玻璃（面向玩家方向，+Z 面）
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.7, 0.8, 0.05),
    winMat
  )
  windshield.position.set(0, H * 0.65, L / 2 + 0.01)
  group.add(windshield)

  // 前车灯（两个，位于前下部）
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffcc,
    emissiveIntensity: 1.2,
  })
  for (const dx of [-W * 0.3, W * 0.3]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), headlightMat)
    hl.position.set(dx, 0.5, L / 2 + 0.05)
    group.add(hl)
  }

  // 底部裙板
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.95, 0.3, L),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.3 })
  )
  skirt.position.y = 0.15
  group.add(skirt)

  // 侧面黄色装饰条（贯穿全长）
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, L * 0.92),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.4,
      })
    )
    stripe.position.set(side * (W / 2 + 0.01), 0.55, 0)
    group.add(stripe)
  }

  // 前部警示灯条
  const frontStripe = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.9, 0.06, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.5,
    })
  )
  frontStripe.position.set(0, 0.55, L / 2 + 0.02)
  group.add(frontStripe)

  group.userData.type = 'train'
  group.userData.height = H
  group.userData.length = L
  return group
}

function createHighBar(): THREE.Group {
  const group = new THREE.Group()

  // 高空横杆（需滑铲通过）
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.3, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
  )
  bar.position.y = 2.2
  bar.castShadow = true
  group.add(bar)

  const supportGeo = new THREE.BoxGeometry(0.1, 2.8, 0.1)
  const supportMat = new THREE.MeshStandardMaterial({ color: 0xd97706 })
  const leftSupport = new THREE.Mesh(supportGeo, supportMat)
  leftSupport.position.set(-1.05, 1.4, 0)
  leftSupport.castShadow = true
  group.add(leftSupport)

  const rightSupport = new THREE.Mesh(supportGeo, supportMat)
  rightSupport.position.set(1.05, 1.4, 0)
  rightSupport.castShadow = true
  group.add(rightSupport)

  group.userData.type = 'highBar'
  group.userData.height = 1.8
  return group
}

function createCoin(): THREE.Group {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xff8800,
      emissiveIntensity: 0.3,
    })
  )
  mesh.rotation.x = Math.PI / 2
  mesh.castShadow = true
  group.add(mesh)
  group.userData.type = 'coin'
  return group
}

function createPowerup(type: 'shield' | 'magnet' | 'double'): THREE.Group {
  const group = new THREE.Group()

  let color: number
  let geometry: THREE.BufferGeometry

  switch (type) {
    case 'shield':
      color = 0x00aaff
      geometry = new THREE.OctahedronGeometry(0.45)
      break
    case 'magnet':
      color = 0xff00aa
      geometry = new THREE.TorusGeometry(0.35, 0.12, 8, 20)
      break
    case 'double':
      color = 0x00ff00
      geometry = new THREE.IcosahedronGeometry(0.4)
      break
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.7,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.5,
    })
  )
  mesh.castShadow = true
  group.add(mesh)
  group.userData.type = 'powerup'
  group.userData.powerupType = type
  return group
}

function createTrackSegment(): THREE.Group {
  const group = new THREE.Group()

  // 跑道
  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.LANE_WIDTH * 3, CONFIG.TRACK_SEGMENT_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
  )
  track.rotation.x = -Math.PI / 2
  track.receiveShadow = true
  group.add(track)

  // 车道线（虚线效果）
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5 })
  for (let i = 1; i <= 2; i++) {
    const xPos = -CONFIG.LANE_WIDTH * 1.5 + CONFIG.LANE_WIDTH * i
    for (let j = 0; j < 8; j++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.02, 1.5),
        lineMat
      )
      line.position.set(xPos, 0.01, -CONFIG.TRACK_SEGMENT_LENGTH / 2 + j * (CONFIG.TRACK_SEGMENT_LENGTH / 8) + 1)
      group.add(line)
    }
  }

  // 两侧路缘
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.15, CONFIG.TRACK_SEGMENT_LENGTH),
      curbMat
    )
    curb.position.set(side * CONFIG.LANE_WIDTH * 1.7 - side * 0.15, 0.08, 0)
    curb.receiveShadow = true
    group.add(curb)
  }

  return group
}

// ==================== 城市环境创建 ====================
// 性能优化：使用 CanvasTexture 在建筑表面绘制窗户，
// 避免每个窗户创建独立 mesh（原来一栋楼可能有数百个 mesh）

const BUILDING_COLORS = [
  0xcbd5e1, 0x94a3b8, 0xb0bec5, 0xa8a29e, 0x9ca3af,
  0xd6d3d1, 0xe7e5e4, 0xa3a3a3, 0xb8c5d6, 0x9eb8d6,
]

// 共享几何体 - 避免每栋楼创建新 BoxGeometry
const sharedBuildingGeo = new THREE.BoxGeometry(1, 1, 1)

// 生成带窗户的纹理（一栋楼复用一张）
function makeWindowTexture(width: number, height: number, baseColor: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  // 建筑底色
  const hex = '#' + baseColor.toString(16).padStart(6, '0')
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 64, 128)

  // 窗户网格
  const cols = Math.max(2, Math.floor(width / 0.6))
  const rows = Math.max(3, Math.floor(height / 0.8))
  const padX = 4
  const padY = 4
  const winW = (64 - padX * (cols + 1)) / cols
  const winH = (128 - padY * (rows + 1)) / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() < 0.55
      if (lit) {
        // 亮窗 - 暖色（白天反光玻璃）
        const shade = 0.5 + Math.random() * 0.5
        ctx.fillStyle = `rgba(${Math.floor(180 + shade * 60)}, ${Math.floor(200 + shade * 50)}, ${Math.floor(220 + shade * 35)}, 1)`
      } else {
        // 暗窗
        ctx.fillStyle = '#3b4252'
      }
      const x = padX + c * (winW + padX)
      const y = padY + r * (winH + padY)
      ctx.fillRect(x, y, winW, winH)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  return tex
}

function createBuilding(): THREE.Group {
  const group = new THREE.Group()

  const width = 2 + Math.random() * 2.5
  const depth = 2 + Math.random() * 2
  const height = 4 + Math.random() * 18

  const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)]
  const winTex = makeWindowTexture(width, height, color)

  // 用一个 Box + 纹理材质代替无数窗户 mesh
  const mat = new THREE.MeshStandardMaterial({
    map: winTex,
    color: 0xffffff,
    roughness: 0.6 + Math.random() * 0.2,
    metalness: 0.1 + Math.random() * 0.2,
  })
  const body = new THREE.Mesh(sharedBuildingGeo, mat)
  body.scale.set(width, height, depth)
  body.position.y = height / 2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // 顶部装饰
  if (Math.random() < 0.5) {
    const roof = new THREE.Mesh(
      sharedBuildingGeo,
      new THREE.MeshStandardMaterial({ color: 0x4b5563 })
    )
    roof.scale.set(width * 0.4, 0.5, depth * 0.4)
    roof.position.y = height + 0.25
    roof.castShadow = true
    group.add(roof)
  }

  group.userData.type = 'building'
  group.userData.width = width
  group.userData.depth = depth
  return group
}

function createStreetLight(): THREE.Group {
  const group = new THREE.Group()

  // 灯柱 - 共享几何体
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.3 })
  )
  pole.position.y = 1.5
  pole.castShadow = true
  group.add(pole)

  // 灯头
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x374151 })
  )
  arm.position.set(0.2, 2.9, 0)
  group.add(arm)

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff4e0,
      emissive: 0xfff4e0,
      emissiveIntensity: 0.3, // 白天降低发光强度
    })
  )
  lamp.position.set(0.4, 2.85, 0)
  group.add(lamp)

  // 不再使用 PointLight - 这是性能杀手（每个路灯一个动态光源）
  // 仅保留 emissive 材质模拟灯泡外观

  group.userData.type = 'streetLight'
  return group
}

function createCitySegment(): { group: THREE.Group } {
  const group = new THREE.Group()

  const segmentLength = CONFIG.TRACK_SEGMENT_LENGTH
  const laneEdge = CONFIG.LANE_WIDTH * 1.5 // 跑道边缘 x = ±3.75

  // 建筑布局：严格在跑道外侧
  // 每侧: 前排 (离跑道近) 和 后排 (更远)
  for (const side of [-1, 1]) {
    // 前排建筑 - 紧邻跑道外
    const frontCount = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < frontCount; i++) {
      const building = createBuilding()
      // 确保在跑道外至少 0.5 单位
      const xPos = side * (laneEdge + 0.5 + building.userData.depth / 2 + Math.random() * 1.5)
      // 沿 Z 均匀分布在 segment 范围内
      const zOffset = ((i + 0.5) / frontCount - 0.5) * segmentLength * 0.85
      building.position.set(xPos, 0, zOffset)
      group.add(building)
    }

    // 后排建筑 - 更远更高
    const backCount = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < backCount; i++) {
      const building = createBuilding()
      const xPos = side * (laneEdge + 6 + Math.random() * 3)
      const zOffset = ((i + 0.5) / backCount - 0.5) * segmentLength * 0.7
      building.position.set(xPos, 0, zOffset)
      group.add(building)
    }
  }

  // 路灯 - 固定在跑道边缘，与建筑 Z 错开
  for (const side of [-1, 1]) {
    const light = createStreetLight()
    // 路灯放在跑道边，绝不能和建筑重叠
    light.position.set(side * (laneEdge + 0.3), 0, -segmentLength * 0.3)
    light.rotation.y = side > 0 ? Math.PI : 0 // 灯头朝向跑道
    group.add(light)
  }

  group.userData.type = 'citySegment'
  return { group }
}

// ==================== 主游戏组件 ====================
export default function SubwaySurferGame({
  onGameStateChange,
  onStatsUpdate,
  onPowerupPickup,
}: SubwaySurferGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setGameState] = useState<GameState>('ready')
  const gameStateRef = useRef<GameState>('ready')

  // Three.js 引用
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const playerRef = useRef<THREE.Group | null>(null)
  const trackSegmentsRef = useRef<THREE.Group[]>([])
  const citySegmentsRef = useRef<THREE.Group[]>([])
  const obstaclesRef = useRef<THREE.Group[]>([])
  const coinsRef = useRef<THREE.Group[]>([])
  const powerupsRef = useRef<THREE.Group[]>([])
  const rafRef = useRef<number>(0)
  const clockRef = useRef<THREE.Clock | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const bloomPassRef = useRef<UnrealBloomPass | null>(null)

  // 游戏状态
  const playerStateRef = useRef({
    lane: 1,
    targetX: 0,
    y: 0,
    velocityY: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    legPhase: 0,
    pendingSlide: false, // 跳跃中按下蹲伏，落地后立即触发滑铲
  })

  const gameDataRef = useRef({
    score: 0,
    distance: 0,
    speed: CONFIG.PLAYER_START_SPEED,
    coinCount: 0,
    spawnTimer: 0,
    powerupStates: { shield: 0, magnet: 0, doubleScore: 0 },
  })

  // 几何体/材质缓存
  const geoCacheRef = useRef<{
    barrier?: THREE.Group
    wideBarrier?: THREE.Group
    train?: THREE.Group
    highBar?: THREE.Group
    coin?: THREE.Group
    shieldPowerup?: THREE.Group
    magnetPowerup?: THREE.Group
    doublePowerup?: THREE.Group
    trackSegment?: THREE.Group
  }>({})

  // ==================== 初始化 ====================
  const initGame = useCallback(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // 场景 - 白天蓝天
    const scene = new THREE.Scene()
    // 渐变天空纹理
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 4
    skyCanvas.height = 256
    const skyCtx = skyCanvas.getContext('2d')!
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#3b82f6')   // 顶部 - 深蓝
    grad.addColorStop(0.5, '#7dd3fc') // 中部 - 浅蓝
    grad.addColorStop(1, '#dbeafe')   // 地平线 - 米白
    skyCtx.fillStyle = grad
    skyCtx.fillRect(0, 0, 4, 256)
    const skyTexture = new THREE.CanvasTexture(skyCanvas)
    scene.background = skyTexture
    // 雾色与地平线匹配，远距离淡出
    scene.fog = new THREE.Fog(0xcfe8ff, 40, 110)
    sceneRef.current = scene

    // 相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200)
    camera.position.set(0, 4.5, 8)
    camera.lookAt(0, 1, -5)
    cameraRef.current = camera

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 时钟
    clockRef.current = new THREE.Clock()

    // 后处理管线
    const composer = new EffectComposer(renderer)
    composer.setSize(width, height)

    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    // Bloom - 发光效果（保留轻度发光）
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.3,  // strength - 降低避免过曝
      0.4,  // radius
      0.7   // threshold - 只让很亮的物体发光
    )
    composer.addPass(bloomPass)
    bloomPassRef.current = bloomPass

    composerRef.current = composer

    // 灯光 - 白天阳光氛围
    const ambient = new THREE.AmbientLight(0xb0c4de, 0.7)
    scene.add(ambient)

    // 主太阳光 - 暖白色
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
    sunLight.position.set(-15, 25, 10)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 1024
    sunLight.shadow.mapSize.height = 1024
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 80
    sunLight.shadow.camera.left = -25
    sunLight.shadow.camera.right = 25
    sunLight.shadow.camera.top = 25
    sunLight.shadow.camera.bottom = -25
    sunLight.shadow.bias = -0.001
    scene.add(sunLight)

    // 前方补光 - 让玩家正面可见
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.4)
    frontLight.position.set(0, 5, 15)
    scene.add(frontLight)

    // 半球光 - 天空蓝（上）+ 地面反射（下）
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b7280, 0.6)
    scene.add(hemiLight)

    // 地面 - 浅色沥青路面（白天）
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 400),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.95 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // 白云 - 用合并的球体组成蓬松云朵
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      fog: false, // 云不受雾影响，避免消失
    })
    const cloudGeo = new THREE.SphereGeometry(1, 8, 6)
    for (let i = 0; i < 18; i++) {
      // 由若干球体组合成蓬松云朵
      const puffCount = 4 + Math.floor(Math.random() * 3)
      const cloudGroup = new THREE.Group()
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat)
        puff.position.set(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 4
        )
        puff.scale.setScalar(1 + Math.random() * 0.8)
        cloudGroup.add(puff)
      }
      // 随机位置 - 高空、跑道两侧远处
      cloudGroup.position.set(
        (Math.random() - 0.5) * 180,
        25 + Math.random() * 15,
        -Math.random() * 180 - 20
      )
      cloudGroup.scale.setScalar(2.5 + Math.random() * 2)
      scene.add(cloudGroup)
    }

    // 远景城市剪影 - 浅蓝色，模拟远景天际线
    const silhouetteGeo = new THREE.BufferGeometry()
    const silPositions: number[] = []
    for (let i = 0; i < 60; i++) {
      const x = -80 + (i / 60) * 160
      const h = 8 + Math.sin(i * 0.3) * 5 + Math.random() * 8
      const w = 3 + Math.random() * 5
      silPositions.push(x, h / 2, -60, x + w, h / 2, -60, x + w, 0, -60, x, 0, -60)
    }
    silhouetteGeo.setAttribute('position', new THREE.Float32BufferAttribute(silPositions, 3))
    silhouetteGeo.computeVertexNormals()
    const silhouette = new THREE.Mesh(
      silhouetteGeo,
      new THREE.MeshBasicMaterial({ color: 0x9eb8d6, transparent: true, opacity: 0.7, fog: false })
    )
    scene.add(silhouette)

    // 玩家
    const player = createPlayer()
    player.position.set(0, 0, 0)
    scene.add(player)
    playerRef.current = player

    // 缓存模板
    geoCacheRef.current = {
      barrier: createBarrier(),
      wideBarrier: createWideBarrier(),
      train: createTrain(),
      highBar: createHighBar(),
      coin: createCoin(),
      shieldPowerup: createPowerup('shield'),
      magnetPowerup: createPowerup('magnet'),
      doublePowerup: createPowerup('double'),
      trackSegment: createTrackSegment(),
    }

    // 跑道段
    for (let i = 0; i < CONFIG.VISIBLE_SEGMENTS; i++) {
      const seg = createTrackSegment()
      seg.position.z = -i * CONFIG.TRACK_SEGMENT_LENGTH + 10
      scene.add(seg)
      trackSegmentsRef.current.push(seg)
    }

    // 城市环境段 - 更密集的城市，立即可见
    const CITY_SEGMENTS = 6
    for (let i = 0; i < CITY_SEGMENTS; i++) {
      const { group } = createCitySegment()
      // 从玩家前方开始（负 Z 是前方），第一个段直接在玩家面前
      group.position.z = -i * CONFIG.TRACK_SEGMENT_LENGTH + 5
      scene.add(group)
      citySegmentsRef.current.push(group)
    }

    // 事件监听 - 窗口大小变化
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      const composer = composerRef.current
      if (composer) composer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // 触摸事件
    let touchStartX = 0
    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }
    const handleTouchEnd = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartX
      const dy = touch.clientY - touchStartY
      const threshold = 30

      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > threshold) {
          if (dx > 0) moveLane(1)
          else moveLane(-1)
        }
      } else {
        if (Math.abs(dy) > threshold) {
          if (dy < 0) jump()
          else slide()
        }
      }
    }

    renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: true })
    renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: true })

    // 开始动画循环
    clockRef.current.start()
    animate()

    // 清理函数保存
    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('touchstart', handleTouchStart)
      renderer.domElement.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(rafRef.current)

      // 卸载时停止 BGM，避免离开页面后音乐继续播放
      gameAudio.stopBGM()
      
      // 清理后处理
      const composer = composerRef.current
      if (composer) {
        composer.passes.forEach((pass: any) => {
          if (pass.dispose) pass.dispose()
        })
      }
      
      renderer.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [])

  const cleanupRef = useRef<(() => void) | null>(null)

  // ==================== 键盘控制 ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          moveLane(-1)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          moveLane(1)
          break
        case 'ArrowUp':
        case ' ':
        case 'Spacebar':
          e.preventDefault()
          jump()
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          slide()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const moveLane = (dir: number) => {
    const state = playerStateRef.current
    const newLane = Math.max(0, Math.min(2, state.lane + dir))
    if (newLane !== state.lane) {
      state.lane = newLane
      state.targetX = CONFIG.LANE_POSITIONS[newLane]
    }
  }

  const jump = () => {
    const state = playerStateRef.current
    // 跳跃允许在地面或滑铲时触发（取消滑铲起跳）
    if (!state.isJumping) {
      state.isJumping = true
      state.isSliding = false
      state.slideTimer = 0
      state.velocityY = CONFIG.JUMP_VELOCITY
      if (playerRef.current) {
        playerRef.current.scale.y = 1
      }
      gameAudio.play('jump')
    }
  }

  const slide = () => {
    const state = playerStateRef.current
    if (state.isSliding) return

    if (state.isJumping) {
      // 空中按下蹲伏：快速下落，落地后立即触发滑铲
      state.velocityY = -CONFIG.JUMP_VELOCITY * 1.8 // 强力下坠
      state.pendingSlide = true
      return
    }

    // 地面正常滑铲
    state.isSliding = true
    state.slideTimer = CONFIG.SLIDE_DURATION
    if (playerRef.current) {
      playerRef.current.scale.y = 0.5
      playerRef.current.position.y = 0
    }
    gameAudio.play('click')
  }

  // ==================== 生成/回收实体 ====================
  const spawnObstacle = useCallback((zPos: number) => {
    const scene = sceneRef.current
    if (!scene) return

    const types = ['barrier', 'train', 'highBar', 'wideBarrier'] as const
    const type = types[Math.floor(Math.random() * types.length)]

    if (type === 'wideBarrier') {
      // 双跑道障碍物 - 横跨车道 0-1 或 1-2
      const laneGroup = Math.floor(Math.random() * 2) // 0 = lanes 0,1; 1 = lanes 1,2
      const centerLane = laneGroup === 0 ? 0 : 1 // 障碍物中心位置
      const template = geoCacheRef.current.wideBarrier
      if (!template) return

      const obstacle = template.clone(true)
      // 放在两条车道中间
      obstacle.position.set(
        (CONFIG.LANE_POSITIONS[centerLane] + CONFIG.LANE_POSITIONS[centerLane + 1]) / 2,
        0,
        zPos
      )
      obstacle.userData.type = 'wideBarrier'
      obstacle.userData.lanes = [centerLane, centerLane + 1]
      scene.add(obstacle)
      obstaclesRef.current.push(obstacle)
      return
    }

    const lane = Math.floor(Math.random() * 3)
    let template: THREE.Group | undefined
    if (type === 'barrier') template = geoCacheRef.current.barrier
    else if (type === 'train') template = geoCacheRef.current.train
    else template = geoCacheRef.current.highBar

    if (!template) return

    const obstacle = template.clone(true)
    obstacle.position.set(CONFIG.LANE_POSITIONS[lane], 0, zPos)
    obstacle.userData.lane = lane
    obstacle.userData.type = type
    scene.add(obstacle)
    obstaclesRef.current.push(obstacle)
  }, [])

  const spawnCoins = useCallback((zPos: number) => {
    const scene = sceneRef.current
    if (!scene) return

    const lane = Math.floor(Math.random() * 3)
    const count = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < count; i++) {
      const coin = geoCacheRef.current.coin!.clone(true)
      coin.position.set(
        CONFIG.LANE_POSITIONS[lane],
        1.2 + Math.sin(i * 0.5) * 0.2,
        zPos - i * 1.2
      )
      scene.add(coin)
      coinsRef.current.push(coin)
    }
  }, [])

  const spawnPowerup = useCallback((zPos: number) => {
    const scene = sceneRef.current
    if (!scene) return

    const lane = Math.floor(Math.random() * 3)
    const types = ['shield', 'magnet', 'double'] as const
    const type = types[Math.floor(Math.random() * types.length)]

    let template: THREE.Group | undefined
    if (type === 'shield') template = geoCacheRef.current.shieldPowerup
    else if (type === 'magnet') template = geoCacheRef.current.magnetPowerup
    else template = geoCacheRef.current.doublePowerup

    if (!template) return

    const powerup = template.clone(true)
    powerup.position.set(CONFIG.LANE_POSITIONS[lane], 1.5, zPos)
    powerup.userData.type = 'powerup'
    powerup.userData.powerupType = type
    scene.add(powerup)
    powerupsRef.current.push(powerup)
  }, [])

  // ==================== 碰撞检测 ====================
  const checkCollision = useCallback((obstacle: THREE.Group): boolean => {
    const state = playerStateRef.current
    const data = gameDataRef.current

    // 护盾激活时忽略碰撞
    if (data.powerupStates.shield > 0) return false

    const type = obstacle.userData.type

    // 双跑道障碍物 - 检查玩家是否在占用的车道
    if (type === 'wideBarrier') {
      const lanes = obstacle.userData.lanes as number[]
      if (!lanes.includes(state.lane)) return false
      // 需要跳跃越过
      if (state.y > 1.0) return false
      return true
    }

    // 单跑道障碍物 - 检查车道匹配
    if (obstacle.userData.lane !== state.lane) return false

    if (type === 'barrier') {
      // 栏杆 - 需要跳跃
      if (state.y > 0.5) return false
    } else if (type === 'train') {
      // 列车（高 2.5m）- 需较高跳跃越过，或换道躲避
      if (state.y > 1.2) return false
    } else if (type === 'highBar') {
      // 高空横杆 - 需要滑铲
      if (state.isSliding) return false
    }

    return true
  }, [])

  // ==================== 动画主循环 ====================
  const animate = useCallback(() => {
    rafRef.current = requestAnimationFrame(animate)

    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    const clock = clockRef.current
    if (!renderer || !scene || !camera || !clock) return

    const delta = clock.getDelta()
    const state = gameStateRef.current
    const playerState = playerStateRef.current
    const data = gameDataRef.current

    if (state === 'playing' && playerRef.current) {
      const player = playerRef.current
      const dt = delta

      // 更新速度（逐步增加）
      data.speed = Math.min(data.speed + CONFIG.SPEED_INCREMENT * dt, CONFIG.MAX_SPEED)
      const moveDistance = data.speed * dt

      // 更新分数
      data.distance += moveDistance
      const doubleMult = data.powerupStates.doubleScore > 0 ? 2 : 1
      data.score += CONFIG.BASE_SCORE_PER_SECOND * dt * doubleMult

      // 更新道具计时
      if (data.powerupStates.shield > 0) data.powerupStates.shield -= dt
      if (data.powerupStates.magnet > 0) data.powerupStates.magnet -= dt
      if (data.powerupStates.doubleScore > 0) data.powerupStates.doubleScore -= dt

      // 玩家横向移动（平滑插值，调高系数让转向更跟手）
      player.position.x += (playerState.targetX - player.position.x) * 0.3

      // 跳跃物理
      if (playerState.isJumping) {
        playerState.velocityY -= CONFIG.GRAVITY * dt
        playerState.y += playerState.velocityY * dt
        if (playerState.y <= 0) {
          playerState.y = 0
          playerState.velocityY = 0
          playerState.isJumping = false
          // 落地后若曾按下蹲伏，立即触发滑铲
          if (playerState.pendingSlide) {
            playerState.pendingSlide = false
            playerState.isSliding = true
            playerState.slideTimer = CONFIG.SLIDE_DURATION
            player.scale.y = 0.5
            player.position.y = 0
            gameAudio.play('click')
          }
        }
      }
      player.position.y = playerState.y

      // 滑铲计时
      if (playerState.isSliding) {
        playerState.slideTimer -= dt
        if (playerState.slideTimer <= 0) {
          playerState.isSliding = false
          player.scale.y = 1
          player.position.y = 0
        }
      }

      // 腿部摆动动画
      playerState.legPhase += dt * data.speed * 0.5
      const legSwing = Math.sin(playerState.legPhase) * 0.3
      if (player.children[2]) player.children[2].rotation.x = legSwing
      if (player.children[3]) player.children[3].rotation.x = -legSwing
      if (player.children[4]) player.children[4].rotation.x = -legSwing * 0.7
      if (player.children[5]) player.children[5].rotation.x = legSwing * 0.7

      // 护盾可见性
      const shieldObj = player.getObjectByName('shield')
      if (shieldObj) {
        shieldObj.visible = data.powerupStates.shield > 0
        if (data.powerupStates.shield > 0) {
          shieldObj.rotation.y += dt * 3
          shieldObj.rotation.x += dt * 2
        }
      }

      // 跑道循环
      for (const seg of trackSegmentsRef.current) {
        seg.position.z += moveDistance
        if (seg.position.z > CONFIG.TRACK_SEGMENT_LENGTH) {
          seg.position.z -= CONFIG.TRACK_SEGMENT_LENGTH * CONFIG.VISIBLE_SEGMENTS
        }
      }

      // 城市环境循环 - 建筑和路灯
      // 注意：使用索引循环避免 for...of 中替换数组元素导致漏处理
      const citySegs = citySegmentsRef.current
      for (let i = 0; i < citySegs.length; i++) {
        const seg = citySegs[i]
        seg.position.z += moveDistance
        if (seg.position.z > CONFIG.TRACK_SEGMENT_LENGTH) {
          // 旧段已飘到玩家身后，回收并在最远前方新建一段
          scene.remove(seg)
          const { group } = createCitySegment()
          // 找到所有段中 z 最小（最远前方）的，新段放在它前面
          // 用 Infinity 作为初始值，避免 0 干扰（前方都是负 z）
          const minZ = citySegs.reduce(
            (min, s) => (s.position.z < min ? s.position.z : min),
            Infinity
          )
          group.position.z = minZ - CONFIG.TRACK_SEGMENT_LENGTH
          scene.add(group)
          citySegs[i] = group
        }
      }

      // 障碍物移动与回收
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i]
        obs.position.z += moveDistance

        // 回收：障碍物整体越过摄像机后才移除
        // 摄像机在 z=8，障碍物尾端 = center - length/2 需超过摄像机位置
        const obsLen = (obs.userData.length as number) || 1
        const despawnZ = 8 + obsLen / 2 + 2 // +2 缓冲确保完全离开视野
        if (obs.position.z > despawnZ) {
          scene.remove(obs)
          obstaclesRef.current.splice(i, 1)
          continue
        }

        // 碰撞检测（z 接近玩家时）
        // 对于长物体（如列车），根据其长度扩大碰撞判定范围
        const obsLength = (obs.userData.length as number) || 1
        const collisionHalfRange = Math.max(2, obsLength / 2 + 0.5)
        if (obs.position.z > -collisionHalfRange && obs.position.z < collisionHalfRange) {
          if (checkCollision(obs)) {
            triggerDeath()
            return
          }
        }
      }

      // 金币移动与收集
      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const coin = coinsRef.current[i]
        coin.position.z += moveDistance
        coin.rotation.x += dt * 5

        // 磁铁效果
        if (data.powerupStates.magnet > 0) {
          const dx = player.position.x - coin.position.x
          const dy = (playerState.y + 0.8) - coin.position.y
          const dz = -coin.position.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < CONFIG.MAGNET_RANGE && dist > 0.1) {
            coin.position.x += dx / dist * moveDistance * 2
            coin.position.y += dy / dist * moveDistance * 2
            coin.position.z += dz / dist * moveDistance * 2
          }
        }

        if (coin.position.z > 5) {
          scene.remove(coin)
          coinsRef.current.splice(i, 1)
          continue
        }

        // 收集检测
        const dx = coin.position.x - player.position.x
        const dy = coin.position.y - (playerState.y + 0.8)
        const dz = coin.position.z
        if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.8 && Math.abs(dz) < 0.8) {
          scene.remove(coin)
          coinsRef.current.splice(i, 1)
          const val = CONFIG.COIN_VALUE * doubleMult
          data.score += val
          data.coinCount++
          gameAudio.play('coin')
        }
      }

      // 道具移动与收集
      for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const pw = powerupsRef.current[i]
        pw.position.z += moveDistance
        pw.rotation.y += dt * 2

        if (pw.position.z > 5) {
          scene.remove(pw)
          powerupsRef.current.splice(i, 1)
          continue
        }

        const dx = pw.position.x - player.position.x
        const dy = pw.position.y - (playerState.y + 0.8)
        const dz = pw.position.z
        if (Math.abs(dx) < 0.7 && Math.abs(dy) < 1 && Math.abs(dz) < 0.8) {
          const type = pw.userData.powerupType
          if (type === 'shield') {
            data.powerupStates.shield = CONFIG.SHIELD_DURATION
            gameAudio.play('shield')
            onPowerupPickup?.('shield')
          }
          if (type === 'magnet') {
            data.powerupStates.magnet = CONFIG.POWERUP_DURATION
            gameAudio.play('magnet')
            onPowerupPickup?.('magnet')
          }
          if (type === 'double') {
            data.powerupStates.doubleScore = CONFIG.POWERUP_DURATION
            gameAudio.play('double')
            onPowerupPickup?.('double')
          }
          scene.remove(pw)
          powerupsRef.current.splice(i, 1)
        }
      }

      // 生成新实体
      data.spawnTimer -= dt
      if (data.spawnTimer <= 0) {
        data.spawnTimer = CONFIG.SPAWN_INTERVAL - data.speed * 0.02
        // 障碍物从远处生成（与城市段同距离），让玩家看到它们从远方接近
        // 城市段最远端约 z=-145，障碍物生成在 z=-100 ~ -130 区间
        const spawnZ = -100 - Math.random() * 30
        spawnObstacle(spawnZ)
        if (Math.random() < 0.7) spawnCoins(spawnZ - 5)
        if (Math.random() < 0.15) spawnPowerup(spawnZ - 8)
      }

      // 相机跟随 + 动态FOV增强速度感
      const targetCamX = player.position.x * 0.3
      camera.position.x += (targetCamX - camera.position.x) * 0.1
      camera.lookAt(player.position.x * 0.2, 1, -5)

      // 动态FOV: 速度越快视野越宽，增强速度感
      if (state === 'playing') {
        const speedRatio = (data.speed - CONFIG.PLAYER_START_SPEED) / (CONFIG.MAX_SPEED - CONFIG.PLAYER_START_SPEED)
        const targetFov = 65 + speedRatio * 25 // 65° ~ 90°
        camera.fov += (targetFov - camera.fov) * 0.05
        camera.updateProjectionMatrix()
      } else {
        // 游戏结束后缓慢恢复默认FOV
        if (camera.fov > 65) {
          camera.fov += (65 - camera.fov) * 0.02
          camera.updateProjectionMatrix()
        }
      }

      // 通知外部更新
      onStatsUpdate?.({
        score: Math.floor(data.score),
        distance: Math.floor(data.distance),
        speed: data.speed,
        coins: data.coinCount,
        powerups: { ...data.powerupStates },
      })
    } else if (state === 'dying' && playerRef.current) {
      // 死亡动画：玩家旋转缩小 + 相机抖动
      const player = playerRef.current
      const dt = delta

      // 玩家旋转并缩小
      player.rotation.z += dt * 8 // 快速旋转
      const targetScale = 0.1
      player.scale.x += (targetScale - player.scale.x) * dt * 5
      player.scale.y += (targetScale - player.scale.y) * dt * 5
      player.scale.z += (targetScale - player.scale.z) * dt * 5
      player.position.y += dt * 3 // 向上飞起

      // 相机抖动
      camera.position.x = (Math.random() - 0.5) * 0.5
      camera.position.y = 4.5 + (Math.random() - 0.5) * 0.3
    } else {
      // 非游戏中，清空实体
      if (state === 'ready' && playerRef.current) {
        // 清理所有动态实体
        for (const obs of obstaclesRef.current) scene.remove(obs)
        for (const c of coinsRef.current) scene.remove(c)
        for (const p of powerupsRef.current) scene.remove(p)
        obstaclesRef.current = []
        coinsRef.current = []
        powerupsRef.current = []

        // 重置城市段位置 - 重新分布在玩家前方
        for (let i = 0; i < citySegmentsRef.current.length; i++) {
          citySegmentsRef.current[i].position.z = -i * CONFIG.TRACK_SEGMENT_LENGTH + 5
        }

        // 重置玩家
        playerState.lane = 1
        playerState.targetX = 0
        playerState.y = 0
        playerState.velocityY = 0
        playerState.isJumping = false
        playerState.isSliding = false
        playerState.pendingSlide = false
        // 完整重置死亡动画带来的形变
        playerRef.current.scale.set(1, 1, 1)
        playerRef.current.rotation.set(0, 0, 0)
        playerRef.current.position.set(0, 0, 0)

        // 重置数据
        data.score = 0
        data.distance = 0
        data.speed = CONFIG.PLAYER_START_SPEED
        data.coinCount = 0
        data.spawnTimer = 0
        data.powerupStates = { shield: 0, magnet: 0, doubleScore: 0 }

        // 重置相机
        camera.position.set(0, 4.5, 8)
        camera.lookAt(0, 1, -5)
      }
    }

    // Bloom 轻度调整
    const bloomPass = bloomPassRef.current
    if (bloomPass) {
      if (state === 'playing') {
        const speedRatio = (data.speed - CONFIG.PLAYER_START_SPEED) / (CONFIG.MAX_SPEED - CONFIG.PLAYER_START_SPEED)
        bloomPass.strength = 0.3 + speedRatio * 0.15
      } else {
        bloomPass.strength = 0.3
      }
    }

    const composer = composerRef.current
    if (composer) {
      composer.render()
    } else {
      renderer.render(scene, camera)
    }
  }, [checkCollision, spawnObstacle, spawnCoins, spawnPowerup, onStatsUpdate, onPowerupPickup])

  // ==================== 游戏状态变更 ====================
  const startGame = useCallback(() => {
    gameStateRef.current = 'playing'
    setGameState('playing')
    onGameStateChange?.('playing')
    gameAudio.init()
    gameAudio.resume()
    gameAudio.startBGM()
  }, [onGameStateChange])

  const deathTimerRef = useRef<number | null>(null)

  const triggerDeath = useCallback(() => {
    gameStateRef.current = 'dying'
    setGameState('dying')
    gameAudio.stopBGM()
    gameAudio.play('hit')
    // 1秒后播放 gameover 音效并切换到 gameover 状态
    deathTimerRef.current = window.setTimeout(() => {
      gameAudio.play('gameover')
      gameStateRef.current = 'gameover'
      setGameState('gameover')
      onGameStateChange?.('gameover')
      deathTimerRef.current = null
    }, 1000)
  }, [onGameStateChange])

  const gameOver = useCallback(() => {
    // 保留用于兼容，实际通过 triggerDeath 触发
    if (deathTimerRef.current === null) {
      gameStateRef.current = 'gameover'
      setGameState('gameover')
      onGameStateChange?.('gameover')
      gameAudio.stopBGM()
      gameAudio.play('hit')
      setTimeout(() => gameAudio.play('gameover'), 300)
    }
  }, [onGameStateChange])

  const resetToReady = useCallback(() => {
    // 清除死亡定时器
    if (deathTimerRef.current !== null) {
      clearTimeout(deathTimerRef.current)
      deathTimerRef.current = null
    }

    gameStateRef.current = 'ready'
    setGameState('ready')
    onGameStateChange?.('ready')

    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!scene || !camera) return

    // 同步清理所有实体，确保重置后场景干净
    for (const obs of obstaclesRef.current) scene.remove(obs)
    for (const c of coinsRef.current) scene.remove(c)
    for (const p of powerupsRef.current) scene.remove(p)
    obstaclesRef.current = []
    coinsRef.current = []
    powerupsRef.current = []

    // 重置城市段位置
    for (let i = 0; i < citySegmentsRef.current.length; i++) {
      citySegmentsRef.current[i].position.z = -i * CONFIG.TRACK_SEGMENT_LENGTH + 5
    }

    // 重置玩家
    const ps = playerStateRef.current
    ps.lane = 1
    ps.targetX = 0
    ps.y = 0
    ps.velocityY = 0
    ps.isJumping = false
    ps.isSliding = false
    ps.pendingSlide = false
    if (playerRef.current) {
      // 完整重置死亡动画带来的形变
      playerRef.current.scale.set(1, 1, 1)
      playerRef.current.rotation.set(0, 0, 0)
      playerRef.current.position.set(0, 0, 0)
    }

    // 重置数据
    const data = gameDataRef.current
    data.score = 0
    data.distance = 0
    data.speed = CONFIG.PLAYER_START_SPEED
    data.coinCount = 0
    data.spawnTimer = 0
    data.powerupStates = { shield: 0, magnet: 0, doubleScore: 0 }

    // 重置相机
    camera.position.set(0, 4.5, 8)
    camera.lookAt(0, 1, -5)
  }, [onGameStateChange])

  // 暴露方法给父组件
  useEffect(() => {
    ;(window as any).__subwaySurfer = {
      start: startGame,
      reset: resetToReady,
      gameOver,
    }
  }, [startGame, resetToReady, gameOver])

  // 初始化
  useEffect(() => {
    initGame()
    return () => {
      cleanupRef.current?.()
    }
  }, [initGame])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  )
}
