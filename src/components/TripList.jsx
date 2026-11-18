import { useEffect, useMemo, useRef } from 'react'
import { RouteChain, routeText } from './RouteChain.jsx'
import { tripRouteKeys } from '../data/route.js'
import { formatKm } from '../utils/stats.js'
import { previewProps } from '../utils/preview.js'

const thisYear = new Date().getFullYear()

/** Every trip, newest year first. Read only: hover to preview a trip on the globe, click to open it. */
export function TripList({ trips, citiesDb, year, selected, kmByTrip, onSelectTrip, onPreview, onYear }) {
  const groups = useMemo(() => {
    const byYear = new Map()
    for (const t of trips) {
      if (!byYear.has(t.year)) byYear.set(t.year, [])
      byYear.get(t.year).push(t)
    }
    return [...byYear.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [trips])

  // Start at the year the timeline is on, once, when the list first opens.
  const sections = useRef({})
  useEffect(() => {
    const current = groups.find(([y]) => Number(y) <= year) ?? groups[0]
    const raf = requestAnimationFrame(() => sections.current[current?.[0]]?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(raf)
    // Only on first show; later year changes should not move a list that is being read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSelected = (t) => {
    if (selected?.type !== 'route') return false
    if (selected.tripId) return selected.tripId === t.id
    const keys = tripRouteKeys(t)
    return keys.length === selected.routeKeys.length && keys.every((k) => selected.routeKeys.includes(k))
  }

  if (!trips.length) {
    return <p className="px-5 py-10 text-center text-[13px] text-dim">No trips yet.</p>
  }

  return (
    <div className="pb-6">
      {groups.map(([y, list]) => (
        <section key={y} ref={(el) => (sections.current[y] = el)} aria-label={`Trips in ${y}`}>
          <h3 className="sticky top-0 z-10 bg-[rgba(14,21,38,0.92)] px-3 py-1 backdrop-blur">
            <button
              onClick={() => onYear(Number(y))}
              title={`Show the globe as of ${y}`}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[12px] font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <span className={Number(y) === year ? 'text-city' : ''}>{y}</span>
              <span className="font-normal">{list.length}</span>
              {Number(y) > thisYear && <span className="font-normal text-city-soft">Planned</span>}
            </button>
          </h3>
          <ul className="px-3">
            {list.map((t) => (
              <li key={t.id} className={`transition-opacity ${Number(t.year) > year ? 'opacity-45' : ''}`}>
                <button
                  onClick={() => onSelectTrip(t)}
                  {...previewProps(onPreview, { routeKeys: tripRouteKeys(t) })}
                  className={`flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
                    isSelected(t) ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]'
                  }`}
                  aria-label={`Show ${routeText(t, citiesDb)} on the globe`}
                  aria-pressed={isSelected(t)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-snug">
                      <RouteChain trip={t} citiesDb={citiesDb} />
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-dim">
                      {t.route}
                      {t.note && <span className="text-fg/70"> · {t.note}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-[11.5px] text-dim">{formatKm(kmByTrip.get(t.id) || 0)} km</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
