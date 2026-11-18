import { Figure, useCountUp } from './parts.jsx'
import { formatKm } from '../../utils/stats.js'

const plural = (n, one, many) => (n === 1 ? one : many)

// How far round the Earth: a ring that fills with each lap, and the split between flown and overland.
function EarthRing({ stats, reduced }) {
  const earth = useCountUp(stats.timesAroundEarth, reduced)
  const lap = earth >= 1 ? earth % 1 : earth
  const R = 30
  const C = 2 * Math.PI * R
  return (
    <div className="flex items-center gap-4 px-5 pb-6">
      <div className="relative h-[84px] w-[84px] shrink-0">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(190,205,235,0.12)" strokeWidth="5" />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke="#8fd3ff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - Math.min(1, lap))}
            style={{ filter: 'drop-shadow(0 0 4px rgba(143,211,255,0.5))' }}
          />
        </svg>
        <div className="display absolute inset-0 grid place-items-center text-[22px] leading-none">
          {earth >= 1 ? `${earth.toFixed(1)}×` : `${Math.round(earth * 100)}%`}
        </div>
      </div>
      <div className="min-w-0 text-[13px] leading-relaxed text-dim">
        <p className="text-fg">{stats.timesAroundEarth >= 1 ? 'times around the Earth' : 'of the way around the Earth'}</p>
        <p>
          <span className="text-fg">{formatKm(stats.airKm)} km</span> flown
          {stats.groundKm > 0 && (
            <>
              {' '}
              and <span className="text-fg">{formatKm(stats.groundKm)} km</span> overland, in straight lines
            </>
          )}
        </p>
        {stats.airKm > 0 && (
          <p>
            About <span className="text-fg">{formatKm(stats.hours)} hours</span> in the air, at 850 km/h
          </p>
        )}
      </div>
    </div>
  )
}

export function Figures({ stats, reduced }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-6 px-5 pb-6">
        <Figure value={stats.trips} label={plural(stats.trips, 'trip', 'trips')} reduced={reduced} />
        <Figure value={stats.countryCount} label={plural(stats.countryCount, 'country', 'countries')} reduced={reduced} />
        <Figure value={stats.places} label={plural(stats.places, 'place', 'places')} reduced={reduced} />
        <Figure value={Math.round(stats.km)} label="kilometres travelled" reduced={reduced} />
      </div>
      {stats.km > 0 && <EarthRing stats={stats} reduced={reduced} />}
    </>
  )
}
