import { useEffect, useRef } from 'react'

// Static star field behind the (transparent) globe canvas. Seeded so it never shuffles.
export function Starfield() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
      bg.addColorStop(0, '#0d1630')
      bg.addColorStop(1, '#050812')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      let seed = 7
      const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
      const count = Math.round((w * h) / 5500)
      for (let i = 0; i < count; i++) {
        const x = rnd() * w
        const y = rnd() * h
        const big = rnd() > 0.93
        const a = 0.25 + rnd() * 0.55
        ctx.fillStyle = `rgba(${rnd() > 0.7 ? '255,226,190' : '205,222,255'},${a})`
        ctx.beginPath()
        ctx.arc(x, y, big ? 1.1 : 0.55 + rnd() * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    draw()
    let t
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(draw, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
