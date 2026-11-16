import { countryName } from '../data/countries.js'
import { formatKm } from '../utils/stats.js'

// Follows the pointer over a city or route. Never takes pointer events itself.
export function Tooltip({ hover, citiesDb }) {
  if (!hover) return null
  const flip = hover.x > window.innerWidth - 260
  const style = {
    left: hover.x,
    top: hover.y,
    transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
  }
  return (
    <div className="panel pointer-events-none absolute z-20 max-w-[240px] rounded-xl px-3 py-2" style={style} role="presentation">
      {hover.kind === 'city' ? (
        <>
          <div className="text-[13.5px] font-semibold">
            {hover.city} <span className="font-normal text-city">{hover.code}</span>
          </div>
          <div className="text-[12px] text-dim">
            {countryName(hover.country)}
            {hover.hub ? ' · connection only' : ` · ${hover.visits} ${hover.visits === 1 ? 'arrival' : 'arrivals'}`}
          </div>
        </>
      ) : (
        <>
          <div className="text-[13.5px] font-semibold">
            {citiesDb[hover.from]?.city || hover.from} <span className="font-normal text-dim">→</span> {citiesDb[hover.to]?.city || hover.to}
          </div>
          <div className="text-[12px] text-dim">
            {hover.from}–{hover.to} · {formatKm(hover.km)} km · flown {hover.repeats}×
          </div>
        </>
      )}
    </div>
  )
}
