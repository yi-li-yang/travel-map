import Papa from 'papaparse'
import { haversine } from '../utils/geo.js'
import { normalizeCode, resolveTrip, routeKey } from './route.js'

export const CSV_COLUMNS = ['year', 'route', 'note']

/**
 * Parse a trips CSV into trips (see resolveTrip). Rows that are not valid are left out and counted.
 * A trip's id is its row in the file, so it is the same on every load. Returns { trips, skipped, error }.
 */
export function parseCsvText(text, placesDb, idPrefix = '') {
  const { data, meta } = Papa.parse(String(text).replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  const fields = meta.fields || []
  if (!fields.includes('year') || !fields.includes('route')) {
    return { trips: [], skipped: 0, error: `Expected the columns ${CSV_COLUMNS.join(', ')}.` }
  }
  const trips = []
  data.forEach((r, i) => {
    const trip = resolveTrip(
      { id: `${idPrefix}${i}`, year: String(r.year ?? '').trim(), route: r.route, note: String(r.note ?? '').trim() },
      placesDb,
    )
    if (trip) trips.push(trip)
  })
  return { trips, skipped: data.length - trips.length, error: null }
}

// Every leg of every trip, with coordinates, distance and how often its route is travelled.
export function expandToSegments(trips, db) {
  const count = {}
  for (const t of trips) {
    for (const l of t.legs) {
      const key = routeKey(l.from, l.to, l.mode)
      count[key] = (count[key] || 0) + 1
    }
  }

  const segments = []
  for (const t of trips) {
    const year = parseInt(t.year, 10)
    for (const l of t.legs) {
      const a = db[l.from]
      const b = db[l.to]
      if (!a || !b) continue
      const key = routeKey(l.from, l.to, l.mode)
      segments.push({
        rowId: t.id,
        routeKey: key,
        originName: l.from,
        destName: l.to,
        originCity: a.city || l.from,
        destCity: b.city || l.to,
        originCoords: a,
        destCoords: b,
        year,
        mode: l.mode,
        isTransfer: l.via,
        distKm: haversine(a.lat, a.lon, b.lat, b.lon),
        repeats: count[key],
      })
    }
  }
  return segments
}

// Airports and places without one, in a single lookup keyed by code.
export function mergePlaces(airports, places) {
  const base = {}
  for (const [code, a] of Object.entries(airports)) base[code] = { ...a, kind: 'airport' }
  for (const [code, p] of Object.entries(places)) base[normalizeCode(code)] = { ...p, kind: 'place' }
  return base
}

// The lookup the app uses: every place plus `code`, and `isHub` for places that are only ever connections.
export function buildPlacesDb(base, trips) {
  const via = new Set()
  const visited = new Set()
  for (const t of trips) for (const s of t.stops) (s.via ? via : visited).add(s.code)
  const db = {}
  for (const [code, p] of Object.entries(base)) db[code] = { ...p, code, isHub: via.has(code) && !visited.has(code) }
  return db
}

// Airports and places are the same for everyone, so they are fetched once.
let placesPromise = null
function loadPlaces(base) {
  if (!placesPromise) {
    placesPromise = Promise.all([fetch(`${base}airports.json`), fetch(`${base}places.json`)])
      .then(async ([a, p]) => {
        if (!a.ok || !p.ok) throw new Error('Could not load the list of places.')
        return mergePlaces(await a.json(), await p.json())
      })
      .catch((err) => {
        placesPromise = null
        throw err
      })
  }
  return placesPromise
}

// Load one person's trips file and the shared places.
export async function loadTravelData(csvPath, idPrefix = '') {
  const base = import.meta.env.BASE_URL
  const [csvRes, places] = await Promise.all([fetch(`${base}${csvPath}`), loadPlaces(base)])
  if (!csvRes.ok) throw new Error('Could not load the trips file.')
  const { trips, skipped, error } = parseCsvText(await csvRes.text(), places, idPrefix)
  if (error) throw new Error(`${csvPath}: ${error}`)
  if (skipped) console.warn(`${skipped} rows in ${csvPath} were left out (unknown place or invalid route). Run "npm run trips -- check".`)
  return { trips, places }
}
