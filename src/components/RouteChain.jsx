import { GROUND } from '../data/route.js'

/** "Chengdu → Nanjing ⇢ Suzhou": a trip's stops, dashed arrows for overland legs, connections dimmed. */
export function RouteChain({ trip, citiesDb, highlight }) {
  const name = (c) => citiesDb[c]?.city || c
  return trip.stops.map((s, i) => (
    <span key={i}>
      {i > 0 && (
        <span className="text-muted" aria-hidden="true">
          {trip.legs[i - 1].mode === GROUND ? ' ⇢ ' : ' → '}
        </span>
      )}
      <span className={s.code === highlight ? 'text-place' : s.via ? 'text-muted' : ''}>{name(s.code)}</span>
    </span>
  ))
}

/** Plain-text version for labels and toasts. */
export function routeText(trip, citiesDb, { max = Infinity } = {}) {
  const names = trip.stops.map((s) => citiesDb[s.code]?.city || s.code)
  if (names.length > max) return `${names[0]} to ${names[1]} and ${names.length - 2} more stops`
  return names.join(' to ')
}
