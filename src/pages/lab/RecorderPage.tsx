import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { LabLayout } from './LabLayout'
import { Mic, Square, Download, Loader2, RotateCcw, Info } from 'lucide-react'

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

export default function RecorderPage() {
  const { t } = useI18n()
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
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
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setAudioBlob(blob)
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        const url = URL.createObjectURL(blob)
        audioUrlRef.current = url
        setAudioUrl(url)
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
    stopRecording()
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
    setProcessing(false)
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }

  const handleExport = async () => {
    if (!audioBlob) {
      setError(t('lab.recorder.noRecording'))
      return
    }
    setProcessing(true)
    setError(null)
    const audioCtx = new AudioContext()
    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      const processed = await processAudio(decoded, {
        volumeDb: volume,
        effect,
        reverbMix,
        denoiseStrength,
      })
      const wavBlob = encodeWav(processed)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'recording.wav'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('lab.recorder.exportError'))
    } finally {
      await audioCtx.close().catch(() => undefined)
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
        {audioUrl && !recording && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-theme-on-surface">
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
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {/* Effects */}
        {audioUrl && !recording && (
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
              disabled={processing}
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
