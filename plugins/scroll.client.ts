import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger)

  // One Lenis instance drives the whole app; ScrollTrigger reads that same scroll.
  // Reduced-motion users get native scrolling instead.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let lenis: Lenis | null = null
  const tick = (time: number) => lenis?.raf(time * 1000)
  const syncTriggers = () => ScrollTrigger.update()

  function start() {
    if (lenis || reducedMotion.matches) return
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: false })
    lenis.on('scroll', syncTriggers)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }
  function stop() {
    if (!lenis) return
    gsap.ticker.remove(tick)
    lenis.off('scroll', syncTriggers)
    lenis.destroy()
    lenis = null
  }
  const onMotionChange = () => reducedMotion.matches ? stop() : start()
  reducedMotion.addEventListener('change', onMotionChange)
  start()

  window.addEventListener('pagehide', () => {
    stop()
    reducedMotion.removeEventListener('change', onMotionChange)
  }, { once: true })

  return {
    provide: {
      gsap,
      ScrollTrigger,
      galleryScrollTo: (target: number | HTMLElement) => {
        if (lenis) lenis.scrollTo(target, { duration: 1.3 })
        else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' })
        else target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' })
      }
    }
  }
})
