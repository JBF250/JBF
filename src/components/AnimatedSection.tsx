import { useRef, useEffect, useState } from 'react'

interface AnimatedSectionProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function AnimatedSection({ id, children, className = '' }: AnimatedSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setIsLeaving(false)
        } else {
          setIsLeaving(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '-50px',
      }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative transition-all duration-700 ${className} ${
        isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </section>
  )
}

interface AnimatedElementProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedElement({ children, className = '', delay = 0 }: AnimatedElementProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
        }
      },
      {
        threshold: 0.1,
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-500 ease-out ${className} ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      {children}
    </div>
  )
}