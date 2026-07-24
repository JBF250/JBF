import { useEffect } from 'react'

export function useResetScroll() {
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    
    resetScroll()
    requestAnimationFrame(resetScroll)
    setTimeout(resetScroll, 100)
    setTimeout(resetScroll, 500)
  }, [])
}