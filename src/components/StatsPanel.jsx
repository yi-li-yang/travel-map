import { useMemo } from 'react'
import { normalizeCityName } from '../data/parseCsv.js'

function StatRow({ label, value, sub }) {
  return (
    <div className="flex flex-col py-2 border-b" style={{ borderColor: '#1e293b' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#475569' }}>{label}</span>
      <span className="text-sm font-semibold mt-0.5" style={{ color: '#e2e8f0' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#64748b' }}>{sub}</span>}
    </div>
  )
}

export default function StatsPanel({ segments, citiesDb }) {
  const stats = useMemo(() => {
    if (!segments.length) return null

    // Hub cities are excluded from country/city counts
    const hubKeys = new Set(
      Object.entries(citiesDb)
        .filter(([, c]) => c.isHub)
        .map(([k]) => k)
    )

    const nonHubSegments = segments.filter(
      (s) => !hubKeys.has(normalizeCityName(s.destName))
    )

    // Total distance (all segments)
    const totalKm = Math.round(segments.reduce((sum, s) => sum + s.distKm, 0))

    // Unique destination countries
    const countries = new Set(
      nonHubSegments.map((s) => {
        const key = normalizeCityName(s.destName)
        return citiesDb[key]?.country
      }).filter(Boolean)
    )

    // Unique destination cities (non-hub)
    const cities = new Set(
      nonHubSegments.map((s) => normalizeCityName(s.destName))
    )

    // Busiest year
    const yearCount = {}
    for (const s of segments) {
      yearCount[s.year] = (yearCount[s.year] || 0) + 1
    }
    const busiestYear = Object.entries(yearCount).sort((a, b) => b[1] - a[1])[0]

    // Longest route
    const longest = segments.reduce((best, s) => s.distKm > best.distKm ? s : best, segments[0])

    // Most visited city (by appearance as origin or non-hub dest)
    const cityVisits = {}
    for (const s of segments) {
      const ok = normalizeCityName(s.originName)
      const dk = normalizeCityName(s.destName)
      if (!hubKeys.has(ok)) cityVisits[ok] = (cityVisits[ok] || 0) + 1
      if (!hubKeys.has(dk)) cityVisits[dk] = (cityVisits[dk] || 0) + 1
    }
    const mostVisited = Object.entries(cityVisits).sort((a, b) => b[1] - a[1])[0]

    // Approximate hours in air (avg speed 850 km/h)
    const hoursInAir = Math.round(totalKm / 850)

    return {
      totalFlights: segments.length,
      totalKm,
      hoursInAir,
      countries: countries.size,
      cities: cities.size,
      busiestYear: busiestYear ? `${busiestYear[0]} (${busiestYear[1]} flights)` : '—',
      longestRoute: longest ? `${longest.originName} → ${longest.destName}` : '—',
      longestKm: longest ? Math.round(longest.distKm).toLocaleString() : '—',
      mostVisited: mostVisited ? mostVisited[0] : '—',
      mostVisitedCount: mostVisited ? mostVisited[1] : 0,
    }
  }, [segments, citiesDb])

  if (!stats) {
    return (
      <div className="p-4 text-sm" style={{ color: '#475569' }}>Loading stats…</div>
    )
  }

  return (
    <div className="p-4 overflow-y-auto">
      <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: '#f59e0b' }}>
        Flight Stats
      </h2>

      <div className="grid grid-cols-2 gap-x-4">
        <StatRow label="Flights" value={stats.totalFlights} />
        <StatRow label="Countries" value={stats.countries} />
        <StatRow label="Cities" value={stats.cities} />
        <StatRow label="Hours in air" value={`~${stats.hoursInAir}h`} />
      </div>

      <StatRow
        label="Total distance"
        value={`${stats.totalKm.toLocaleString()} km`}
        sub={`≈ ${(stats.totalKm / 40075).toFixed(1)}× around Earth`}
      />
      <StatRow
        label="Busiest year"
        value={stats.busiestYear}
      />
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
