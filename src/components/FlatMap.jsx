import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { greatCirclePoints, splitAntimeridian, pointsToPathD } from '../utils/geo.js'
import { normalizeCityName } from '../data/parseCsv.js'

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

function arcStrokeWidth(distKm, repeats) {
  return 0.45 + Math.min(distKm / 2800, 3.2) + Math.min(repeats - 1, 4) * 0.18
}

export default function FlatMap({ segments, citiesDb, maxYear }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const fogCanvasRef = useRef(null)
  const projRef = useRef(null)
  const zoomRef = useRef(null)

  const [size, setSize] = useState({ width: 800, height: 500 })
  const [transform, setTransform] = useState(d3.zoomIdentity)
  const [worldData, setWorldData] = useState(null)
  const [hoveredCity, setHoveredCity] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Load world TopoJSON once
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const countries = topojson.feature(topo, topo.objects.countries)
        const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b)
        setWorldData({ countries, borders })
      })
      .catch(console.error)
  }, [])

  // Track container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Update projection when size changes
  useEffect(() => {
    const { width, height } = size
    projRef.current = d3.geoNaturalEarth1()
      .scale(width / 6.3)
      .translate([width / 2, height / 2])
  }, [size])

  // Set up zoom behavior (once)
  useEffect(() => {
    if (!svgRef.current) return
    zoomRef.current = d3.zoom()
      .scaleExtent([1, 10])
      .on('zoom', (event) => setTransform(event.transform))

    d3.select(svgRef.current).call(zoomRef.current)
  }, [])

  // Draw fog canvas whenever segments/size/transform changes
  useEffect(() => {
    const canvas = fogCanvasRef.current
    const proj = projRef.current
    if (!canvas || !proj) return

    const { width, height } = size
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    // Determine visited destination cities from filtered segments
    const visitedKeys = new Set()
    for (const seg of segments) {
      if (seg.year <= maxYear) {
        visitedKeys.add(normalizeCityName(seg.destName))
        visitedKeys.add(normalizeCityName(seg.originName))
      }
    }

    // Fill with fog
    ctx.fillStyle = 'rgba(26, 26, 46, 0.88)'
    ctx.fillRect(0, 0, width, height)

    // Punch holes for visited cities
    ctx.globalCompositeOperation = 'destination-out'
    for (const key of visitedKeys) {
      const city = citiesDb[key]
      if (!city) continue

      const projected = proj([city.lon, city.lat])
      if (!projected) continue
      const [px, py] = projected
      const [sx, sy] = transform.apply([px, py])

      const radius = 55 * Math.sqrt(transform.k)
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius)
      grad.addColorStop(0, 'rgba(0,0,0,0.97)')
      grad.addColorStop(0.25, 'rgba(0,0,0,0.85)')
      grad.addColorStop(0.6, 'rgba(0,0,0,0.4)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }, [segments, citiesDb, maxYear, size, transform])

  // Compute arc paths for visible segments
  const visibleSegments = segments.filter((s) => s.year <= maxYear)

  const arcPaths = visibleSegments.map((seg) => {
    const proj = projRef.current
    if (!proj) return null

    const pts = greatCirclePoints(
      seg.originCoords.lat, seg.originCoords.lon,
      seg.destCoords.lat, seg.destCoords.lon,
      80
    )
    const subPaths = splitAntimeridian(pts)
    const lw = arcStrokeWidth(seg.distKm, seg.repeats)

    const ds = subPaths.map((sub) => {
      const projected = sub.map(([lat, lon]) => {
        const p = proj([lon, lat])
        if (!p) return null
        return transform.apply(p)
      }).filter(Boolean)
      return pointsToPathD(projected)
    }).filter(Boolean)

    return { ds, lw, seg }
  }).filter(Boolean)

  // Compute city positions
  const cityEntries = Object.entries(citiesDb)
  const cityCircles = cityEntries.map(([key, city]) => {
    const proj = projRef.current
    if (!proj) return null

    const projected = proj([city.lon, city.lat])
    if (!projected) return null
    const [sx, sy] = transform.apply(projected)

    // Count visits
    const visitCount = segments.filter(
      (s) => s.year <= maxYear && (
        normalizeCityName(s.destName) === key ||
        normalizeCityName(s.originName) === key
      )
    ).length

    if (visitCount === 0) return null

    const isHub = city.isHub
    return { key, city, sx, sy, visitCount, isHub }
  }).filter(Boolean)

  const handleCityMouseEnter = useCallback((e, entry) => {
    setHoveredCity(entry)
    setTooltipPos({ x: entry.sx + 12, y: entry.sy - 8 })
  }, [])

  const handleCityMouseLeave = useCallback(() => {
    setHoveredCity(null)
  }, [])

  const { width, height } = size

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* SVG: land + arcs + city dots */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ cursor: 'grab' }}
      >
        {/* Sphere background */}
        <path
          d={projRef.current ? d3.geoPath().projection(projRef.current)({ type: 'Sphere' }) : ''}
          fill="#0f172a"
        />

        {/* Land polygons */}
        {worldData && projRef.current && (() => {
          const pathGen = d3.geoPath().projection(projRef.current)
          return (
            <g transform={transform.toString()}>
              {worldData.countries.features.map((f, i) => (
                <path key={i} d={pathGen(f)} fill="#1e293b" stroke="#0a0a1a" strokeWidth={0.5} />
              ))}
              <path d={pathGen(worldData.borders)} fill="none" stroke="#334155" strokeWidth={0.3} />
            </g>
          )
        })()}

        {/* Flight arcs — rendered before fog canvas */}
        <g>
          {arcPaths.map(({ ds, lw, seg }, i) =>
            ds.map((d, j) => (
              <g key={`${i}-${j}`}>
                {/* Glow halo */}
                <path
                  d={d}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={lw * 3.5}
                  strokeOpacity={0.06}
                  strokeLinecap="round"
                />
                {/* Main arc */}
                <path
                  d={d}
                  fill="none"
                  stroke={seg.isTransfer ? '#818cf8' : '#06b6d4'}
                  strokeWidth={lw}
                  strokeOpacity={0.65}
                  strokeLinecap="round"
                />
              </g>
            ))
          )}
        </g>
      </svg>

      {/* Fog canvas — sits on top of arcs, below city dots */}
      <canvas
        ref={fogCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />

      {/* City dots SVG — on top of fog */}
      <svg
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        {cityCircles.map((entry) => {
          const { key, sx, sy, isHub, visitCount } = entry
          const r = Math.min(2.5 + Math.log(visitCount + 1) * 1.2, 7)

          return (
            <g key={key} style={{ pointerEvents: 'all', cursor: 'pointer' }}>
              {/* Outer glow */}
              <circle
                cx={sx} cy={sy}
                r={r + 4}
                fill={isHub ? '#818cf8' : '#f59e0b'}
                opacity={0.15}
              />
              {isHub ? (
                // Hub: hollow ring
                <circle
                  cx={sx} cy={sy} r={r}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth={1.5}
                  onMouseEnter={(e) => { e.stopPropagation(); handleCityMouseEnter(e, entry) }}
                  onMouseLeave={handleCityMouseLeave}
                />
              ) : (
                // Destination: filled amber dot
                <circle
                  cx={sx} cy={sy} r={r}
                  fill="#f59e0b"
                  opacity={0.9}
                  onMouseEnter={(e) => { e.stopPropagation(); handleCityMouseEnter(e, entry) }}
                  onMouseLeave={handleCityMouseLeave}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredCity && (
        <div
          className="absolute z-10 pointer-events-none px-3 py-2 rounded text-sm shadow-lg border"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            maxWidth: 200,
          }}
        >
          <div className="font-semibold capitalize">{hoveredCity.city.name || hoveredCity.key}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>{hoveredCity.city.country}</div>
          <div className="text-xs mt-1" style={{ color: '#f59e0b' }}>
            {hoveredCity.visitCount} flight{hoveredCity.visitCount !== 1 ? 's' : ''}
            {hoveredCity.isHub ? ' (hub)' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
