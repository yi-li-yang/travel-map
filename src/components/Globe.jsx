import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildStyle, applyBasemap } from '../map/style.js'
import { addArcLayers, ArcAnimator, buildArcs, forwardCoords, setArcFocus } from '../map/arcs.js'
import { addCityLayers, buildCityFeatures, setCityFocus, setFirstVisitYear, CITY_SOURCE } from '../map/cities.js'
import { addEffectLayers, chainPath, Effects } from '../map/effects.js'

// MapLibre 6 loads its worker from a separate file, copied to public/ by scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl(new URL(`${import.meta.env.BASE_URL}vendor/maplibre/maplibre-gl-worker.mjs`, window.location.href).href)

// Zoom at which the globe fills ~86% of the free space (the viewport minus panels).
// At zoom z the globe's radius is about 81.5 * 2^z CSS pixels.
function fitZoom(el, pad) {
  const w = el.clientWidth - (pad?.left || 0) - (pad?.right || 0)
  const h = el.clientHeight - (pad?.top || 0) - (pad?.bottom || 0)
  const diameter = 0.86 * Math.min(w, h)
  return Math.max(0.6, Math.log2(Math.max(diameter, 200) / 163))
}

const DEFAULT_CENTER = [10, 25]
const SPIN_DEG_PER_SEC = 4
const SPIN_IDLE_MS = 3500
const TOUCH_REACH = 14 // px around a finger that still counts as touching a route

// Where the globe starts and returns to: over the home place, tilted so it is not hidden at the pole.
const homeCenter = (home) => (home ? [home.lon, Math.min(Math.max(home.lat, 10), 40)] : DEFAULT_CENTER)

// What the map layers should focus on, for a selection or a hover target.
const targetOf = (sel) => {
  if (!sel) return null
  return sel.type === 'city' ? { code: sel.code } : { routeKeys: sel.routeKeys }
}

/**
 * Full-bleed interactive globe. Draws the base map, route arcs and city markers,
 * and reports hover/click back to the app. All camera moves happen here.
 * `highlight` is a { routeKeys } or { code } preview coming from outside the map (a list row, say).
 * `home` is { code, lon, lat }: when it changes (another person's trips) the camera flies there.
 */
export const Globe = forwardRef(function Globe(
  { segments, citiesDb, maxYear, selected, highlight, onSelect, onHover, onStatus, basemap, padding, reducedMotion, autoRotate, home },
  ref,
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const animatorRef = useRef(null)
  const effectsRef = useRef(null)
  const homeViewRef = useRef({ center: DEFAULT_CENTER, zoom: 1.6 })
  const homeKeyRef = useRef('')
  const refitRef = useRef(null)
  const rippleToken = useRef(0)
  const spinRef = useRef({ lastInteraction: 0, hovering: false })
  const [ready, setReady] = useState(false)

  // Always call the newest callbacks/props from long-lived map listeners.
  const live = useRef({})
  live.current = { onSelect, onHover, onStatus, selected, highlight, reducedMotion, autoRotate, padding, segments, home }

  // Keep the globe sized to the free space, unless the person has zoomed on their own.
  const refit = () => {
    const map = mapRef.current
    const el = containerRef.current
    if (!map || !el) return
    const homeView = homeViewRef.current
    const next = fitZoom(el, live.current.padding)
    if (Math.abs(map.getZoom() - homeView.zoom) < 0.2 && !live.current.selected) {
      map.easeTo({ zoom: next, duration: live.current.reducedMotion ? 0 : 400 })
    }
    homeViewRef.current = { ...homeView, zoom: next }
    map.setMinZoom(Math.max(0.3, next - 1.2))
  }

  refitRef.current = refit
  const arcs = useMemo(() => buildArcs(segments), [segments])

  useImperativeHandle(ref, () => ({
    resetView() {
      const map = mapRef.current
      if (!map) return
      const { center, zoom } = homeViewRef.current
      map.flyTo({ center, zoom, duration: live.current.reducedMotion ? 0 : 1400, essential: true })
    },
    zoomBy(delta) {
      mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: live.current.reducedMotion ? 0 : 300 })
    },
    flyTo({ lon, lat, zoom = 4 }) {
      const map = mapRef.current
      if (!map) return
      map.flyTo({ center: [lon, lat], zoom, duration: live.current.reducedMotion ? 0 : 1600, essential: true })
    },
  }))

  // ---- create the map once ----
  useEffect(() => {
    const el = containerRef.current
    const zoom = fitZoom(el, live.current.padding)
    const center = homeCenter(live.current.home)
    homeKeyRef.current = live.current.home?.code || ''
    homeViewRef.current = { center, zoom }

    let map
    try {
      map = new maplibregl.Map({
        container: el,
        style: buildStyle(),
        center,
        zoom,
        minZoom: Math.max(0.3, zoom - 1.2),
        maxZoom: 14,
        maxPitch: 0,
        dragRotate: false,
        attributionControl: false,
        fadeDuration: 200,
        canvasContextAttributes: { antialias: true },
        padding: live.current.padding,
      })
    } catch {
      live.current.onStatus?.('webgl-error')
      return undefined
    }
    mapRef.current = map
    if (import.meta.env.DEV) {
      window.__map = map
      window.__errs = []
      map.on('error', (e) => window.__errs.push(e?.error?.message || String(e)))
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    const animator = new ArcAnimator(map, { reduced: live.current.reducedMotion })
    animatorRef.current = animator

    map.on('resize', () => {
      if (mapRef.current) refitRef.current?.()
    })

    map.on('load', () => {
      addArcLayers(map)
      addCityLayers(map)
      addEffectLayers(map)
      effectsRef.current = new Effects(map)
      setReady(true)
      // Style and first tiles are in: the app can lift its loading cover.
      live.current.onStatus?.('ready')
    })

    // Tile failures are common offline; tell the app once.
    let reported = false
    map.on('error', (e) => {
      if (reported) return
      if (e?.sourceId === 'openmaptiles' || /Failed to fetch|NetworkError|Load failed/i.test(e?.error?.message || '')) {
        reported = true
        live.current.onStatus?.('tiles-error')
      }
    })

    // ---- picking ----
    // A finger is wide, so on touch screens look in a box around the tap and take the nearest place.
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const pick = (point) => {
      const area = coarse ? [[point.x - TOUCH_REACH, point.y - TOUCH_REACH], [point.x + TOUCH_REACH, point.y + TOUCH_REACH]] : point
      const hits = map.queryRenderedFeatures(area, { layers: ['cities-hit', 'arcs-hit'] })
      const cities = hits.filter((f) => f.layer.id === 'cities-hit')
      if (cities.length) {
        const dist = (f) => {
          const p = map.project(f.geometry.coordinates)
          return Math.hypot(p.x - point.x, p.y - point.y)
        }
        const nearest = cities.reduce((a, b) => (dist(b) < dist(a) ? b : a))
        return { kind: 'city', ...nearest.properties }
      }
      const arc = hits.find((f) => f.layer.id === 'arcs-hit')
      return arc ? { kind: 'route', ...arc.properties } : null
    }

    map.on('mousemove', (e) => {
      // While dragging the globe there is nothing to hover.
      const hit = e.originalEvent.buttons ? null : pick(e.point)
      map.getCanvas().style.cursor = hit ? 'pointer' : ''
      spinRef.current.hovering = Boolean(hit)
      live.current.onHover?.(hit ? { ...hit, x: e.point.x, y: e.point.y } : null)
    })
    map.on('mouseout', () => {
      spinRef.current.hovering = false
      live.current.onHover?.(null)
    })
    map.on('click', (e) => {
      const hit = pick(e.point)
      if (!hit) live.current.onSelect?.(null)
      else if (hit.kind === 'city') live.current.onSelect?.({ type: 'city', code: hit.code })
      else live.current.onSelect?.({ type: 'route', routeKeys: [hit.routeKey] })
    })

    // Anything the person does pauses the idle spin for a while.
    const touch = () => {
      spinRef.current.lastInteraction = performance.now()
    }
    for (const evt of ['mousedown', 'touchstart', 'wheel']) map.on(evt, touch)
    // Camera moves we start ourselves (fly-to, padding changes) also hold the spin back.
    map.on('movestart', () => {
      if (spinRef.current.spinning) return
      touch()
      // The pointer is no longer over what it was when the globe starts to move.
      spinRef.current.hovering = false
      live.current.onHover?.(null)
    })
    map.on('moveend', () => {
      if (!spinRef.current.spinning) touch()
    })

    // ---- idle spin ----
    let raf = 0
    let last = performance.now()
    const spin = (now) => {
      raf = requestAnimationFrame(spin)
      const dt = Math.min(now - last, 100)
      last = now
      const s = spinRef.current
      const l = live.current
      if (
        l.reducedMotion || !l.autoRotate || l.selected || l.highlight || s.hovering || document.hidden ||
        now - s.lastInteraction < SPIN_IDLE_MS ||
        map.getZoom() > homeViewRef.current.zoom + 1.2 ||
        map.isMoving()
      ) return
      const c = map.getCenter()
      s.spinning = true
      map.jumpTo({ center: [c.lng - (SPIN_DEG_PER_SEC * dt) / 1000, c.lat] })
      s.spinning = false
    }
    spinRef.current.lastInteraction = performance.now() + 2500
    raf = requestAnimationFrame(spin)

    return () => {
      cancelAnimationFrame(raf)
      animator.stop()
      animatorRef.current = null
      effectsRef.current?.stop()
      effectsRef.current = null
      mapRef.current = null
      map.remove()
      setReady(false)
    }
    // The map is created exactly once; later changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- data: arcs + cities follow segments and the selected year ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    animatorRef.current.reduced = Boolean(reducedMotion)
    animatorRef.current.update(arcs, maxYear)
    map.getSource(CITY_SOURCE)?.setData({
      type: 'FeatureCollection',
      features: buildCityFeatures(segments, citiesDb, maxYear),
    })
    setFirstVisitYear(map, maxYear)
  }, [ready, arcs, segments, citiesDb, maxYear, reducedMotion])

  // ---- another person's trips: the globe returns to their home ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const key = home?.code || ''
    if (homeKeyRef.current === key) return
    homeKeyRef.current = key
    const center = homeCenter(home)
    homeViewRef.current = { ...homeViewRef.current, center }
    map.flyTo({ center, zoom: homeViewRef.current.zoom, duration: reducedMotion ? 0 : 1600, essential: true })
  }, [ready, home, reducedMotion])

  // ---- base map toggle ----
  useEffect(() => {
    const map = mapRef.current
    if (ready && map) applyBasemap(map, basemap)
  }, [ready, basemap])

  // ---- keep the globe centred in the free space beside the drawer ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const homeView = homeViewRef.current
    const next = fitZoom(containerRef.current, padding)
    const follow = Math.abs(map.getZoom() - homeView.zoom) < 0.2 && !live.current.selected
    homeViewRef.current = { ...homeView, zoom: next }
    map.setMinZoom(Math.max(0.3, next - 1.2))
    map.easeTo({ padding, ...(follow ? { zoom: next } : {}), duration: reducedMotion ? 0 : 450 })
  }, [ready, padding, reducedMotion])

  // ---- focus: light up what is selected or hovered, dim the rest ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const hover = highlight || null
    setArcFocus(map, { selected: targetOf(selected), hover })
    setCityFocus(map, { selectedCode: selected?.type === 'city' ? selected.code : null, hoverCode: hover?.code || null })
  }, [ready, selected, highlight])

  // ---- a light travels along the selected route ----
  useEffect(() => {
    const fx = effectsRef.current
    if (!ready || !fx) return
    fx.setReduced(Boolean(reducedMotion))
    let path = null
    if (selected?.type === 'route') {
      const legs = selected.tripId
        ? arcs.filter((a) => a.trip === selected.tripId)
        : [arcs.find((a) => a.props.routeKey === selected.routeKeys[0])].filter(Boolean)
      const shown = legs.filter((a) => a.year <= maxYear)
      if (shown.length) path = chainPath(shown.map(forwardCoords))
    }
    fx.showRoute(path)
  }, [ready, selected, arcs, maxYear, reducedMotion])

  // ---- selection: camera ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const duration = reducedMotion ? 0 : 1300
    const keys = selected?.type === 'route' ? selected.routeKeys : []
    rippleToken.current += 1

    if (selected?.type === 'city') {
      const ap = citiesDb[selected.code]
      if (ap) {
        map.flyTo({ center: [ap.lon, ap.lat], zoom: Math.max(map.getZoom(), 4.4), duration, essential: true })
        const token = rippleToken.current
        // Ring the place once the camera has arrived.
        map.once('moveend', () => {
          if (token === rippleToken.current) effectsRef.current?.ripple(ap.lon, ap.lat)
        })
      }
    } else if (selected?.type === 'route') {
      const legs = arcs.filter((a) => keys.includes(a.props.routeKey))
      if (!legs.length) return
      const b = new maplibregl.LngLatBounds()
      for (const leg of legs) for (const c of leg.coords) b.extend(c)
      const pad = { top: 110, bottom: 190, left: 70, right: 70 + (padding?.right || 0) }
      map.fitBounds(b, { padding: pad, maxZoom: 5.2, duration, essential: true })
    }
    // Camera moves only when the selection itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected])

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Interactive globe of your trips. Drag to rotate, scroll to zoom."
      />
    </div>
  )
})
