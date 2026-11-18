// The "back end" for trip data. The CSVs in public/trips/ are the only source of truth and the
// web app only reads them. This script keeps them valid, and runs before every build so a typo
// in a place code stops the deploy instead of quietly dropping a trip from the globe.
//
//   npm run trips -- check                                   validate every CSV and places.json
//   npm run trips -- add yili 2027 LHR-PEK                   append a flight
//   npm run trips -- add yili 2027 "CTU-(DOH)-JFK"           ... with a connection (quote the brackets)
//   npm run trips -- add luyi 2028 CTU-PEK=CDE=PEK-CTU 北大   ... overland leg, and a note
//
// Route syntax: stops joined by "-" (flight) or "=" (overland), "(XXX)" for a connection only.
// Set TRIPS_DIR to use another folder of CSVs (for testing).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'
import { USERS, csvPath } from '../src/data/users.js'
import { CSV_COLUMNS, mergePlaces } from '../src/data/parseCsv.js'
import { parseRoute, formatRoute } from '../src/data/route.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const tripsDir = process.env.TRIPS_DIR ? path.resolve(process.env.TRIPS_DIR) : path.join(pub, 'trips')
const MIN_YEAR = 1950
const MAX_YEAR = 2100

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const airports = readJson(path.join(pub, 'airports.json'))
const placesFile = readJson(path.join(pub, 'places.json'))
const db = mergePlaces(airports, placesFile)

// ---- places.json ----

function placeProblems() {
  const out = []
  for (const [code, p] of Object.entries(placesFile)) {
    if (!/^[A-Z]{4,}$/.test(code)) out.push(`"${code}": a place without an airport needs a name in capitals, letters only, at least 4 long`)
    if (airports[code]) out.push(`"${code}" is also an airport code`)
    if (!p.city || !p.name) out.push(`"${code}": name and city are required`)
    if (!/^[A-Z]{2}$/.test(p.country || '')) out.push(`"${code}": country must be a two-letter code such as "CN"`)
    if (!(Math.abs(p.lat) <= 90) || !(Math.abs(p.lon) <= 180)) out.push(`"${code}": lat/lon are not valid coordinates`)
  }
  return out
}

// ---- trips ----

/** Why this row is not a valid trip. An empty list means it is fine. */
function rowProblems({ year, route }) {
  const out = []
  const y = Number(year)
  if (!/^\d{4}$/.test(String(year ?? '').trim()) || y < MIN_YEAR || y > MAX_YEAR) {
    out.push(`year "${year}" should be four digits between ${MIN_YEAR} and ${MAX_YEAR}`)
  }
  const parsed = parseRoute(route)
  if (!parsed) return [...out, `route "${route}" needs at least two stops joined by - or =`]
  const { stops } = parsed
  for (const s of stops) {
    if (db[s.code]) continue
    const hint = db[s.code.toUpperCase()] ? '' : ' (airports use the IATA code, other places are listed in public/places.json)'
    out.push(`unknown place "${s.code}"${hint}`)
  }
  if (stops[0].via || stops[stops.length - 1].via) out.push('a trip cannot start or end at a connection in brackets')
  stops.forEach((s, i) => {
    if (i && s.code === stops[i - 1].code) out.push(`${s.code} appears twice in a row`)
  })
  return out
}

const canonical = (route) => {
  const parsed = parseRoute(route)
  return parsed ? formatRoute(parsed.stops, parsed.modes) : route
}

function readTrips(file) {
  const text = fs.readFileSync(file, 'utf8')
  const bom = text.startsWith('﻿')
  const { data, meta, errors } = Papa.parse(bom ? text.slice(1) : text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return { rows: data, fields: meta.fields || [], errors, bom, newline: text.includes('\r\n') ? '\r\n' : '\n' }
}

// Line numbers count the header as line 1.
function checkFile(file) {
  const errors = []
  const warnings = []
  if (!fs.existsSync(file)) return { errors: [`${path.basename(file)} does not exist`], warnings, count: 0 }
  const { rows, fields, errors: parseErrors } = readTrips(file)
  if (!fields.includes('year') || !fields.includes('route')) {
    return { errors: [`the header must be ${CSV_COLUMNS.join(',')}`], warnings, count: 0 }
  }
  for (const e of parseErrors) errors.push(`line ${e.row + 2}: ${e.message}`)

  const seen = new Map()
  let latest = 0
  rows.forEach((row, i) => {
    const line = i + 2
    for (const p of rowProblems(row)) errors.push(`line ${line}: ${p}`)
    if (parseRoute(row.route) && canonical(row.route) !== row.route) warnings.push(`line ${line}: write the route as ${canonical(row.route)}`)
    const key = [row.year, canonical(row.route), row.note ?? ''].join('|')
    if (seen.has(key)) warnings.push(`line ${line}: same trip as line ${seen.get(key)}. Fine if you really made it twice`)
    else seen.set(key, line)
    const y = Number(row.year)
    if (y < latest) warnings.push(`line ${line}: ${y} comes after ${latest}, so the file is not in year order`)
    latest = Math.max(latest, y)
  })
  return { errors, warnings, count: rows.length }
}

function check() {
  let failed = false
  const places = placeProblems()
  console.log(`${places.length ? 'FAIL' : 'ok  '} places.json: ${Object.keys(placesFile).length} places`)
  for (const p of places) console.log(`     error, ${p}`)
  if (places.length) failed = true

  for (const user of USERS) {
    const name = csvPath(user)
    const { errors, warnings, count } = checkFile(path.join(tripsDir, path.basename(name)))
    console.log(`${errors.length ? 'FAIL' : 'ok  '} ${name}: ${count} trips`)
    for (const w of warnings) console.log(`     warning, ${w}`)
    for (const e of errors) console.log(`     error, ${e}`)
    if (errors.length) failed = true
  }
  if (failed) {
    console.error('\nTrip data has errors. Fix the lines above.')
    process.exit(1)
  }
}

function add(args) {
  const [userId, year, route, ...noteWords] = args
  const user = USERS.find((u) => u.id === userId)
  if (!user || !year || !route) {
    console.error(`Usage: npm run trips -- add <${USERS.map((u) => u.id).join('|')}> <year> <route> [note]`)
    process.exit(1)
  }
  const row = { year: String(year), route: canonical(route), note: noteWords.join(' ') }
  const problems = rowProblems(row)
  if (problems.length) {
    for (const p of problems) console.error(`error, ${p}`)
    process.exit(1)
  }

  const file = path.join(tripsDir, path.basename(csvPath(user)))
  const { rows, bom, newline } = readTrips(file)
  // Keep the file in year order: go after the last trip that is not later than this one.
  let at = 0
  rows.forEach((r, i) => {
    if (Number(r.year) <= Number(row.year)) at = i + 1
  })
  rows.splice(at, 0, row)
  const data = rows.map((r) => CSV_COLUMNS.map((c) => r[c] ?? ''))
  fs.writeFileSync(file, (bom ? '﻿' : '') + Papa.unparse({ fields: CSV_COLUMNS, data }, { newline }) + newline)

  const label = (s) => db[s.code].city || s.code
  console.log(`Added to ${path.basename(file)}: ${row.year}, ${parseRoute(row.route).stops.map(label).join(' → ')}`)
  check()
}

const [command, ...rest] = process.argv.slice(2)
if (command === 'check') check()
else if (command === 'add') add(rest)
else {
  console.error('Usage: npm run trips -- check | add <user> <year> <route> [note]')
  process.exit(1)
}
