import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useTheme } from '@/context/ThemeContext'
import { useLocation } from 'react-router-dom'

export default function HeroCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { themeMode } = useTheme()
  const location = useLocation()

  const mouseX = useRef({ value: 0 })
  const mouseY = useRef({ value: 0 })
  const isMobile = useRef(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  const planetRotationY = useRef(0)
  const planetRotationVelocity = useRef(0)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile.current) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.current.value = x * 1.5
    mouseY.current.value = y * 1.5
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    planetRotationVelocity.current += e.deltaY * 0.0005
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })

    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    camera.position.z = 5

    const isLight = themeMode === 'light'
    const particleColor1 = isLight ? 0xf472b6 : 0x8b5cf6
    const particleColor2 = isLight ? 0xffffff : 0x06b6d4

    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 5000
    const posArray = new Float32Array(particlesCount * 3)
    const colorArray = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 30
      posArray[i + 1] = (Math.random() - 0.5) * 30
      posArray[i + 2] = (Math.random() - 0.5) * 30

      const colorChoice = Math.random() > 0.5 ? particleColor1 : particleColor2
      const color = new THREE.Color(colorChoice)
      colorArray[i] = color.r
      colorArray[i + 1] = color.g
      colorArray[i + 2] = color.b
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particles)

    const rings: THREE.Mesh[] = []
    
    if (isLight) {
      const ringConfigs = [
        { inner: 0.9, outer: 1.1, color: 0xf472b6, opacity: 0.25 },
        { inner: 1.2, outer: 1.45, color: 0xc084fc, opacity: 0.2 },
        { inner: 1.6, outer: 1.9, color: 0xf472b6, opacity: 0.15 },
      ]

      ringConfigs.forEach((config, index) => {
        const ringGeometry = new THREE.RingGeometry(config.inner, config.outer, 128)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: config.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        })
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.rotation.x = -Math.PI / 2.2
        ring.rotation.z = (index % 2 === 0 ? 1 : -1) * (Math.PI / 8 + index * 0.08)
        rings.push(ring)
        scene.add(ring)
      })
    }

    const planetGeometry = new THREE.SphereGeometry(0.8, 128, 128)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 512)
    if (isLight) {
      gradient.addColorStop(0, '#ff9a9e')
      gradient.addColorStop(0.3, '#fecfef')
      gradient.addColorStop(0.6, '#fecfef')
      gradient.addColorStop(1, '#ffecd2')
    } else {
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(0.3, '#764ba2')
      gradient.addColorStop(0.6, '#2d1b69')
      gradient.addColorStop(1, '#1a0f3c')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 512)

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const r = Math.random() * 30 + 10
      const ringGradient = ctx.createRadialGradient(x, y, r * 0.5, x, y, r)
      ringGradient.addColorStop(0, 'rgba(255,255,255,0)')
      ringGradient.addColorStop(0.5, isLight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)')
      ringGradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = ringGradient
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const width = Math.random() * 80 + 20
      const height = Math.random() * 40 + 5
      const stripeGradient = ctx.createLinearGradient(x, y - height/2, x, y + height/2)
      stripeGradient.addColorStop(0, 'rgba(255,255,255,0)')
      stripeGradient.addColorStop(0.5, isLight ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)')
      stripeGradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = stripeGradient
      ctx.beginPath()
      ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const r = Math.random() * 3 + 1
      ctx.fillStyle = isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const planetTexture = new THREE.CanvasTexture(canvas)
    planetTexture.wrapS = THREE.RepeatWrapping
    const planetMaterial = new THREE.MeshBasicMaterial({ map: planetTexture })
    const planet = new THREE.Mesh(planetGeometry, planetMaterial)
    scene.add(planet)

    const glowGeometry = new THREE.SphereGeometry(0.85, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0xf472b6 : 0x8b5cf6,
      transparent: true,
      opacity: 0,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    scene.add(glow)

    let planetScale = 0
    let planetOpacity = 0
    let glowScale = 0
    let glowOpacity = 0
    let particlesOpacity = 0
    let targetCameraX = 0
    let targetCameraY = 0
    let animationTime = 0

    if (location.pathname === '/') {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('wheel', handleWheel, { passive: false })
    }

    const animate = () => {
      requestAnimationFrame(animate)
      animationTime += 0.016

      if (!isMobile.current) {
        targetCameraX += (mouseX.current.value - targetCameraX) * 0.05
        targetCameraY += (mouseY.current.value - targetCameraY) * 0.05
        const radius = 5
        const theta = targetCameraX * Math.PI / 3
        const phi = targetCameraY * Math.PI / 4 + Math.PI / 2
        camera.position.x = radius * Math.sin(phi) * Math.cos(theta)
        camera.position.y = radius * Math.cos(phi)
        camera.position.z = radius * Math.sin(phi) * Math.sin(theta)
        camera.lookAt(0, 0, 0)
      }

      if (animationTime < 0.8) {
        const progress = animationTime / 0.8
        planetScale = progress
        planetOpacity = progress
        glowScale = progress
        glowOpacity = progress * 0.2
      } else if (animationTime < 1.5) {
        const progress = (animationTime - 0.8) / 0.7
        glowScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1
        glowOpacity = 0.2 + Math.sin(progress * Math.PI * 4) * 0.1
      } else if (animationTime < 2.8) {
        particlesOpacity = Math.min(0.8, particlesOpacity + 0.02)
        rings.forEach(ring => {
          const material = ring.material as THREE.MeshBasicMaterial
          if (material.opacity < 0.25) {
            material.opacity += 0.005
          }
        })
        glowOpacity = Math.max(0.2, glowOpacity - 0.01)
        glowScale = Math.max(1, glowScale - 0.01)
      } else {
        particlesOpacity = 0.8
        rings.forEach(ring => {
          const material = ring.material as THREE.MeshBasicMaterial
          if (material.opacity < 0.25) {
            material.opacity += 0.005
          }
        })
        glowOpacity = 0.2
        glowScale = 1
      }

      planet.scale.set(planetScale, planetScale, planetScale)
      ;(planetMaterial as THREE.MeshBasicMaterial).transparent = true
      ;(planetMaterial as THREE.MeshBasicMaterial).opacity = planetOpacity
      planetRotationVelocity.current *= 0.98
      planetRotationY.current += planetRotationVelocity.current
      planet.rotation.y = planetRotationY.current

      glow.scale.set(glowScale, glowScale, glowScale)
      ;(glowMaterial as THREE.MeshBasicMaterial).opacity = glowOpacity

      ;(particlesMaterial as THREE.PointsMaterial).opacity = particlesOpacity

      particles.rotation.y += 0.0002
      particles.rotation.x += 0.00005

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('wheel', handleWheel)
      container.removeChild(renderer.domElement)
      renderer.dispose()
      particlesGeometry.dispose()
      particlesMaterial.dispose()
      planetGeometry.dispose()
      planetTexture.dispose()
      planetMaterial.dispose()
      glowGeometry.dispose()
      glowMaterial.dispose()
      rings.forEach(ring => {
        ring.geometry.dispose()
        ;(ring.material as THREE.MeshBasicMaterial).dispose()
      })
    }
  }, [themeMode, handleMouseMove, handleWheel, location.pathname])

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0" />
  )
}