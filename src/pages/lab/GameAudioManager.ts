// Web Audio API based sound manager for 3D runner game
// No external audio files needed - all sounds are procedurally generated

export type SoundType = 'jump' | 'coin' | 'hit' | 'powerup' | 'shield' | 'magnet' | 'double' | 'gameover' | 'click'

class GameAudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmTimer: number | null = null
  private bgmEnabled = true
  private sfxEnabled = true
  private initialized = false
  private bgmPlaying = false
  // BGM 调度状态
  private nextNoteTime = 0
  private currentStep = 0
  private readonly lookahead = 25.0 // ms - 调度器检查间隔
  private readonly scheduleAheadTime = 0.1 // s - 提前调度时间

  init() {
    if (this.initialized) return
    this.initialized = true

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      this.ctx = new AudioContextClass()
      // 上下文创建后立即尝试恢复（即使在用户手势中调用也会成功）
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }

      // Master gain
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.8
      this.masterGain.connect(this.ctx.destination)

      // BGM channel - 提升音量确保可听
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.value = 0.35
      this.bgmGain.connect(this.masterGain)

      // SFX channel
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.6
      this.sfxGain.connect(this.masterGain)
    } catch (e) {
      console.warn('Web Audio not available:', e)
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx) this.init()
    return this.ctx
  }

  toggleBGM(): boolean {
    this.bgmEnabled = !this.bgmEnabled
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(
        this.bgmEnabled ? 0.35 : 0,
        this.ctx.currentTime,
        0.05
      )
    }
    return this.bgmEnabled
  }

  toggleSFX(): boolean {
    this.sfxEnabled = !this.sfxEnabled
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? 0.6 : 0
    }
    return this.sfxEnabled
  }

  isBGMOn() { return this.bgmEnabled }
  isSFXOn() { return this.sfxEnabled }

  // ==================== Sound Effects ====================

  play(type: SoundType) {
    if (!this.sfxEnabled) return
    this.init()
    const ctx = this.getCtx()
    if (!ctx || !this.sfxGain) return

    switch (type) {
      case 'jump': this.playJump(ctx); break
      case 'coin': this.playCoin(ctx); break
      case 'hit': this.playHit(ctx); break
      case 'powerup': this.playPowerup(ctx); break
      case 'shield': this.playShield(ctx); break
      case 'magnet': this.playMagnet(ctx); break
      case 'double': this.playDouble(ctx); break
      case 'gameover': this.playGameOver(ctx); break
      case 'click': this.playClick(ctx); break
    }
  }

  private playJump(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  }

  private playCoin(ctx: AudioContext) {
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(988, ctx.currentTime)
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(1319, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.sfxGain!)
    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.15)
  }

  private playHit(ctx: AudioContext) {
    // Noise based crash sound
    const bufferSize = ctx.sampleRate * 0.3
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1))
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.6, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain!)
    noise.start()
    noise.stop(ctx.currentTime + 0.3)

    // Low thud
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(80, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2)
    oscGain.gain.setValueAtTime(0.5, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    osc.connect(oscGain)
    oscGain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  }

  private playPowerup(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.06 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 0.1)
      osc.connect(gain)
      gain.connect(this.sfxGain!)
      osc.start(ctx.currentTime + i * 0.06)
      osc.stop(ctx.currentTime + i * 0.06 + 0.12)
    })
  }

  private playShield(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  }

  private playMagnet(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  }

  private playDouble(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  }

  private playGameOver(ctx: AudioContext) {
    const notes = [523, 440, 392, 349, 294]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.15)
      osc.connect(gain)
      gain.connect(this.sfxGain!)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.2)
    })
  }

  private playClick(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  }

  // ==================== Background Music ====================
  // 使用 lookahead 调度器 - 这是 Web Audio API 的标准做法
  // 预先调度音符确保精确的时机，避免 setTimeout 抖动

  private readonly tempo = 132 // BPM
  private readonly seqLen = 32 // 16分音符总数（2小节）
  // 贝斯线（低音）- C小调
  private readonly bassSeq = [
    130.81, 0, 130.81, 0,  196.00, 0, 130.81, 0,
    174.61, 0, 174.61, 0,  196.00, 0, 220.00, 0,
    130.81, 0, 130.81, 0,  196.00, 0, 130.81, 0,
    155.56, 0, 155.56, 0,  196.00, 0, 233.08, 0,
  ]
  // 旋律线（高音）
  private readonly melodySeq = [
    523.25, 0, 622.25, 0,  783.99, 0, 622.25, 0,
    698.46, 0, 587.33, 0,  698.46, 0, 880.00, 0,
    523.25, 0, 622.25, 0,  783.99, 0, 932.33, 0,
    622.25, 0, 587.33, 0,  698.46, 0, 783.99, 0,
  ]

  private playBassNote(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return
    // 主音 - 锯齿波提供丰满低音
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, time)

    // 低通滤波让贝斯更柔和
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, time)
    filter.Q.setValueAtTime(2, time)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.25, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.bgmGain)
    osc.start(time)
    osc.stop(time + 0.2)
  }

  private playMelodyNote(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return
    const osc = this.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, time)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.08, time + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12)

    osc.connect(gain)
    gain.connect(this.bgmGain)
    osc.start(time)
    osc.stop(time + 0.13)
  }

  private playKick(time: number) {
    if (!this.ctx || !this.bgmGain) return
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.5, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)

    osc.connect(gain)
    gain.connect(this.bgmGain)
    osc.start(time)
    osc.stop(time + 0.15)
  }

  private playHat(time: number) {
    if (!this.ctx || !this.bgmGain) return
    // 用噪声生成 hihat
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7000

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.bgmGain)
    noise.start(time)
    noise.stop(time + 0.05)
  }

  private scheduler = () => {
    if (!this.ctx || !this.bgmPlaying) return
    // 当下一个音符时间在调度窗口内时，提前调度
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime)
      // 推进到下一个16分音符
      const secondsPerStep = 60.0 / this.tempo / 4
      this.nextNoteTime += secondsPerStep
      this.currentStep = (this.currentStep + 1) % this.seqLen
    }
    this.bgmTimer = window.setTimeout(this.scheduler, this.lookahead)
  }

  private scheduleStep(step: number, time: number) {
    // 贝斯
    const bassFreq = this.bassSeq[step]
    if (bassFreq > 0) this.playBassNote(time, bassFreq)
    // 旋律
    const melodyFreq = this.melodySeq[step]
    if (melodyFreq > 0) this.playMelodyNote(time, melodyFreq)
    // 鼓点 - 每拍 kick，每半拍 hat
    if (step % 4 === 0) this.playKick(time)
    if (step % 2 === 0) this.playHat(time)
  }

  startBGM() {
    if (!this.bgmEnabled || this.bgmPlaying) return
    this.init()
    const ctx = this.getCtx()
    if (!ctx || !this.bgmGain) return
    // 确保上下文处于运行状态
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    this.bgmPlaying = true
    this.currentStep = 0
    this.nextNoteTime = ctx.currentTime + 0.05
    this.scheduler()
  }

  stopBGM() {
    this.bgmPlaying = false
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }
}

// Singleton
export const gameAudio = new GameAudioManager()
