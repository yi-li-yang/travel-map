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
    return <p className="px-6 py-12 text-[14px] text-muted">No trips yet.</p>
  }

  return (
    <div className="pb-6">
      {groups.map(([y, list]) => (
        <section key={y} ref={(el) => (sections.current[y] = el)} aria-label={`Trips in ${y}`}>
          <h3 className="sticky top-0 z-10 border-b border-rule bg-raised px-4 py-1">
            <button
              onClick={() => onYear(Number(y))}
              title={`Show the globe as of ${y}`}
              className="flex h-8 w-full items-center gap-3 px-2 text-left text-[14px] text-muted transition-colors duration-fast ease-out hover:bg-surface hover:text-ink"
            >
              <span className={`num font-medium ${Number(y) === year ? 'text-ink underline decoration-2 underline-offset-4' : ''}`}>{y}</span>
              <span className="num text-[12px]">{list.length}</span>
              {Number(y) > thisYear && <span className="font-normal text-muted">Planned</span>}
            </button>
          </h3>
          <ul className="px-4">
            {list.map((t) => (
              <li key={t.id} className={`transition-opacity ${Number(t.year) > year ? 'opacity-45' : ''}`}>
                <button
                  onClick={() => onSelectTrip(t)}
                  {...previewProps(onPreview, { routeKeys: tripRouteKeys(t) })}
                  className={`flex w-full items-start gap-3 px-2 py-3 text-left transition-colors duration-fast ease-out ${
                    isSelected(t) ? 'bg-ground ring-1 ring-inset ring-edge' : 'hover:bg-surface'
                  }`}
                  aria-label={`Show ${routeText(t, citiesDb)} on the globe`}
                  aria-pressed={isSelected(t)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug">
                      <RouteChain trip={t} citiesDb={citiesDb} />
                    </span>
                    <span className="num mt-1 block truncate text-[12px] text-muted">
                      {t.route}
                      {t.note && <span className="font-sans text-ink"> · {t.note}</span>}
                    </span>
                  </span>
                  <span className="num shrink-0 pt-1 text-[12px] text-muted">{formatKm(kmByTrip.get(t.id) || 0)} km</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
