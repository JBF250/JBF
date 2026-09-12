import { useEffect, useRef, useState, useCallback } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Mic, Square, Download, Loader2, RotateCcw, Info, AudioWaveform } from 'lucide-react'

type EffectType = 'none' | 'reverb' | 'denoise'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function generateImpulseResponse(ctx: BaseAudioContext, duration = 1.5, decay = 2.5): AudioBuffer {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * duration)
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

function applyNoiseGate(buffer: AudioBuffer, strength: number): void {
  const thresholdDb = -70 + (strength / 100) * 50
  const threshold = Math.pow(10, thresholdDb / 20)
  const releaseCoeff = Math.exp(-1 / (buffer.sampleRate * 0.05))
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    let env = 0
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i])
      env = abs > env ? abs : env * releaseCoeff
      data[i] *= env >= threshold ? 1 : 0.03
    }
  }
}

async function processAudio(
  sourceBuffer: AudioBuffer,
  options: { volumeDb: number; effect: EffectType; reverbMix: number; denoiseStrength: number }
): Promise<AudioBuffer> {
  const { volumeDb, effect, reverbMix, denoiseStrength } = options
  const sampleRate = sourceBuffer.sampleRate
  const length = sourceBuffer.length
  const numChannels = sourceBuffer.numberOfChannels
  const offline = new OfflineAudioContext(numChannels, length, sampleRate)

  const source = offline.createBufferSource()
  source.buffer = sourceBuffer

  const volumeGain = offline.createGain()
  volumeGain.gain.value = Math.pow(10, volumeDb / 20)

  if (effect === 'reverb') {
    const dry = offline.createGain()
    dry.gain.value = 1 - reverbMix
    const wet = offline.createGain()
    wet.gain.value = reverbMix
    const convolver = offline.createConvolver()
    convolver.buffer = generateImpulseResponse(offline)

    source.connect(dry)
    source.connect(convolver)
    convolver.connect(wet)
    dry.connect(volumeGain)
    wet.connect(volumeGain)
  } else {
    source.connect(volumeGain)
  }
  volumeGain.connect(offline.destination)

  source.start(0)
  const rendered = await offline.startRendering()

  if (effect === 'denoise') {
    applyNoiseGate(rendered, denoiseStrength)
  }

  return rendered
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const blockAlign = numChannels * 2
  const dataSize = buffer.length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

/** Max amplitude-envelope slots retained during recording (extra gets merged). */
const WAVE_MAX = 480

/**
 * Draw an amplitude waveform (audio-workstation style) centred on the mid line.
 * Each slot is a column whose height is the peak amplitude for that time slice.
 * When `progressRatio` (0..1) is supplied, a playhead cursor is drawn on top.
 */
function drawWaveform(canvas: HTMLCanvasElement | null, points: readonly number[], progressRatio?: number): void {
  if (!canvas) return
  const g = canvas.getContext('2d')
  if (!g) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth || 320
  const h = canvas.clientHeight || 96
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr)
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr)
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)

  const cs = getComputedStyle(document.documentElement)
  const accent = (cs.getPropertyValue('--accent-cyan') || '#22d3ee').trim()
  const mid = h / 2

  if (points.length > 0) {
    const barW = w / points.length
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, accent + '55')
    grad.addColorStop(0.5, accent)
    grad.addColorStop(1, accent + '55')
    g.fillStyle = grad
    for (let i = 0; i < points.length; i++) {
      const bh = Math.max(1, points[i] * h * 0.9)
      const x = i * barW + barW * 0.03
      const bw = Math.max(1, barW * 0.94)
      g.fillRect(x, mid - bh / 2, bw, bh)
    }
  }

  // centre baseline
  g.strokeStyle = accent + '44'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, mid)
  g.lineTo(w, mid)
  g.stroke()

  // moving playhead cursor
  if (typeof progressRatio === 'number') {
    const x = Math.max(0, Math.min(w, progressRatio * w))
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
}

export default function RecorderPage() {
  const { t } = useI18n()
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewRendering, setPreviewRendering] = useState(false)
  const [volume, setVolume] = useState(0)
  const [effect, setEffect] = useState<EffectType>('none')
  const [reverbMix, setReverbMix] = useState(0.35)
  const [denoiseStrength, setDenoiseStrength] = useState(50)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const recordCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewAudioRef = useRef<HTMLAudioElement>(null)
  const recCtxRef = useRef<AudioContext | null>(null)
  const recAnalyserRef = useRef<AnalyserNode | null>(null)
  const recRafRef = useRef<number | null>(null)
  // Amplitude envelope accumulated while recording (left -> right growth).
  const waveformRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recRafRef.current) cancelAnimationFrame(recRafRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      recCtxRef.current?.close().catch(() => undefined)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  /* ---------------- Recording ---------------- */

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      // Accumulate a live amplitude envelope that grows from left to right,
      // like an audio-workstation waveform, while the recording is running.
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      const silentOut = ctx.createGain()
      silentOut.gain.value = 0
      source.connect(analyser)
      analyser.connect(silentOut)
      silentOut.connect(ctx.destination)
      recCtxRef.current = ctx
      recAnalyserRef.current = analyser

      const waveform = waveformRef.current
      waveform.length = 0
      const sampleBuf = new Uint8Array(analyser.fftSize)
      const accumulate = () => {
        analyser.getByteTimeDomainData(sampleBuf)
        let peak = 0
        for (let j = 0; j < sampleBuf.length; j++) {
          const v = Math.abs(sampleBuf[j] - 128) / 128
          if (v > peak) peak = v
        }
        // Merge oldest slots in half so the envelope tracks long recordings.
        if (waveform.length >= WAVE_MAX) {
          const half = Math.ceil(waveform.length / 2)
          for (let k = 0; k < half; k++) {
            const a = waveform[k * 2] ?? 0
            const b = waveform[k * 2 + 1] ?? 0
            waveform[k] = Math.max(a, b)
          }
          waveform.length = half
        }
        waveform.push(peak)
        drawWaveform(recordCanvasRef.current, waveform)
        recRafRef.current = requestAnimationFrame(accumulate)
      }
      accumulate()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        // Tear down the live analyzer
        if (recRafRef.current) cancelAnimationFrame(recRafRef.current)
        recRafRef.current = null
        source.disconnect()
        analyser.disconnect()
        silentOut.disconnect()
        recCtxRef.current?.close().catch(() => undefined)
        recCtxRef.current = null
        recAnalyserRef.current = null

        setAudioBlob(blob)
        setPreviewUrl(null)
        setPreviewBlob(null)
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recorder.start()
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = window.setInterval(() => {
        setRecordingTime((p) => p + 1)
      }, 1000)
    } catch {
      setError(t('lab.recorder.micError'))
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetRecording = () => {
    if (recording) stopRecording()
    setAudioBlob(null)
    setPreviewUrl(null)
    setPreviewBlob(null)
    setError(null)
    setProcessing(false)
    waveformRef.current.length = 0
    drawWaveform(recordCanvasRef.current, waveformRef.current)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  /* ---------------- Effect preview (renders the final result) ---------------- */

  const renderPreview = useCallback(
    async (blob: Blob) => {
      try {
        setPreviewRendering(true)
        const arrayBuffer = await blob.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(arrayBuffer)
        const processed = await processAudio(decoded, { volumeDb: volume, effect, reverbMix, denoiseStrength })
        const wavBlob = encodeWav(processed)
        await ctx.close().catch(() => undefined)
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const url = URL.createObjectURL(wavBlob)
        previewUrlRef.current = url
        setPreviewUrl(url)
        setPreviewBlob(wavBlob)
      } catch {
        /* preview errors are non-fatal */
      } finally {
        setPreviewRendering(false)
      }
    },
    [volume, effect, reverbMix, denoiseStrength]
  )

  // Debounced re-render whenever the recording or any effect parameter changes
  useEffect(() => {
    if (!audioBlob) return
    const id = window.setTimeout(() => {
      renderPreview(audioBlob)
    }, 400)
    return () => clearTimeout(id)
  }, [audioBlob, volume, effect, reverbMix, denoiseStrength, renderPreview])

  /* ---------------- Playback: static waveform + moving playhead cursor ---------------- */

  useEffect(() => {
    if (!previewUrl || !previewAudioRef.current) return
    const audioEl = previewAudioRef.current
    const canvas = recordCanvasRef.current
    const points = waveformRef.current

    let raf = 0
    let playing = false
    const render = () => {
      const dur = audioEl.duration || 0
      const ratio = dur > 0 ? audioEl.currentTime / dur : 0
      drawWaveform(canvas, points, ratio)
      if (playing) raf = requestAnimationFrame(render)
    }
    const start = () => {
      playing = true
      cancelAnimationFrame(raf)
      render()
    }
    const stop = () => {
      playing = false
      cancelAnimationFrame(raf)
      render() // freeze playhead at pause/end position
    }

    audioEl.addEventListener('play', start)
    audioEl.addEventListener('pause', stop)
    audioEl.addEventListener('ended', stop)
    render() // draw the full waveform once a preview exists

    return () => {
      playing = false
      cancelAnimationFrame(raf)
      audioEl.removeEventListener('play', start)
      audioEl.removeEventListener('pause', stop)
      audioEl.removeEventListener('ended', stop)
    }
  }, [previewUrl])

  /* ---------------- Export ---------------- */

  const handleExport = async () => {
    if (!audioBlob) {
      setError(t('lab.recorder.noRecording'))
      return
    }
    setProcessing(true)
    setError(null)
    try {
      let blob = previewBlob
      if (!blob) {
        const arrayBuffer = await audioBlob.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(arrayBuffer)
        const processed = await processAudio(decoded, { volumeDb: volume, effect, reverbMix, denoiseStrength })
        blob = encodeWav(processed)
        await ctx.close().catch(() => undefined)
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'recording.wav'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('lab.recorder.exportError'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <LabLayout
      title={t('lab.tools.recorder.title')}
      description={t('lab.tools.recorder.desc')}
      showPrivacyNotice
    >
      <div className="space-y-6">
        {/* Record control */}
        <div className="bg-theme-tertiary rounded-xl p-6 text-center">
          <div className="text-3xl font-mono text-theme-on-surface mb-4">{formatTime(recordingTime)}</div>

          <canvas
            ref={recordCanvasRef}
            className="w-full h-24 mb-4 rounded-lg bg-black/40"
            aria-hidden="true"
          />

          {recording ? (
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:opacity-90 transition-opacity"
            >
              <Square className="w-5 h-5" />
              {t('lab.recorder.stopRecord')}
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:opacity-90 transition-opacity"
            >
              <Mic className="w-5 h-5" />
              {t('lab.recorder.startRecord')}
            </button>
          )}

          {recording && (
            <p className="text-theme-secondary text-sm mt-3 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {t('lab.recorder.recording')}
            </p>
          )}
        </div>

        {/* Preview */}
        {previewUrl && !recording && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-theme-on-surface flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-primary" />
                {t('lab.recorder.recordedPreview')}
              </label>
              <button
                onClick={resetRecording}
                className="flex items-center gap-1 px-3 py-1.5 bg-theme-tertiary border border-theme-color text-theme-on-surface rounded-lg text-sm hover:border-primary/50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('lab.recorder.reRecord')}
              </button>
            </div>
            {previewRendering && (
              <p className="text-sm text-theme-secondary flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('lab.recorder.previewProcessing')}
              </p>
            )}
            <audio key={previewUrl} ref={previewAudioRef} controls src={previewUrl} className="w-full" />
          </div>
        )}

        {/* Effects */}
        {previewUrl && !recording && (
          <div className="space-y-5">
            {/* Effect selector */}
            <div>
              <label className="block text-sm font-medium text-theme-on-surface mb-2">
                {t('lab.recorder.effects')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['none', 'reverb', 'denoise'] as EffectType[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEffect(e)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      effect === e
                        ? 'bg-primary text-white'
                        : 'bg-theme-tertiary border border-theme-color text-theme-on-surface hover:border-primary/50'
                    }`}
                  >
                    {t(`lab.recorder.effect${e.charAt(0).toUpperCase()}${e.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-theme-on-surface mb-2">
                {t('lab.recorder.volume')}：{volume} dB
              </label>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Reverb mix */}
            {effect === 'reverb' && (
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-2">
                  {t('lab.recorder.reverbMix')}：{Math.round(reverbMix * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={reverbMix}
                  onChange={(e) => setReverbMix(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Denoise strength */}
            {effect === 'denoise' && (
              <div>
                <label className="block text-sm font-medium text-theme-on-surface mb-2">
                  {t('lab.recorder.denoiseStrength')}：{denoiseStrength}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={denoiseStrength}
                  onChange={(e) => setDenoiseStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">{t('lab.recorder.exportHint')}</p>
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={processing || previewRendering}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('lab.recorder.exporting')}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t('lab.recorder.export')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
      </div>
    </LabLayout>
  )
}