import { COLORS } from './style.js'
import { emptyFc } from './arcs.js'
import { haversine } from '../utils/geo.js'

// Two small motions that answer a click: a light that travels along the selected route,
// and a ring that spreads from a selected place. Both stay off under reduced motion.

const DOT_SOURCE = 'effect-dot'
const RING_SOURCE = 'effect-ring'
const CYCLE_MS = 5200 // there and back
const RING_MS = 1000
const FRAME_MS = 33

export function addEffectLayers(map) {
  map.addSource(RING_SOURCE, { type: 'geojson', data: emptyFc() })
  map.addSource(DOT_SOURCE, { type: 'geojson', data: emptyFc() })
  map.addLayer({
    id: 'effect-ring',
    type: 'circle',
    source: RING_SOURCE,
    paint: {
      'circle-radius': ['get', 'r'],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': COLORS.cityLabel,
      'circle-stroke-width': 1.5,
      'circle-stroke-opacity': ['get', 'o'],
    },
  })
  map.addLayer({
    id: 'effect-dot-halo',
    type: 'circle',
    source: DOT_SOURCE,
    paint: { 'circle-radius': 9, 'circle-color': COLORS.route, 'circle-blur': 1, 'circle-opacity': 0.55 },
  })
  map.addLayer({
    id: 'effect-dot',
    type: 'circle',
    source: DOT_SOURCE,
    paint: { 'circle-radius': 2.8, 'circle-color': '#ffffff' },
  })
}

/**
 * Join legs (each a list of [lon, lat], already in travel order) into one path with running distances.
 * Each leg is shifted by whole turns so it starts where the previous one ended, even across the antimeridian.
 */
export function chainPath(legs) {
  const pts = []
  for (const coords of legs) {
    if (!coords.length) continue
    const shift = pts.length ? Math.round((pts[pts.length - 1][0] - coords[0][0]) / 360) * 360 : 0
    for (const [lon, lat] of coords) pts.push([lon + shift, lat])
  }
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]))
  }
  return { pts, cum, total: cum[cum.length - 1] || 0 }
}

// The point a fraction `u` of the way along a path.
function pointAt({ pts, cum, total }, u) {
  const d = u * total
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  const span = cum[hi] - cum[lo] || 1
  const f = Math.min(1, Math.max(0, (d - cum[lo]) / span))
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f]
}

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180
const point = (coordinates, properties = {}) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties, geometry: { type: 'Point', coordinates } }] })

export class Effects {
  constructor(map) {
    this.map = map
    this.reduced = false
    this.path = null
    this.ring = null // { at: [lon, lat], start }
    this.t0 = 0
    this.lastDraw = 0
    this.raf = 0
    this.tick = this.tick.bind(this)
  }

  setReduced(reduced) {
    this.reduced = reduced
    if (reduced) {
      this.path = null
      this.ring = null
      this.clear()
    }
  }

  /** Travel along `path` (from chainPath), or stop when it is null. */
  showRoute(path) {
    this.path = this.reduced || !path || path.total <= 0 ? null : path
    this.t0 = performance.now()
    if (this.path) this.start()
    else this.map.getSource(DOT_SOURCE)?.setData(emptyFc())
  }

  ripple(lon, lat) {
    if (this.reduced) return
    this.ring = { at: [wrapLon(lon), lat], start: performance.now() }
    this.start()
  }

  clear() {
    this.map.getSource(DOT_SOURCE)?.setData(emptyFc())
    this.map.getSource(RING_SOURCE)?.setData(emptyFc())
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
    if (this.ring) {
      const t = (now - this.ring.start) / RING_MS
      if (t >= 1) {
        this.ring = null
        this.map.getSource(RING_SOURCE)?.setData(emptyFc())
      } else {
        const e = 1 - Math.pow(1 - t, 3)
        this.map.getSource(RING_SOURCE)?.setData(point(this.ring.at, { r: 6 + 30 * e, o: 0.9 * (1 - t) }))
      }
    }
    if (this.path && now - this.lastDraw >= FRAME_MS) {
      this.lastDraw = now
      const t = ((now - this.t0) % CYCLE_MS) / CYCLE_MS
      const tri = t < 0.5 ? t * 2 : 2 - t * 2
      const u = tri * tri * (3 - 2 * tri) // slow at the ends, quick between
      const [lon, lat] = pointAt(this.path, u)
      this.map.getSource(DOT_SOURCE)?.setData(point([wrapLon(lon), lat]))
    }
    if (this.path || this.ring) this.raf = requestAnimationFrame(this.tick)
  }
}
