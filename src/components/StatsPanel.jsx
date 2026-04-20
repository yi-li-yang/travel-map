import { useMemo } from 'react'
import { normalizeCode } from '../data/parseCsv.js'

const CARD_SHADOW = 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px, rgba(0,0,0,0.01) 0px 0.175px 1.04px'

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        boxShadow: CARD_SHADOW,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(0,0,0,0.95)', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#a39e98', marginTop: 4, letterSpacing: '0.125px' }}>
        {label}
      </div>
    </div>
  )
}

function StatRow({ label, value, sub }) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#a39e98', letterSpacing: '0.125px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.95)', marginTop: 2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#615d59', marginTop: 1 }}>{sub}</div>
      )}
    </div>
  )
}

export default function StatsPanel({ segments, citiesDb }) {
  const stats = useMemo(() => {
    if (!segments.length) return null

    const hubKeys = new Set(
      Object.entries(citiesDb)
        .filter(([, c]) => c.isHub)
        .map(([k]) => k)
    )

    const nonHubSegments = segments.filter(
      (s) => !hubKeys.has(normalizeCode(s.destName))
    )

    const totalKm = Math.round(segments.reduce((sum, s) => sum + s.distKm, 0))

    const countries = new Set(
      nonHubSegments.map((s) => {
        const key = normalizeCode(s.destName)
        return citiesDb[key]?.country
      }).filter(Boolean)
    )

    const cities = new Set(
      nonHubSegments.map((s) => normalizeCode(s.destName))
    )

    const yearCount = {}
    for (const s of segments) {
      yearCount[s.year] = (yearCount[s.year] || 0) + 1
    }
    const busiestYear = Object.entries(yearCount).sort((a, b) => b[1] - a[1])[0]

    const longest = segments.reduce((best, s) => s.distKm > best.distKm ? s : best, segments[0])

    const cityVisits = {}
    for (const s of segments) {
      const ok = normalizeCode(s.originName)
      const dk = normalizeCode(s.destName)
      if (!hubKeys.has(ok)) cityVisits[ok] = (cityVisits[ok] || 0) + 1
      if (!hubKeys.has(dk)) cityVisits[dk] = (cityVisits[dk] || 0) + 1
    }
    const mostVisited = Object.entries(cityVisits).sort((a, b) => b[1] - a[1])[0]

    const hoursInAir = Math.round(totalKm / 850)

    // Use human city names for display
    const longestRouteDisplay = longest
      ? `${longest.originCity} → ${longest.destCity}`
      : '—'

    const mostVisitedDisplay = mostVisited
      ? (citiesDb[mostVisited[0]]?.city || mostVisited[0])
      : '—'

    return {
      totalFlights: segments.length,
      totalKm,
      hoursInAir,
      countries: countries.size,
      cities: cities.size,
      busiestYear: busiestYear ? `${busiestYear[0]} (${busiestYear[1]})` : '—',
      longestRoute: longestRouteDisplay,
      longestKm: longest ? Math.round(longest.distKm).toLocaleString() : '—',
      mostVisited: mostVisitedDisplay,
      mostVisitedCount: mostVisited ? mostVisited[1] : 0,
    }
  }, [segments, citiesDb])

  if (!stats) {
    return (
      <div className="p-4" style={{ fontSize: 14, color: '#a39e98' }}>Loading stats…</div>
    )
  }

  return (
    <div className="p-4" style={{ background: '#ffffff' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.125px',
          color: '#a39e98',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Flight Stats
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard label="Flights" value={stats.totalFlights} />
        <MetricCard label="Countries" value={stats.countries} />
        <MetricCard label="Cities" value={stats.cities} />
        <MetricCard label="Hours in air" value={`~${stats.hoursInAir}h`} />
      </div>

      <StatRow
        label="Total distance"
        value={`${stats.totalKm.toLocaleString()} km`}
        sub={`≈ ${(stats.totalKm / 40075).toFixed(1)}× around Earth`}
      />
      <StatRow label="Busiest year" value={stats.busiestYear} />
      <StatRow
        label="Longest flight"
        value={stats.longestRoute}
        sub={`${stats.longestKm} km`}
      />
      <StatRow
        label="Most visited"
        value={stats.mostVisited}
        sub={`${stats.mostVisitedCount} times`}
      />
    </div>
  )
}
