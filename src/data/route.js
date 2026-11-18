// A trip's route is its stops in order, joined by "-" (flight) or "=" (overland).
// A stop in brackets is a connection only: passed through, not visited.
//   CTU-NKG-PVG=SUZHOU=WUX     EDI-(CDG)-CTU
// Airports use their IATA code. Places without an airport (public/places.json)
// use their name in capitals, which is always longer than three letters.

export const AIR = 'air'
export const GROUND = 'ground'

// Uppercase + trim. Every lookup goes through this; codes are never lowercased.
export function normalizeCode(code) {
  if (!code) return ''
  return String(code).toUpperCase().trim()
}

export const isAirport = (place) => place?.kind !== 'place'

const SEPARATOR = /\s*([-=])\s*/

/** "CTU-(DOH)-JFK" → { stops: [{code, via}], modes: ['air', 'air'] }, or null if it is not a route. */
export function parseRoute(route) {
  const text = String(route ?? '').trim()
  if (!text) return null
  const parts = text.split(SEPARATOR)
  const stops = []
  const modes = []
  for (let i = 0; i < parts.length; i++) {
    if (i % 2) {
      modes.push(parts[i] === '-' ? AIR : GROUND)
      continue
    }
    const bracketed = /^\((.*)\)$/.exec(parts[i].trim())
    const code = normalizeCode(bracketed ? bracketed[1] : parts[i])
    if (!code) return null
    stops.push({ code, via: Boolean(bracketed) })
  }
  return stops.length >= 2 ? { stops, modes } : null
}

export function formatRoute(stops, modes) {
  return stops
    .map((s, i) => (i ? (modes[i - 1] === GROUND ? '=' : '-') : '') + (s.via ? `(${s.code})` : s.code))
    .join('')
}

/**
 * Check a row against the places lookup and work out its legs, or return null.
 * Each leg's mode is exactly what the route says; nothing is inferred.
 */
export function resolveTrip(row, db) {
  const parsed = parseRoute(row.route)
  if (!parsed || !Number.isFinite(parseInt(row.year, 10))) return null
  const { stops, modes } = parsed
  if (stops.some((s) => !db[s.code])) return null
  if (stops[0].via || stops[stops.length - 1].via) return null
  const legs = []
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (a.code === b.code) return null
    legs.push({ from: a.code, to: b.code, mode: modes[i], via: a.via || b.via })
  }
  return { ...row, stops, legs, route: formatRoute(stops, modes) }
}

/** Undirected key for a pair of places and a mode, e.g. "CTU|PEK|air". */
export function routeKey(a, b, mode) {
  return `${[a, b].sort().join('|')}|${mode}`
}

export const tripRouteKeys = (trip) => trip.legs.map((l) => routeKey(l.from, l.to, l.mode))

/** Stops that were actually visited (connections left out). */
export const visitedStops = (trip) => trip.stops.filter((s) => !s.via).map((s) => s.code)

/** Short label: the IATA code for an airport, the name for a place without one. */
export function shortLabel(code, db) {
  const p = db[code]
  return p && !isAirport(p) ? p.city : code
}
