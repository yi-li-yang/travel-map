import { greatCirclePoints } from '../utils/geo.js'
import { COLORS, FIRST_LABEL_LAYER, withAlpha } from './style.js'

export const ARC_SOURCE = 'arcs'
const ARC_DURATION_MS = 800
const DIMMED = 0.22 // how visible the other routes stay while one is in focus

// Great-circle path as [lon, lat] pairs, with longitudes unwrapped so a path that
// crosses the antimeridian stays continuous (MapLibre draws the wrapped copy).
export function arcCoordinates(seg) {
  const n = Math.min(120, Math.max(16, Math.round(seg.distKm / 60)))
  const pts = greatCirclePoints(seg.originCoords.lat, seg.originCoords.lon, seg.destCoords.lat, seg.destCoords.lon, n)
  const out = []
  let prev = null
  for (const [lat, lon] of pts) {
    let l = lon
    if (prev !== null) {
      while (l - prev > 180) l -= 360
      while (l - prev < -180) l += 360
    }
    out.push([l, lat])
    prev = l
  }
  return out
}

// One stable key per leg, so an arc that already drew in does not draw again.
export function legKeys(segments) {
  const seen = new Map()
  return segments.map((s) => {
    const base = `${s.rowId}:${s.originName}-${s.destName}`
    const n = seen.get(base) || 0
    seen.set(base, n + 1)
    return `${base}:${n}`
  })
}

// Overland legs all run in one direction per pair, so the dashes of an outbound
// and a return leg line up instead of filling each other's gaps.
const isReversed = (props) => props.mode === 'ground' && props.from > props.to

function legCoordinates(seg) {
  const coords = arcCoordinates(seg)
  return seg.mode === 'ground' && seg.originName > seg.destName ? coords.reverse() : coords
}

/** A leg's coordinates in the direction it was travelled (overland legs may be stored the other way round). */
export const forwardCoords = (arc) => (isReversed(arc.props) ? arc.coords.slice().reverse() : arc.coords)

export function buildArcs(segments) {
  const keys = legKeys(segments)
  return segments.map((seg, i) => ({
    key: keys[i],
    trip: seg.rowId,
    year: seg.year,
    coords: legCoordinates(seg),
    props: {
      key: keys[i],
      trip: seg.rowId,
      year: seg.year,
      repeats: seg.repeats,
      transfer: seg.isTransfer ? 1 : 0,
      mode: seg.mode,
      routeKey: seg.routeKey,
      from: seg.originName,
      to: seg.destName,
      km: Math.round(seg.distKm),
    },
  }))
}

function slice(coords, p) {
  if (p >= 1) return coords
  const f = p * (coords.length - 1)
  const i = Math.floor(f)
  const t = f - i
  const out = coords.slice(0, i + 1)
  if (i + 1 < coords.length) {
    const [x0, y0] = coords[i]
    const [x1, y1] = coords[i + 1]
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
  }
  return out
}

const ease = (t) => 1 - Math.pow(1 - t, 3)

// ---- layers ----

const NONE = ['==', ['get', 'routeKey'], '']
const isAir = ['==', ['get', 'mode'], 'air']
const isGround = ['==', ['get', 'mode'], 'ground']
const isConnection = ['==', ['get', 'transfer'], 1]
const fade = (from, to) => ['interpolate', ['linear'], ['line-progress'], 0, from, 1, to]

// What each layer shows when nothing is in focus. Dimming multiplies these.
const BASE_OPACITY = {
  'arcs-core': 1,
  'arcs-core-connection': 1,
  'arcs-ground': 0.95,
}

export function arcLayers() {
  const repeats = ['min', ['get', 'repeats'], 6]
  const widthAt = (base) => ['interpolate', ['linear'], ['zoom'], 0, ['*', base, 0.8], 6, ['*', base, 1.6]]
  const round = { 'line-cap': 'round', 'line-join': 'round' }
  const flight = COLORS.flight
  return [
    {
      // line-gradient needs one layer per colour pair, since it cannot read feature properties.
      // A flight fades in from its origin, so the line shows which way it went. No glow: the line is the mark.
      id: 'arcs-core',
      type: 'line',
      source: ARC_SOURCE,
      filter: ['all', isAir, ['!', isConnection]],
      layout: round,
      paint: {
        'line-gradient': fade(withAlpha(flight, 0.3), flight),
        'line-width': widthAt(['+', 1, ['*', 0.3, repeats]]),
        'line-opacity': BASE_OPACITY['arcs-core'],
      },
    },
    {
      // Legs of a connecting flight: the same colour, fainter.
      id: 'arcs-core-connection',
      type: 'line',
      source: ARC_SOURCE,
      filter: ['all', isAir, isConnection],
      layout: round,
      paint: {
        'line-gradient': fade(withAlpha(flight, 0.15), withAlpha(flight, 0.55)),
        'line-width': widthAt(['+', 1, ['*', 0.3, repeats]]),
        'line-opacity': BASE_OPACITY['arcs-core-connection'],
      },
    },
    {
      // Overland legs: dashed, in their own colour, so they read as a different way of travelling.
      id: 'arcs-ground',
      type: 'line',
      source: ARC_SOURCE,
      filter: isGround,
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.overland,
        'line-width': widthAt(['+', 1.2, ['*', 0.3, repeats]]),
        'line-dasharray': [2.2, 1.6],
        'line-opacity': BASE_OPACITY['arcs-ground'],
      },
    },
    {
      id: 'arcs-hit',
      type: 'line',
      source: ARC_SOURCE,
      paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 14 },
    },
    {
      // A casing in the ground colour under whatever is hovered or selected, so it stands clear of the others.
      id: 'arcs-lit',
      type: 'line',
      source: ARC_SOURCE,
      filter: NONE,
      layout: round,
      paint: { 'line-color': COLORS.page, 'line-width': widthAt(5), 'line-opacity': 0.85 },
    },
    {
      id: 'arcs-hover',
      type: 'line',
      source: ARC_SOURCE,
      filter: NONE,
      layout: round,
      paint: { 'line-color': COLORS.hover, 'line-width': widthAt(2), 'line-opacity': 1 },
    },
    {
      // The one selection, in the accent.
      id: 'arcs-selected',
      type: 'line',
      source: ARC_SOURCE,
      filter: NONE,
      layout: round,
      paint: { 'line-color': COLORS.focus, 'line-width': widthAt(2.4), 'line-opacity': 1 },
    },
  ]
}

export function addArcLayers(map) {
  // lineMetrics lets the flights fade along their length.
  map.addSource(ARC_SOURCE, { type: 'geojson', data: emptyFc(), lineMetrics: true })
  for (const layer of arcLayers()) map.addLayer(layer, FIRST_LABEL_LAYER)
}

export const emptyFc = () => ({ type: 'FeatureCollection', features: [] })

// ---- focus: hover and selection ----

/**
 * A filter expression for "the routes this target is about", or null.
 * A target is { routeKeys: [...] } for routes or { code } for a place and everything leaving or reaching it.
 */
function matchOf(target) {
  if (target?.routeKeys?.length) return ['in', ['get', 'routeKey'], ['literal', target.routeKeys]]
  if (target?.code) return ['any', ['==', ['get', 'from'], target.code], ['==', ['get', 'to'], target.code]]
  return null
}

/**
 * Light up what is hovered and selected, and dim every other route.
 * Routes are drawn as lines; a place only dims the routes that do not touch it.
 */
export function setArcFocus(map, { selected, hover }) {
  const lineOf = (t) => (t?.routeKeys?.length ? matchOf(t) : null)
  const sel = lineOf(selected)
  const hov = lineOf(hover)
  map.setFilter('arcs-selected', sel ?? NONE)
  map.setFilter('arcs-hover', hov ?? NONE)
  map.setFilter('arcs-lit', sel && hov ? ['any', sel, hov] : (sel ?? hov ?? NONE))

  const keep = matchOf(hover) ?? matchOf(selected)
  for (const [id, base] of Object.entries(BASE_OPACITY)) {
    map.setPaintProperty(id, 'line-opacity', keep ? ['*', base, ['case', keep, 1, DIMMED]] : base)
  }
}

/**
 * Keeps arcs in sync with the data and the selected year, and draws newly
 * visible arcs in from origin to destination.
 */
export class ArcAnimator {
  constructor(map, { reduced = false } = {}) {
    this.map = map
    this.reduced = reduced
    this.arcs = []
    this.maxYear = Infinity
    this.drawn = new Map() // key -> { start, done }
    this.raf = 0
    this.tick = this.tick.bind(this)
  }

  update(arcs, maxYear) {
    this.arcs = arcs
    this.maxYear = maxYear
    const live = new Set(arcs.map((a) => a.key))
    for (const k of this.drawn.keys()) if (!live.has(k)) this.drawn.delete(k)
    this.start()
  }

  start() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  tick(now) {
    this.raf = 0
    const features = []
    let animating = false
    let order = 0
    for (const arc of this.arcs) {
      if (arc.year > this.maxYear) {
        // Not shown now: forget it so it draws in again when its year comes back.
        this.drawn.delete(arc.key)
        continue
      }
      let st = this.drawn.get(arc.key)
      if (!st) {
        st = { start: now + Math.min(order, 8) * 70, done: this.reduced }
        this.drawn.set(arc.key, st)
        order += 1
      }
      let p = 1
      if (!st.done) {
        p = Math.max(0, Math.min(1, (now - st.start) / ARC_DURATION_MS))
        if (p >= 1) st.done = true
        else animating = true
      }
      if (p > 0) {
        features.push({
          type: 'Feature',
          properties: arc.props,
          geometry: { type: 'LineString', coordinates: slice(arc.coords, ease(p)) },
        })
      }
    }
    const src = this.map.getSource(ARC_SOURCE)
    if (src) src.setData({ type: 'FeatureCollection', features })
    if (animating) this.raf = requestAnimationFrame(this.tick)
  }
}
