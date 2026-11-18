import { useEffect, useRef, useState } from 'react'

const thisYear = new Date().getFullYear()
const BUBBLE_HALF = 84

/**
 * One bar per year, as tall as the number of trips. Hover or drag to read a year, click or drag to go there.
 * Planned years are striped. An amber dot marks a year with a first visit to a country.
 */
export function Scrubber({ minYear, maxYear, perYear, firstCountries, year, onYear }) {
  const ref = useRef(null)
  const [peek, setPeek] = useState(null) // { year, x } while the pointer is over the bars
  // Another person's years are a different row of bars, so a readout for the old row would be wrong.
  useEffect(() => setPeek(null), [minYear, maxYear])
  const count = maxYear - minYear + 1
  const years = Array.from({ length: count }, (_, i) => minYear + i)
  const peak = Math.max(1, ...Object.values(perYear))

  const yearAt = (clientX) => {
    const r = ref.current.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.min(maxYear, minYear + Math.floor(t * count))
  }
  // Show the readout for the year under the pointer, and return that year.
  const look = (e) => {
    const y = yearAt(e.clientX)
    const w = ref.current.clientWidth
    const x = ((y - minYear + 0.5) / count) * w
    setPeek({ year: y, x: Math.min(Math.max(x, BUBBLE_HALF), Math.max(BUBBLE_HALF, w - BUBBLE_HALF)) })
    return y
  }

  const onPointerDown = (e) => {
    try {
      ref.current.setPointerCapture(e.pointerId) // keep scrubbing when the finger slips off the bars
    } catch {
      /* the pointer is already gone */
    }
    onYear(look(e))
  }
  const onPointerMove = (e) => {
    const y = look(e)
    if (e.buttons) onYear(y)
  }
  const onPointerUp = (e) => {
    if (e.pointerType === 'touch') setPeek(null)
  }
  const onKeyDown = (e) => {
    const k = e.key
    if (k === 'ArrowRight' || k === 'ArrowUp') onYear(Math.min(maxYear, year + 1))
    else if (k === 'ArrowLeft' || k === 'ArrowDown') onYear(Math.max(minYear, year - 1))
    else if (k === 'Home') onYear(minYear)
    else if (k === 'End') onYear(maxYear)
    else return
    e.preventDefault()
  }

  const n = perYear[year] || 0
  const peekCount = peek ? perYear[peek.year] || 0 : 0
  const peekFirst = peek ? firstCountries.get(peek.year) : null
  const hasPlanned = maxYear > thisYear && minYear <= thisYear

  return (
    <div className="relative min-w-0">
      {peek && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-line px-2.5 py-1.5 text-[12px] shadow-panel"
          style={{ left: peek.x, background: 'rgba(14,21,38,0.96)' }}
          role="presentation"
        >
          <div className="font-semibold">
            {peek.year} <span className="font-normal text-dim">· {peekCount} {peekCount === 1 ? 'trip' : 'trips'}</span>
          </div>
          {peekFirst && <div className="text-city">First time in {peekFirst.join(', ')}</div>}
          {peek.year > thisYear && <div className="text-city-soft">Planned</div>}
        </div>
      )}

      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Year"
        aria-valuemin={minYear}
        aria-valuemax={maxYear}
        aria-valuenow={year}
        aria-valuetext={`${year}, ${n} ${n === 1 ? 'trip' : 'trips'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => !e.buttons && setPeek(null)}
        className="relative flex h-11 cursor-pointer touch-none items-end gap-[3px] rounded-md"
      >
        {years.map((y) => {
          const c = perYear[y] || 0
          const reached = y <= year
          const h = c ? Math.max(14, (c / peak) * 100) : 0
          return (
            <div key={y} className="relative flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-[3px] transition-[background-color,filter] duration-300 ${reached ? 'bg-route' : 'bg-white/[0.16]'} ${
                  y > thisYear ? 'hatch' : ''
                } ${y === year ? 'shadow-glow' : ''} ${peek?.year === y ? 'brightness-125' : ''}`}
                style={{ height: c ? `${h}%` : '3px', opacity: c ? (reached ? 1 : 0.9) : 0.35 }}
              />
            </div>
          )
        })}
        {hasPlanned && (
          <div
            className="pointer-events-none absolute inset-y-0 w-0 border-l border-dashed border-white/30"
            style={{ left: `calc(${((thisYear - minYear + 1) / count) * 100}% - 1.5px)` }}
            title="Today"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-1 flex h-2 gap-[3px]" aria-hidden="true">
        {years.map((y) => (
          <div key={y} className="relative flex-1">
            {y === year && <span className="absolute inset-x-0 top-0 h-[2px] rounded bg-city" />}
            {firstCountries.has(y) && <span className="absolute left-1/2 top-[2px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-city/80" />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-dim">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  )
}
