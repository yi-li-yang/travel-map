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
    <div className="px-5 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="display text-[32px] leading-[1.12]">
        <RouteChain trip={trip} citiesDb={citiesDb} />
      </h2>
      <p className="mt-2 text-[13px] text-dim">
        {trip.year}
        {trip.note && <span className="text-fg/80"> · {trip.note}</span>}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat value={formatKm(km)} label="kilometres in all" />
        <Stat value={legs.length} label="legs" />
      </div>
      {airKm > 0 && groundKm > 0 && (
        <p className="mt-4 text-[13px] text-dim">
          <span className="text-fg">{formatKm(airKm)} km</span> flown and <span className="text-fg">{formatKm(groundKm)} km</span> overland
        </p>
      )}

      <h3 className="mb-2 mt-7 text-[13px] font-semibold">Legs</h3>
      <ol className="-mx-2">
        {legs.map((l, i) => (
          <li key={i}>
            <button
              onClick={() => onSelectLeg(l.key)}
              {...previewProps(onPreview, { routeKeys: [l.key] })}
              className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.06]"
            >
              <span className="w-5 shrink-0 text-dim">{i + 1}</span>
              <span className={`min-w-0 flex-1 ${l.via ? 'text-dim' : ''}`}>
                {name(l.from)} <span className="text-dim">{l.mode === GROUND ? '⇢' : '→'}</span> {name(l.to)}
              </span>
              <span className="shrink-0 text-dim">{formatKm(l.km)} km</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
