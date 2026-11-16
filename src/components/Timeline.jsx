import { useRef } from 'react'
import { Button } from './ui/Button.jsx'
import { PlayIcon, PauseIcon } from './ui/Icons.jsx'

const SPEEDS = [1, 2, 4]

// Year as rolling digits: each digit slides to its value.
function RollingYear({ year }) {
  const digits = String(year).padStart(4, ' ').split('')
  return (
    <div className="display flex text-[34px] leading-none text-fg sm:text-[44px] md:text-[52px]" aria-hidden="true">
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block h-[1em] w-[0.56em] overflow-hidden">
          <span
            className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ transform: `translateY(${d === ' ' ? 0 : -Number(d)}em)` }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n} className="block h-[1em] text-center">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}

/** Histogram scrubber: one bar per year, height is how much you flew. */
function Scrubber({ minYear, maxYear, perYear, year, onYear }) {
  const ref = useRef(null)
  const years = []
  for (let y = minYear; y <= maxYear; y++) years.push(y)
  const peak = Math.max(1, ...Object.values(perYear))

  const yearAt = (clientX) => {
    const r = ref.current.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.min(maxYear, minYear + Math.floor(t * (maxYear - minYear + 1)))
  }

  const onPointerDown = (e) => {
    ref.current.setPointerCapture(e.pointerId)
    onYear(yearAt(e.clientX))
  }
  const onPointerMove = (e) => {
    if (e.buttons) onYear(yearAt(e.clientX))
  }
  const onKeyDown = (e) => {
    const k = e.key
    if (k === 'ArrowRight' || k === 'ArrowUp') onYear(Math.min(maxYear, year + 1))
    else if (k === 'ArrowLeft' || k === 'ArrowDown') onYear(Math.max(minYear, year - 1))
    else if (k === 'Home') onYear(minYear)
    else if (k === 'End') onYear(maxYear)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const n = perYear[year] || 0
  return (
    <div className="min-w-0 flex-1">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Year"
        aria-valuemin={minYear}
        aria-valuemax={maxYear}
        aria-valuenow={year}
        aria-valuetext={`${year}, ${n} ${n === 1 ? 'flight' : 'flights'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="flex h-11 cursor-pointer touch-none items-end gap-[3px] rounded-md"
      >
        {years.map((y) => {
          const count = perYear[y] || 0
          const reached = y <= year
          const h = count ? Math.max(14, (count / peak) * 100) : 0
          return (
            <div key={y} className="relative flex h-full flex-1 items-end" title={`${y}: ${count} ${count === 1 ? 'flight' : 'flights'}`}>
              <div
                className={`w-full rounded-[3px] transition-colors duration-300 ${
                  reached ? 'bg-route' : 'bg-white/[0.16]'
                } ${y === year ? 'shadow-glow' : ''}`}
                style={{ height: count ? `${h}%` : '3px', opacity: count ? (reached ? 1 : 0.9) : 0.35 }}
              />
              {y === year && <div className="absolute -bottom-1 left-0 right-0 h-[2px] rounded bg-city" />}
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-dim">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  )
}

export function Timeline({ minYear, maxYear, perYear, year, onYear, playing, onToggle, speed, onSpeed, footer, className = '', style }) {
  const planned = year > new Date().getFullYear()
  const nextSpeed = () => onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])

  return (
    <section className={`panel rounded-panel p-3 md:px-4 ${className}`} style={style} aria-label="Timeline">
      <div className="flex items-center gap-3 md:gap-4">
        <Button
          variant="primary"
          size="icon"
          onClick={onToggle}
          aria-label={playing ? 'Pause timeline' : 'Play timeline'}
          className="!h-12 !w-12 !rounded-full"
        >
          {playing ? <PauseIcon width={22} height={22} /> : <PlayIcon width={22} height={22} />}
        </Button>

        <div className="relative">
          <RollingYear year={year} />
          <span className="sr-only" aria-live="polite">
            {year}
          </span>
          {planned && (
            <span className="absolute -bottom-3 left-0 whitespace-nowrap text-[11px] text-city-soft">Planned trips</span>
          )}
        </div>

        <Scrubber minYear={minYear} maxYear={maxYear} perYear={perYear} year={year} onYear={onYear} />

        <button
          onClick={nextSpeed}
          className="h-9 min-w-[44px] rounded-lg px-2 text-[13px] font-medium text-dim transition-colors hover:bg-white/[0.07] hover:text-fg"
          aria-label={`Playback speed ${speed}×. Change speed`}
        >
          {speed}×
        </button>
      </div>
      {footer}
    </section>
  )
}
