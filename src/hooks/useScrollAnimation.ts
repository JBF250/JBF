import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useScrollAnimation() {
  const aboutRef = useRef<HTMLElement>(null)
  const gamesRef = useRef<HTMLElement>(null)
  const softwareRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const fadeInUp = (element: HTMLElement) => {
      gsap.from(element, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    }

    const staggerChildren = (parent: HTMLElement) => {
      gsap.from(parent.children, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: parent,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    }

    if (aboutRef.current) fadeInUp(aboutRef.current)
    if (gamesRef.current) staggerChildren(gamesRef.current)
    if (softwareRef.current) staggerChildren(softwareRef.current)
    if (contactRef.current) fadeInUp(contactRef.current)

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [])

  return { aboutRef, gamesRef, softwareRef, contactRef }
}