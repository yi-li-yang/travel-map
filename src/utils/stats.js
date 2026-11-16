import { haversine } from './geo.js'
import { continentOf, countryName } from '../data/countries.js'

export const EARTH_CIRCUMFERENCE_KM = 40075
const CRUISE_KMH = 850

// Years that have at least one flight, ascending.
export function listYears(rawRows) {
  const set = new Set()
  for (const r of rawRows) {
    const y = parseInt(r.year, 10)
    if (Number.isFinite(y)) set.add(y)
  }
  return [...set].sort((a, b) => a - b)
}

// Number of trips per year, e.g. { 2019: 8 }
export function tripsPerYear(rawRows) {
  const out = {}
  for (const r of rawRows) {
    const y = parseInt(r.year, 10)
    if (Number.isFinite(y)) out[y] = (out[y] || 0) + 1
  }
  return out
}

// Terminal airports of a trip (origin and destination; transfers excluded).
function terminals(row) {
  return [row.origin_city, row.dest_city]
}

/**
 * Everything the Overview tab shows.
 * `scope` is 'upto' (everything up to and including `year`) or 'only' (just that year).
 * "New this year" figures always compare against everything before `year`.
 */
export function computeStats(rawRows, segments, db, year, scope = 'upto') {
  const rowYear = (r) => parseInt(r.year, 10)
  const inScope = (y) => (scope === 'only' ? y === year : y <= year)

  const rows = rawRows.filter((r) => Number.isFinite(rowYear(r)) && inScope(rowYear(r)))
  const legs = segments.filter((s) => inScope(s.year))
  const allRows = rawRows.filter((r) => Number.isFinite(rowYear(r)) && rowYear(r) <= year)
  const allLegs = segments.filter((s) => s.year <= year)

  // Airports and countries, with the first year each was reached (over all rows up to `year`)
  const firstAirportYear = new Map()
  const airportVisits = new Map()
  const countryInfo = new Map()
  for (const r of allRows.slice().sort((a, b) => rowYear(a) - rowYear(b))) {
    for (const code of terminals(r)) {
      const ap = db[code]
      if (!ap) continue
      const y = rowYear(r)
      if (!firstAirportYear.has(code)) firstAirportYear.set(code, y)
      airportVisits.set(code, (airportVisits.get(code) || 0) + 1)
      let c = countryInfo.get(ap.country)
      if (!c) {
        c = { code: ap.country, name: countryName(ap.country), continent: continentOf(ap.country), firstYear: y, visits: 0, lon: ap.lon, lat: ap.lat }
        countryInfo.set(ap.country, c)
      }
      c.visits += 1
    }
  }

  const scopedAirports = new Set()
  const scopedCountries = new Set()
  for (const r of rows) {
    for (const code of terminals(r)) {
      if (!db[code]) continue
      scopedAirports.add(code)
      scopedCountries.add(db[code].country)
    }
  }

  const km = legs.reduce((sum, s) => sum + s.distKm, 0)

  // Home base: the airport you start from most often
  const originCounts = new Map()
  for (const r of allRows) originCounts.set(r.origin_city, (originCounts.get(r.origin_city) || 0) + 1)
  let homeCode = null
  for (const [code, n] of originCounts) if (!homeCode || n > originCounts.get(homeCode)) homeCode = code
  const home = homeCode && db[homeCode] ? db[homeCode] : null
  let farthest = null
  if (home) {
    for (const code of firstAirportYear.keys()) {
      const ap = db[code]
      const d = haversine(home.lat, home.lon, ap.lat, ap.lon)
      if (!farthest || d > farthest.km) farthest = { ...ap, code, km: d }
    }
  }

  // Records over the scoped legs
  const flown = legs.filter((s) => s.distKm > 0)
  const longest = flown.reduce((a, b) => (!a || b.distKm > a.distKm ? b : a), null)
  const shortest = flown.reduce((a, b) => (!a || b.distKm < a.distKm ? b : a), null)
  const routeCounts = new Map()
  for (const s of legs) routeCounts.set(s.routeKey, { n: (routeCounts.get(s.routeKey)?.n || 0) + 1, seg: s })
  let topRoute = null
  for (const v of routeCounts.values()) if (!topRoute || v.n > topRoute.n) topRoute = v

  let topAirport = null
  for (const [code, n] of airportVisits) {
    if (code === homeCode) continue
    if (!topAirport || n > topAirport.n) topAirport = { code, n, ...db[code] }
  }

  const perYear = tripsPerYear(allRows)
  const busiest = Object.entries(perYear).reduce((a, [y, n]) => (!a || n > a.n ? { year: +y, n } : a), null)

  // Year in focus
  const yearRows = rawRows.filter((r) => rowYear(r) === year)
  const yearLegs = segments.filter((s) => s.year === year)
  const newCountries = [...countryInfo.values()].filter((c) => c.firstYear === year)
  const newAirports = [...firstAirportYear.entries()].filter(([, y]) => y === year).map(([code]) => ({ code, ...db[code] }))
  const activeYears = Object.keys(perYear).length || 1
  const avgTrips = allRows.length / activeYears

  const countries = [...countryInfo.values()]
    .filter((c) => (scope === 'only' ? scopedCountries.has(c.code) : true))
    .sort((a, b) => a.firstYear - b.firstYear || b.visits - a.visits)
  const continents = new Set(countries.map((c) => c.continent).filter((c) => c && c !== 'Antarctica'))

  return {
    trips: rows.length,
    legs: legs.length,
    airports: scopedAirports.size,
    countryCount: scopedCountries.size,
    km,
    timesAroundEarth: km / EARTH_CIRCUMFERENCE_KM,
    hours: km / CRUISE_KMH,
    countries,
    continents: [...continents],
    home,
    farthest,
    records: { longest, shortest, topRoute, topAirport, busiest },
    focus: {
      year,
      trips: yearRows.length,
      km: yearLegs.reduce((s, l) => s + l.distKm, 0),
      newCountries,
      newAirports,
      avgTrips,
    },
    hasAny: allLegs.length > 0,
  }
}

// Everything about one airport, for the city panel.
export function computeCity(code, rawRows, segments, db, year) {
  const ap = db[code]
  if (!ap) return null
  const rows = rawRows.filter((r) => {
    const y = parseInt(r.year, 10)
    return y <= year && (r.origin_city === code || r.dest_city === code || r.transfer_city === code)
  })
  const visits = rows.filter((r) => r.dest_city === code || r.transfer_city === code).length
  const years = rows.map((r) => parseInt(r.year, 10)).sort((a, b) => a - b)
  return {
    ...ap,
    code,
    country: countryName(ap.country),
    visits,
    departures: rows.filter((r) => r.origin_city === code).length,
    firstYear: years[0] ?? null,
    lastYear: years[years.length - 1] ?? null,
    rows: rows.sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10)),
  }
}

export function formatKm(km) {
  return Math.round(km).toLocaleString('en-GB')
}

// Route keys of every leg of a trip row, matching segment.routeKey.
export function rowRouteKeys(row) {
  const stops = [row.origin_city, row.transfer_city, row.dest_city].filter(Boolean)
  const keys = []
  for (let i = 0; i < stops.length - 1; i++) keys.push([stops[i], stops[i + 1]].sort().join('|'))
  return keys
}

// Everything about one route: how often, when, how far.
export function computeRoute(routeKey, segments, db, year) {
  const legs = segments.filter((s) => s.routeKey === routeKey && s.year <= year)
  const any = legs[0] || segments.find((s) => s.routeKey === routeKey)
  if (!any) return null
  return {
    routeKey,
    from: any.originName,
    to: any.destName,
    fromCity: any.originCity,
    toCity: any.destCity,
    km: any.distKm,
    years: legs.map((l) => l.year).sort((a, b) => a - b),
  }
}
