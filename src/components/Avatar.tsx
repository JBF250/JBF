import { useState, useEffect } from 'react'

interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-xl'
}

export default function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initial = (alt || '?').charAt(0).toUpperCase()

  useEffect(() => {
    setImgError(false)
  }, [src])

  if (!src || imgError) {
    return (
      <div 
        className={`${className || sizeClasses[size]} rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold`}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      className={`${className || sizeClasses[size]} rounded-full object-cover`}
      onError={(e) => {
        console.warn('Avatar image failed to load:', src, e)
        setImgError(true)
      }}
    />
  )
}
