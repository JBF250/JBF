import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(1 - t, 4)),
      smoothWheel: true,
      touchMultiplier: 2,
    })

    lenisRef.current.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time) => {
      lenisRef.current?.raf(time * 1000)
    })
    gsap.ticker.lagSmoothing(0)

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement
      
      if (anchor && anchor.getAttribute('href') !== '#') {
        e.preventDefault()
        const href = anchor.getAttribute('href') || ''
        const targetElement = document.querySelector(href)
        
        if (targetElement) {
          lenisRef.current?.scrollTo(targetElement as HTMLElement, {
            offset: -80,
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(1 - t, 4)),
          })
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      lenisRef.current?.destroy()
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return lenisRef.current
}