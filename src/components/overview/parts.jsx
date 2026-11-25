import { useEffect, useRef, useState } from 'react'
import { previewProps } from '../../utils/preview.js'

// Count up to a value; jumps straight there when reduced motion is on.
export function useCountUp(value, reduced) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value
      setShown(value)
      return undefined
    }
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 600)
      const e = 1 - Math.pow(1 - t, 3)
      setShown(a + (value - a) * e)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])
  return shown
}

export function Figure({ value, label, reduced }) {
  const v = useCountUp(value, reduced)
  return (
    <div>
      <div className="num text-[31px] leading-none text-ink">{Math.round(v).toLocaleString('en-GB')}</div>
      <div className="mt-2 text-[14px] text-muted">{label}</div>
    </div>
  )
}

export function Section({ title, aside, children }) {
  return (
    <section className="border-t border-rule px-6 py-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="label">{title}</h3>
        {aside && <span className="text-[12px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** A label and a value. With `onClick` it is a button, and `preview` lights up what it points at on the globe. */
export function Row({ label, children, onClick, onPreview, preview }) {
  const inner = (
    <>
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{children}</span>
    </>
  )
  const cls = '-mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between gap-4 px-2 py-1.5 text-[14px]'
  return onClick ? (
    <button onClick={onClick} {...previewProps(onPreview, preview)} className={`${cls} text-left transition-colors duration-fast ease-out hover:bg-surface`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

/** A horizontal bar for `value` out of `max`, square, in the colour of what it counts. */
export function Meter({ value, max, className = 'bg-flight', label }) {
  const width = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1 overflow-hidden bg-rule" role="img" aria-label={label}>
      <div className={`h-full transition-[width] duration-panel ease-out ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}
