import { Section } from './parts.jsx'
import { formatKm } from '../../utils/stats.js'

const plural = (n, one, many) => (n === 1 ? one : many)

// The year on the timeline against your usual year, as two marks on one scale.
function Versus({ trips, average }) {
  const scale = Math.max(trips, average) * 1.15 || 1
  return (
    <div className="relative mt-3 h-1.5 rounded-full bg-white/[0.08]" role="img" aria-label={`${trips} trips, against an average of ${average.toFixed(1)}`}>
      <div className="h-full rounded-full bg-route/80 transition-[width] duration-700" style={{ width: `${(trips / scale) * 100}%` }} />
      <div className="absolute -top-1 h-3.5 w-[2px] rounded bg-city" style={{ left: `${(average / scale) * 100}%` }} title={`Average ${average.toFixed(1)} a year`} />
    </div>
  )
}

/** What happened in the year on the timeline: how much, and what was new. */
export function YearFocus({ focus, year, label }) {
  const f = focus
  return (
    <Section title={`In ${year}`} aside={f.avgTrips ? `your average is ${f.avgTrips.toFixed(1)} a year` : null}>
      {f.trips === 0 ? (
        <p className="text-[13px] text-dim">No trips logged for {year}.</p>
      ) : (
        <>
          <p className="text-[13px] text-dim">
            <span className="display text-[28px] leading-none text-fg">{f.trips}</span> {plural(f.trips, 'trip', 'trips')},{' '}
            <span className="text-fg">{formatKm(f.km)} km</span>
          </p>
          {f.avgTrips > 0 && <Versus trips={f.trips} average={f.avgTrips} />}
          {(f.newCountries.length > 0 || f.newPlaces.length > 0) && (
            <div className="mt-4 space-y-2">
              {f.newCountries.length > 0 && (
                <p className="text-[13px]">
                  <span className="text-city">First time in </span>
                  {f.newCountries.map((c) => c.name).join(', ')}
                </p>
              )}
              {f.newPlaces.length > 0 && (
                <p className="text-[13px] text-dim">
                  {f.newPlaces.length} new {plural(f.newPlaces.length, 'place', 'places')}:{' '}
                  <span className="text-fg">{f.newPlaces.map((p) => label(p.code)).join(', ')}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  )
}
