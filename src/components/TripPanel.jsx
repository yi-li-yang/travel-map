import { Back, Stat } from './panelParts.jsx'
import { RouteChain } from './RouteChain.jsx'
import { formatKm } from '../utils/stats.js'
import { previewProps } from '../utils/preview.js'
import { GROUND } from '../data/route.js'

/** A trip with several legs: the whole journey, then each leg, which can be opened on its own. */
export function TripPanel({ view, citiesDb, back, onBack, onSelectLeg, onPreview }) {
  if (!view) return null
  const { trip, legs, km, airKm, groundKm } = view
  const name = (c) => citiesDb[c]?.city || c
  return (
    <div className="px-6 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="text-[20px] font-semibold leading-[1.15]">
        <RouteChain trip={trip} citiesDb={citiesDb} />
      </h2>
      <p className="mt-2 text-[14px] text-muted">
        <span className="num">{trip.year}</span>
        {trip.note && <span className="text-ink"> · {trip.note}</span>}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat value={formatKm(km)} label="kilometres in all" />
        <Stat value={legs.length} label="legs" />
      </div>
      {airKm > 0 && groundKm > 0 && (
        <p className="mt-4 text-[14px] text-muted">
          <span className="num text-ink">{formatKm(airKm)}</span> km flown and <span className="num text-ink">{formatKm(groundKm)}</span> km overland
        </p>
      )}

      <h3 className="label mb-2 mt-8">Legs</h3>
      <ol className="-mx-2">
        {legs.map((l, i) => (
          <li key={i}>
            <button
              onClick={() => onSelectLeg(l.key)}
              {...previewProps(onPreview, { routeKeys: [l.key] })}
              className="flex w-full items-baseline gap-3 px-2 py-2 text-left text-[14px] transition-colors duration-fast ease-out hover:bg-surface"
            >
              <span className="num w-5 shrink-0 text-muted">{i + 1}</span>
              <span className={`min-w-0 flex-1 ${l.via ? 'text-muted' : ''}`}>
                {name(l.from)} <span className="text-muted">{l.mode === GROUND ? '⇢' : '→'}</span> {name(l.to)}
              </span>
              <span className="num shrink-0 text-muted">{formatKm(l.km)} km</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
