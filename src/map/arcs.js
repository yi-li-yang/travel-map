import { greatCirclePoints } from '../utils/geo.js'
import { COLORS, FIRST_LABEL_LAYER } from './style.js'

export const ARC_SOURCE = 'arcs'
const ARC_DURATION_MS = 800

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

export function buildArcs(segments) {
  const keys = legKeys(segments)
  return segments.map((seg, i) => ({
    key: keys[i],
    year: seg.year,
    coords: arcCoordinates(seg),
    props: {
      key: keys[i],
      year: seg.year,
      repeats: seg.repeats,
      transfer: seg.isTransfer ? 1 : 0,
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

export function arcLayers() {
  const repeats = ['min', ['get', 'repeats'], 6]
  const widthAt = (base) => ['interpolate', ['linear'], ['zoom'], 0, ['*', base, 0.8], 6, ['*', base, 1.6]]
  const coreColor = ['case', ['==', ['get', 'transfer'], 1], COLORS.routeTransfer, COLORS.route]
  return [
    {
      id: 'arcs-glow',
      type: 'line',
      source: ARC_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.routeGlow,
        'line-width': widthAt(['+', 4, ['*', 0.9, repeats]]),
        'line-blur': 4,
        'line-opacity': ['case', ['==', ['get', 'transfer'], 1], 0.12, 0.26],
      },
    },
    {
      id: 'arcs-core',
      type: 'line',
      source: ARC_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': coreColor,
        'line-width': widthAt(['+', 0.9, ['*', 0.28, repeats]]),
        'line-opacity': ['case', ['==', ['get', 'transfer'], 1], 0.6, 0.95],
      },
    },
    {
      id: 'arcs-hit',
      type: 'line',
      source: ARC_SOURCE,
      paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 14 },
    },
    {
      id: 'arcs-selected',
      type: 'line',
      source: ARC_SOURCE,
      filter: ['==', ['get', 'routeKey'], ''],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': widthAt(2.4), 'line-opacity': 0.95 },
    },
  ]
}

export function addArcLayers(map) {
  map.addSource(ARC_SOURCE, { type: 'geojson', data: emptyFc() })
  for (const layer of arcLayers()) map.addLayer(layer, FIRST_LABEL_LAYER)
}

export const emptyFc = () => ({ type: 'FeatureCollection', features: [] })

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
