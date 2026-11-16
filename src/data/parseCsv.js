import Papa from 'papaparse'
import { haversine } from '../utils/geo.js'

// Normalize IATA airport code: uppercase + trim
export function normalizeCode(code) {
  if (!code) return ''
  return String(code).toUpperCase().trim()
}

let idCounter = 0
export function newRowId() {
  idCounter += 1
  return `r${Date.now().toString(36)}${idCounter}`
}

// Make sure every row has a stable id and trimmed/uppercased codes.
export function cleanRows(rows) {
  return rows
    .map((r) => ({
      id: r.id || newRowId(),
      year: String(r.year ?? '').trim(),
      origin_city: normalizeCode(r.origin_city),
      transfer_city: normalizeCode(r.transfer_city),
      dest_city: normalizeCode(r.dest_city),
    }))
    .filter((r) => r.origin_city && r.dest_city)
}

// Parse CSV text into rows. Reports problems instead of throwing.
// Returns { rows, skipped, error }.
export function parseCsvText(text, airportsDb) {
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true })
  const fields = (meta.fields || []).map((f) => f.trim())
  const required = ['year', 'origin_city', 'dest_city']
  const missing = required.filter((f) => !fields.includes(f))
  if (missing.length) {
    return {
      rows: [],
      skipped: 0,
      error: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Expected: year, origin_city, transfer_city, dest_city.`,
    }
  }
  const cleaned = cleanRows(data)
  const known = (c) => !c || Boolean(airportsDb[c])
  const rows = cleaned.filter(
    (r) => known(r.origin_city) && known(r.transfer_city) && known(r.dest_city) && Number.isFinite(parseInt(r.year, 10)),
  )
  return { rows, skipped: data.length - rows.length, error: null }
}

// Expand raw rows into arc segments (legs).
// A row with a transfer city becomes two segments.
export function expandToSegments(rows, airportsDb) {
  const segments = []

  const routeCount = {}
  for (const row of rows) {
    for (const [a, b] of getRoutePairs(row)) {
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

    const legs = transfer
      ? [[origin, transfer, true], [transfer, dest, false]]
      : [[origin, dest, false]]
    for (const [a, b, isTransfer] of legs) {
      const seg = makeSegment(a, b, year, isTransfer, airportsDb, routeCount, row.id)
      if (seg) segments.push(seg)
    }
  }

  return segments
}

function getRoutePairs(row) {
  const origin = normalizeCode(row.origin_city)
  const transfer = normalizeCode(row.transfer_city)
  const dest = normalizeCode(row.dest_city)
  if (!origin || !dest) return []
  if (transfer) return [[origin, transfer], [transfer, dest]]
  return [[origin, dest]]
}

function makeSegment(originCode, destCode, year, isTransfer, airportsDb, routeCount, rowId) {
  const originKey = normalizeCode(originCode)
  const destKey = normalizeCode(destCode)
  const originEntry = airportsDb[originKey]
  const destEntry = airportsDb[destKey]

  if (!originEntry || !destEntry) {
    console.warn(`Airport not found: "${!originEntry ? originCode : destCode}"`)
    return null
  }

  const distKm = haversine(originEntry.lat, originEntry.lon, destEntry.lat, destEntry.lon)
  const routeKey = [originKey, destKey].sort().join('|')

  return {
    rowId,
    routeKey,
    originName: originKey,
    destName: destKey,
    originCity: originEntry.city || originKey,
    destCity: destEntry.city || destKey,
    originCoords: originEntry,
    destCoords: destEntry,
    year,
    isTransfer,
    distKm,
    repeats: routeCount[routeKey] || 1,
  }
}

// Build the airports lookup and mark which airports are only ever transfer hubs.
export function buildAirportsDb(airportsJson, rows) {
  const transferCodes = new Set()
  const terminalCodes = new Set()

  for (const row of rows) {
    if (row.transfer_city?.trim()) transferCodes.add(normalizeCode(row.transfer_city))
    if (row.origin_city?.trim()) terminalCodes.add(normalizeCode(row.origin_city))
    if (row.dest_city?.trim()) terminalCodes.add(normalizeCode(row.dest_city))
  }

  const db = {}
  for (const [key, val] of Object.entries(airportsJson)) {
    db[key] = { ...val, code: key, isHub: transferCodes.has(key) && !terminalCodes.has(key) }
  }
  return db
}

// Load the bundled CSV and airports file.
export async function loadFlightData() {
  const base = import.meta.env.BASE_URL
  const [csvRes, airportsRes] = await Promise.all([
    fetch(`${base}flight_history.csv`),
    fetch(`${base}airports.json`),
  ])
  if (!csvRes.ok || !airportsRes.ok) throw new Error('Could not load flight data files.')
  const [csvText, airports] = await Promise.all([csvRes.text(), airportsRes.json()])
  const { rows } = parseCsvText(csvText, airports)
  return { rows, airports }
}
