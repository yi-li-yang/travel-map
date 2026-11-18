import { haversine } from './geo.js'
import { continentOf, countryName } from '../data/countries.js'
import { AIR, GROUND, routeKey, visitedStops } from '../data/route.js'

export const EARTH_CIRCUMFERENCE_KM = 40075
export const CRUISE_KMH = 850
const TOP_N = 5

const tripYear = (t) => parseInt(t.year, 10)

// Years that have at least one trip, ascending.
export function listYears(trips) {
  const set = new Set()
  for (const t of trips) {
    const y = tripYear(t)
    if (Number.isFinite(y)) set.add(y)
  }
  return [...set].sort((a, b) => a - b)
}

// Number of trips per year, e.g. { 2019: 8 }
export function tripsPerYear(trips) {
  const out = {}
  for (const t of trips) {
    const y = tripYear(t)
    if (Number.isFinite(y)) out[y] = (out[y] || 0) + 1
  }
  return out
}

// Distinct places visited across all trips (connections left out).
export function countPlaces(trips) {
  const set = new Set()
  for (const t of trips) for (const code of visitedStops(t)) set.add(code)
  return set.size
}

// Home base: the place trips start from most often, or null.
export function homeOf(trips, db) {
  const counts = new Map()
  for (const t of trips) counts.set(t.stops[0].code, (counts.get(t.stops[0].code) || 0) + 1)
  let code = null
  for (const [c, n] of counts) if (!code || n > counts.get(code)) code = c
  return code && db[code] ? db[code] : null
}

// For each year, the countries reached for the first time that year (all trips, whatever the timeline says).
export function countryFirstYears(trips, db) {
  const seen = new Set()
  const out = new Map()
  for (const t of trips.slice().sort((a, b) => tripYear(a) - tripYear(b))) {
    for (const code of visitedStops(t)) {
      const country = db[code]?.country
      if (!country || seen.has(country)) continue
      seen.add(country)
      const y = tripYear(t)
      out.set(y, [...(out.get(y) || []), countryName(country)])
    }
  }
  return out
}

// routeKey → the years it was travelled, ascending and without repeats.
export function routeYearsMap(segments) {
  const sets = new Map()
  for (const s of segments) {
    if (!sets.has(s.routeKey)) sets.set(s.routeKey, new Set())
    sets.get(s.routeKey).add(s.year)
  }
  return new Map([...sets].map(([key, years]) => [key, [...years].sort((a, b) => a - b)]))
}

// trip id → kilometres of the whole trip.
export function kmByTrip(segments) {
  const out = new Map()
  for (const s of segments) out.set(s.rowId, (out.get(s.rowId) || 0) + s.distKm)
  return out
}

const sumKm = (legs) => legs.reduce((sum, s) => sum + s.distKm, 0)
const longestOf = (legs) => legs.reduce((a, b) => (!a || b.distKm > a.distKm ? b : a), null)
const shortestOf = (legs) => legs.reduce((a, b) => (!a || b.distKm < a.distKm ? b : a), null)

/**
 * Everything the Overview tab shows.
 * `scope` is 'upto' (everything up to and including `year`) or 'only' (just that year).
 * "New this year" figures always compare against everything before `year`.
 */
export function computeStats(allTripsEver, segments, db, year, scope = 'upto') {
  const inScope = (y) => (scope === 'only' ? y === year : y <= year)

  const trips = allTripsEver.filter((t) => inScope(tripYear(t)))
  const legs = segments.filter((s) => inScope(s.year))
  const allTrips = allTripsEver.filter((t) => tripYear(t) <= year)

  // Places and countries, with the first year each was reached (over all trips up to `year`)
  const firstPlaceYear = new Map()
  const countryInfo = new Map()
  for (const t of allTrips.slice().sort((a, b) => tripYear(a) - tripYear(b))) {
    const y = tripYear(t)
    for (const code of visitedStops(t)) {
      const p = db[code]
      if (!p) continue
      if (!firstPlaceYear.has(code)) firstPlaceYear.set(code, y)
      let c = countryInfo.get(p.country)
      if (!c) {
        c = { code: p.country, name: countryName(p.country), continent: continentOf(p.country), firstYear: y, visits: 0, lon: p.lon, lat: p.lat }
        countryInfo.set(p.country, c)
      }
      c.visits += 1
    }
  }

  // The same figures for the trips in scope
  const scopedPlaces = new Set()
  const scopedCountries = new Set()
  const arrivals = new Map()
  for (const t of trips) {
    visitedStops(t).forEach((code, i) => {
      if (!db[code]) return
      scopedPlaces.add(code)
      scopedCountries.add(db[code].country)
      if (i > 0) arrivals.set(code, (arrivals.get(code) || 0) + 1)
    })
  }

  const flights = legs.filter((s) => s.mode === AIR)
  const overland = legs.filter((s) => s.mode === GROUND)
  const km = sumKm(legs)
  const airKm = sumKm(flights)

  const home = homeOf(allTrips, db)
  let farthest = null
  if (home) {
    for (const code of firstPlaceYear.keys()) {
      const p = db[code]
      const d = haversine(home.lat, home.lon, p.lat, p.lon)
      if (!farthest || d > farthest.km) farthest = { ...p, code, km: d }
    }
  }

  // Most travelled routes and most visited places (home left out: it would always win)
  const routeCounts = new Map()
  for (const s of legs) routeCounts.set(s.routeKey, { n: (routeCounts.get(s.routeKey)?.n || 0) + 1, seg: s })
  const topRoutes = [...routeCounts.values()]
    .filter((r) => r.n > 1)
    .sort((a, b) => b.n - a.n || b.seg.distKm - a.seg.distKm)
    .slice(0, TOP_N)
  const topPlaces = [...arrivals]
    .filter(([code, n]) => n > 1 && code !== home?.code)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([code, n]) => ({ code, n, city: db[code].city || code }))

  const perYear = tripsPerYear(allTrips)
  const busiest = Object.entries(perYear).reduce((a, [y, n]) => (!a || n > a.n ? { year: +y, n } : a), null)

  // Year in focus
  const yearTrips = allTripsEver.filter((t) => tripYear(t) === year)
  const yearLegs = segments.filter((s) => s.year === year)
  const newCountries = [...countryInfo.values()].filter((c) => c.firstYear === year)
  const newPlaces = [...firstPlaceYear.entries()].filter(([, y]) => y === year).map(([code]) => ({ code, ...db[code] }))
  const activeYears = Object.keys(perYear).length || 1

  const countries = [...countryInfo.values()]
    .filter((c) => (scope === 'only' ? scopedCountries.has(c.code) : true))
    .sort((a, b) => a.firstYear - b.firstYear || b.visits - a.visits)
  const continents = new Set(countries.map((c) => c.continent).filter((c) => c && c !== 'Antarctica'))
  const positive = (list) => list.filter((s) => s.distKm > 0)

  return {
    trips: trips.length,
    places: scopedPlaces.size,
    countryCount: scopedCountries.size,
    km,
    airKm,
    groundKm: km - airKm,
    timesAroundEarth: km / EARTH_CIRCUMFERENCE_KM,
    hours: airKm / CRUISE_KMH,
    countries,
    continents: [...continents],
    home,
    farthest,
    topRoutes,
    topPlaces,
    records: {
      longest: longestOf(positive(flights)),
      shortest: shortestOf(positive(flights)),
      longestGround: longestOf(positive(overland)),
      busiest,
    },
    focus: {
      year,
      trips: yearTrips.length,
      km: sumKm(yearLegs),
      newCountries,
      newPlaces,
      avgTrips: allTrips.length / activeYears,
    },
  }
}

// Everything about one place, for the city panel.
export function computeCity(code, allTrips, db, year) {
  const p = db[code]
  if (!p) return null
  const trips = allTrips.filter((t) => tripYear(t) <= year && t.stops.some((s) => s.code === code))
  const arrivals = trips.reduce((n, t) => n + t.stops.filter((s, i) => i > 0 && s.code === code).length, 0)
  const years = trips.map(tripYear).sort((a, b) => a - b)
  return {
    ...p,
    code,
    country: countryName(p.country),
    visits: arrivals,
    departures: trips.filter((t) => t.stops[0].code === code).length,
    firstYear: years[0] ?? null,
    lastYear: years[years.length - 1] ?? null,
    trips: trips.sort((a, b) => tripYear(b) - tripYear(a)),
  }
}

export function formatKm(km) {
  return Math.round(km).toLocaleString('en-GB')
}

// "1 h 40 min" for a flight of `km`, at the same cruise speed the totals use.
export function flightTime(km) {
  const minutes = Math.max(5, Math.round(((km / CRUISE_KMH) * 60) / 5) * 5)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

// Everything about one route: how often, when, how far, and how.
export function computeRoute(routeKey, segments, year) {
  const legs = segments.filter((s) => s.routeKey === routeKey && s.year <= year)
  const any = legs[0] || segments.find((s) => s.routeKey === routeKey)
  if (!any) return null
  return {
    routeKey,
    mode: any.mode,
    from: any.originName,
    to: any.destName,
    fromCity: any.originCity,
    toCity: any.destCity,
    km: any.distKm,
    years: legs.map((l) => l.year).sort((a, b) => a - b),
  }
}

// One trip's legs with their distances, and the totals.
export function computeTrip(trip, db) {
  const legs = trip.legs.map((l) => ({
    ...l,
    key: routeKey(l.from, l.to, l.mode),
    km: haversine(db[l.from].lat, db[l.from].lon, db[l.to].lat, db[l.to].lon),
  }))
  const airKm = legs.filter((l) => l.mode === AIR).reduce((s, l) => s + l.km, 0)
  const groundKm = legs.filter((l) => l.mode === GROUND).reduce((s, l) => s + l.km, 0)
  return { trip, legs, km: airKm + groundKm, airKm, groundKm }
}
