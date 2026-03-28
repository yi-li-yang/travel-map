import Papa from 'papaparse'
import { haversine } from '../utils/geo.js'

// Normalize city name to match cities.json keys (lowercase, strip accents)
export function normalizeCityName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Expand raw CSV rows into arc segments.
// A row with a transfer city becomes two segments.
export function expandToSegments(rows, citiesDb) {
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
      // Two legs: origin → transfer, transfer → dest
      const seg1 = makeSegment(origin, transfer, year, true, citiesDb, routeCount)
      if (seg1) segments.push(seg1)
      const seg2 = makeSegment(transfer, dest, year, false, citiesDb, routeCount)
      if (seg2) segments.push(seg2)
    } else {
      const seg = makeSegment(origin, dest, year, false, citiesDb, routeCount)
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

function makeSegment(originName, destName, year, isTransfer, citiesDb, routeCount) {
  const originKey = normalizeCityName(originName)
  const destKey = normalizeCityName(destName)

  const originCoords = citiesDb[originKey]
  const destCoords = citiesDb[destKey]

  if (!originCoords) {
    console.warn(`City not found in citiesDb: "${originName}" (key: "${originKey}")`)
    return null
  }
  if (!destCoords) {
    console.warn(`City not found in citiesDb: "${destName}" (key: "${destKey}")`)
    return null
  }

  const distKm = haversine(
    originCoords.lat, originCoords.lon,
    destCoords.lat, destCoords.lon
  )

  const routeKey = [originName, destName].sort().join('|')
  const repeats = routeCount[routeKey] || 1

  return {
    originName,
    destName,
    originCoords,
    destCoords,
    year,
    isTransfer,
    distKm,
    repeats,
  }
}

// Build citiesDb from the raw cities.json + infer which cities are hubs
export function buildCitiesDb(citiesJson, rows) {
  // Determine hub cities: appear as transfer but never as final origin/dest
  const transferCities = new Set()
  const terminalCities = new Set()

  for (const row of rows) {
    if (row.transfer_city?.trim()) {
      transferCities.add(normalizeCityName(row.transfer_city))
    }
    if (row.origin_city?.trim()) terminalCities.add(normalizeCityName(row.origin_city))
    if (row.dest_city?.trim()) terminalCities.add(normalizeCityName(row.dest_city))
  }

  const db = {}
  for (const [key, val] of Object.entries(citiesJson)) {
    db[key] = {
      ...val,
      name: key, // lowercase normalized name
      isHub: transferCities.has(key) && !terminalCities.has(key),
    }
  }
  return db
}

// Load and parse all data. Returns { segments, citiesDb, rawRows }.
export async function loadFlightData() {
  const base = import.meta.env.BASE_URL

  const [csvText, citiesJson] = await Promise.all([
    fetch(`${base}flight_history.csv`).then((r) => r.text()),
    fetch(`${base}cities.json`).then((r) => r.json()),
  ])

  const { data: rawRows } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const citiesDb = buildCitiesDb(citiesJson, rawRows)
  const segments = expandToSegments(rawRows, citiesDb)

  return { segments, citiesDb, rawRows }
}
