import Papa from 'papaparse'
import { haversine } from '../utils/geo.js'

// Normalize IATA airport code: uppercase + trim
export function normalizeCode(code) {
  if (!code) return ''
  return code.toUpperCase().trim()
}

// Expand raw CSV rows into arc segments.
// A row with a transfer city becomes two segments.
export function expandToSegments(rows, airportsDb) {
  const segments = []

  // Count route frequency for arc width calculation
  const routeCount = {}
  for (const row of rows) {
    const pairs = getRoutePairs(row)
    for (const [a, b] of pairs) {
      const key = [a, b].sort().join('|')
      routeCount[key] = (routeCount[key] || 0) + 1
    }
  }

  for (const row of rows) {
    const year = parseInt(row.year, 10)
    const origin = row.origin_city?.trim()
    const transfer = row.transfer_city?.trim()
    const dest = row.dest_city?.trim()

    if (!origin || !dest) continue

    if (transfer) {
      const seg1 = makeSegment(origin, transfer, year, true, airportsDb, routeCount)
      if (seg1) segments.push(seg1)
      const seg2 = makeSegment(transfer, dest, year, false, airportsDb, routeCount)
      if (seg2) segments.push(seg2)
    } else {
      const seg = makeSegment(origin, dest, year, false, airportsDb, routeCount)
      if (seg) segments.push(seg)
    }
  }

  return segments
}

function getRoutePairs(row) {
  const origin = row.origin_city?.trim()
  const transfer = row.transfer_city?.trim()
  const dest = row.dest_city?.trim()
  if (!origin || !dest) return []
  if (transfer) return [[origin, transfer], [transfer, dest]]
  return [[origin, dest]]
}

function makeSegment(originCode, destCode, year, isTransfer, airportsDb, routeCount) {
  const originKey = normalizeCode(originCode)
  const destKey = normalizeCode(destCode)

  const originEntry = airportsDb[originKey]
  const destEntry = airportsDb[destKey]

  if (!originEntry) {
    console.warn(`Airport not found: "${originCode}" (key: "${originKey}")`)
    return null
  }
  if (!destEntry) {
    console.warn(`Airport not found: "${destCode}" (key: "${destKey}")`)
    return null
  }

  const distKm = haversine(
    originEntry.lat, originEntry.lon,
    destEntry.lat, destEntry.lon
  )

  const routeKey = [originKey, destKey].sort().join('|')
  const repeats = routeCount[routeKey] || 1

  return {
    originName: originKey,
    destName: destKey,
    originCity: originEntry.city || originKey,
    destCity: destEntry.city || destKey,
    originCoords: originEntry,
    destCoords: destEntry,
    year,
    isTransfer,
    distKm,
    repeats,
  }
}

// Build airportsDb from raw airports.json + infer which airports are hubs
export function buildAirportsDb(airportsJson, rows) {
  const transferCodes = new Set()
  const terminalCodes = new Set()

  for (const row of rows) {
    if (row.transfer_city?.trim()) {
      transferCodes.add(normalizeCode(row.transfer_city))
    }
    if (row.origin_city?.trim()) terminalCodes.add(normalizeCode(row.origin_city))
    if (row.dest_city?.trim()) terminalCodes.add(normalizeCode(row.dest_city))
  }

  const db = {}
  for (const [key, val] of Object.entries(airportsJson)) {
    db[key] = {
      ...val,
      isHub: transferCodes.has(key) && !terminalCodes.has(key),
    }
  }
  return db
}

// Keep old name as alias for components that haven't been updated yet
export const buildCitiesDb = buildAirportsDb

// Load and parse all data. Returns { segments, citiesDb, rawRows }.
export async function loadFlightData() {
  const base = import.meta.env.BASE_URL

  const [csvText, airportsJson] = await Promise.all([
    fetch(`${base}flight_history.csv`).then((r) => r.text()),
    fetch(`${base}airports.json`).then((r) => r.json()),
  ])

  const { data: rawRows } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const citiesDb = buildAirportsDb(airportsJson, rawRows)
  const segments = expandToSegments(rawRows, citiesDb)

  return { segments, citiesDb, rawRows }
}
