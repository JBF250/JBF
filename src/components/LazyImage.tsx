import { useEffect, useRef, useState } from 'react'

// 图片加载动画：骨架图 + 中央圆形进度环，加载完成渐入，失败时以半透明显示
export default function LazyImage({
  src,
  alt = '',
  wrapperClass = '',
  imgClass = '',
  minHeight = 140,
}: {
  src: string
  alt?: string
  wrapperClass?: string
  imgClass?: string
  minHeight?: number
}) {
  const loadedRef = useRef(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    loadedRef.current = false
    setLoaded(false)
    setError(false)
    setProgress(0)

    const img = new Image()
    img.src = src
    img.onload = () => {
      loadedRef.current = true
      setProgress(100)
      setLoaded(true)
    }
    if (img.complete) {
      loadedRef.current = true
      setProgress(100)
      setLoaded(true)
    }

    const ease = (p: number) => 1 - Math.pow(1 - p, 3)
    const duration = 1400
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      if (loadedRef.current) return
      const t = Math.min((now - t0) / duration, 1)
      setProgress(Math.min(ease(t) * 100, 99))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [src])

  const ringRadius = 21
  const ringLength = 2 * Math.PI * ringRadius

  return (
    <div
      className={`relative overflow-hidden ${wrapperClass}`}
      style={{ minHeight: loaded ? undefined : minHeight }}
    >
      {!loaded && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center skeleton-shimmer">
          <svg className="tilted-loader-ring" viewBox="0 0 48 48" width="56" height="56">
            <circle
              cx="24"
              cy="24"
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r={ringRadius}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringLength}
              strokeDashoffset={ringLength * (1 - progress / 100)}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className="tilted-loader-text">{Math.round(progress)}%</span>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onLoad={() => {
          loadedRef.current = true
          setProgress(100)
          setLoaded(true)
        }}
        onError={() => {
          setError(true)
          loadedRef.current = true
          setLoaded(true)
        }}
        className={imgClass}
        style={{
          opacity: loaded ? (error ? 0.5 : 1) : 0,
          transition: 'opacity 0.6s ease'
        }}
      />
    </div>
  )
}