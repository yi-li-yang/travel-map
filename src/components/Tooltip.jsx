import { useLayoutEffect, useRef } from 'react'
import { countryName } from '../data/countries.js'
import { formatKm } from '../utils/stats.js'

const GAP = 14
const MARGIN = 8

const yearList = (years = []) => (years.length > 5 ? `${years.slice(0, 4).join(', ')} and ${years.length - 4} more` : years.join(', '))

// Follows the pointer over a city or route. Never takes pointer events itself.
// `rightLimit` is where free space ends (the side panel may cover the rest); the box flips or slides to stay inside.
export function Tooltip({ hover, citiesDb, routeYears, rightLimit }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !hover) return
    const { width, height } = el.getBoundingClientRect()
    const limit = rightLimit || window.innerWidth
    let x = hover.x + GAP
    if (x + width > limit - MARGIN) x = hover.x - width - GAP
    x = Math.max(MARGIN, x)
    const y = Math.min(Math.max(MARGIN, hover.y - height / 2), window.innerHeight - height - MARGIN)
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  })

  if (!hover) return null
  const ground = hover.mode === 'ground'
  const years = routeYears?.get(hover.routeKey)
  return (
    <div
      ref={ref}
      className="panel pointer-events-none absolute left-0 top-0 z-20 w-max max-w-[260px] px-3 py-2"
      style={{ transform: `translate(${hover.x + GAP}px, ${hover.y}px)` }}
      role="presentation"
    >
      {hover.kind === 'city' ? (
        <>
          <div className="text-[14px] font-semibold">
            {hover.city} {hover.airport ? <span className="font-normal text-place">{hover.code}</span> : null}
          </div>
          <div className="text-[14px] text-muted">
            {countryName(hover.country)}
            {hover.hub ? (
              ' · connection only'
            ) : (
              <>
                {' · '}
                <span className="num">{hover.visits}</span> {hover.visits === 1 ? 'arrival' : 'arrivals'}
              </>
            )}
          </div>
          {!hover.hub && hover.first ? <div className="text-[14px] text-muted">
              First visit <span className="num">{hover.first}</span>
            </div> : null}
        </>
      ) : (
        <>
          <div className="text-[14px] font-semibold">
            {citiesDb[hover.from]?.city || hover.from} <span className="font-normal text-muted">{ground ? '⇢' : '→'}</span>{' '}
            {citiesDb[hover.to]?.city || hover.to}
          </div>
          <div className="text-[14px] text-muted">
            {ground ? 'Overland' : `${hover.from}–${hover.to}`} · <span className="num">{formatKm(hover.km)}</span> km · {ground ? 'travelled' : 'flown'}{' '}
            <span className="num">{hover.repeats}×</span>
          </div>
          {years?.length ? <div className="num text-[12px] text-muted">{yearList(years)}</div> : null}
        </>
      )}
    </div>
  )
}
