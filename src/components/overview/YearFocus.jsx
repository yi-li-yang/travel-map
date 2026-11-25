import { Section } from './parts.jsx'
import { formatKm } from '../../utils/stats.js'

const plural = (n, one, many) => (n === 1 ? one : many)

// The year on the timeline against your usual year, as two marks on one scale.
function Versus({ trips, average }) {
  const scale = Math.max(trips, average) * 1.15 || 1
  return (
    <div className="relative mt-3 h-1 bg-rule" role="img" aria-label={`${trips} trips, against an average of ${average.toFixed(1)}`}>
      <div className="h-full bg-flight transition-[width] duration-panel ease-out" style={{ width: `${(trips / scale) * 100}%` }} />
      <div className="absolute -top-1 h-3 w-[2px] bg-ink" style={{ left: `${(average / scale) * 100}%` }} title={`Average ${average.toFixed(1)} a year`} />
    </div>
  )
}

/** What happened in the year on the timeline: how much, and what was new. */
export function YearFocus({ focus, year, label }) {
  const f = focus
  return (
    <Section title={`In ${year}`} aside={f.avgTrips ? `your average is ${f.avgTrips.toFixed(1)} a year` : null}>
      {f.trips === 0 ? (
        <p className="text-[14px] text-muted">No trips logged for {year}.</p>
      ) : (
        <>
          <p className="text-[14px] text-muted">
            <span className="num text-[25px] leading-none text-ink">{f.trips}</span> {plural(f.trips, 'trip', 'trips')},{' '}
            <span className="num text-ink">{formatKm(f.km)}</span> km
          </p>
          {f.avgTrips > 0 && <Versus trips={f.trips} average={f.avgTrips} />}
          {(f.newCountries.length > 0 || f.newPlaces.length > 0) && (
            <div className="mt-4 space-y-2">
              {f.newCountries.length > 0 && (
                <p className="text-[14px]">
                  <span className="text-place">First time in </span>
                  {f.newCountries.map((c) => c.name).join(', ')}
                </p>
              )}
              {f.newPlaces.length > 0 && (
                <p className="text-[14px] text-muted">
                  {f.newPlaces.length} new {plural(f.newPlaces.length, 'place', 'places')}:{' '}
                  <span className="text-ink">{f.newPlaces.map((p) => label(p.code)).join(', ')}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  )
}
