import { Figures } from './overview/Figures.jsx'
import { Passport } from './overview/Passport.jsx'
import { RankBars } from './overview/RankBars.jsx'
import { YearFocus } from './overview/YearFocus.jsx'
import { Row, Section } from './overview/parts.jsx'
import { formatKm } from '../utils/stats.js'
import { GROUND, shortLabel } from '../data/route.js'

function Legend() {
  return (
    <Section title="Legend">
      <ul className="space-y-2 text-[12.5px] text-dim">
        <li className="flex items-center gap-3">
          <span className="h-[2px] w-8 rounded bg-route shadow-glow" /> Flight. Thicker means travelled more often.
        </li>
        <li className="flex items-center gap-3">
          <span className="h-[2px] w-8 rounded bg-[#6f8fb8]" /> Leg of a connecting flight
        </li>
        <li className="flex items-center gap-3">
          <span className="w-8 border-t-2 border-dashed border-ground" /> Overland: train, road or boat
        </li>
        <li className="flex items-center gap-3">
          <span className="ml-[11px] mr-[11px] h-2.5 w-2.5 rounded-full bg-city shadow-[0_0_10px_2px_rgba(255,180,84,0.5)]" /> Place you visited
        </li>
        <li className="flex items-center gap-3">
          <span className="ml-[13px] mr-[13px] h-1.5 w-1.5 rounded-full bg-hub" /> Connection only
        </li>
      </ul>
    </Section>
  )
}

export function Overview({ stats, year, scope, onScope, reduced, citiesDb, onFlyCountry, onSelectCity, onSelectRoute, onYear, onPreview }) {
  const r = stats.records
  const place = (code) => citiesDb[code]?.city || code
  const label = (code) => shortLabel(code, citiesDb)
  const route = (s) => `${label(s.originName)} ${s.mode === GROUND ? '⇢' : '–'} ${label(s.destName)}`

  const scopeBtn = (id, text) => (
    <button
      key={id}
      onClick={() => onScope(id)}
      aria-pressed={scope === id}
      className={`h-8 flex-1 rounded-md text-[12.5px] font-medium transition-colors ${
        scope === id ? 'bg-white/[0.13] text-fg' : 'text-dim hover:text-fg'
      }`}
    >
      {text}
    </button>
  )

  const routeRow = (title, seg) =>
    seg && (
      <Row label={title} onClick={() => onSelectRoute([seg.routeKey])} onPreview={onPreview} preview={{ routeKeys: [seg.routeKey] }}>
        {route(seg)} <span className="text-dim">{formatKm(seg.distKm)} km</span>
      </Row>
    )

  const routeItems = stats.topRoutes.map(({ n, seg }) => ({
    key: seg.routeKey,
    label: route(seg),
    n,
    onClick: () => onSelectRoute([seg.routeKey]),
    preview: { routeKeys: [seg.routeKey] },
  }))
  const placeItems = stats.topPlaces.map((p) => ({
    key: p.code,
    label: p.city,
    n: p.n,
    onClick: () => onSelectCity(p.code),
    preview: { code: p.code },
  }))

  return (
    <div>
      <div className="px-5 pb-4">
        <div role="group" aria-label="Scope of the numbers" className="flex gap-1 rounded-lg bg-white/[0.05] p-1">
          {scopeBtn('upto', `Up to ${year}`)}
          {scopeBtn('only', `Only ${year}`)}
        </div>
      </div>

      <Figures stats={stats} reduced={reduced} />
      <Passport stats={stats} onFlyCountry={onFlyCountry} />
      <YearFocus focus={stats.focus} year={year} label={label} />

      {stats.home && (
        <Section title="Home base">
          <Row label="Most departures" onClick={() => onSelectCity(stats.home.code)} onPreview={onPreview} preview={{ code: stats.home.code }}>
            {place(stats.home.code)} {label(stats.home.code) === stats.home.code && <span className="text-dim">{stats.home.code}</span>}
          </Row>
          {stats.farthest && stats.farthest.km > 0 && (
            <Row label="Farthest from home" onClick={() => onSelectCity(stats.farthest.code)} onPreview={onPreview} preview={{ code: stats.farthest.code }}>
              {stats.farthest.city} <span className="text-dim">{formatKm(stats.farthest.km)} km</span>
            </Row>
          )}
        </Section>
      )}

      <RankBars title="Most travelled routes" items={routeItems} onPreview={onPreview} />
      <RankBars title="Most visited places" items={placeItems} onPreview={onPreview} />

      {(r.longest || r.longestGround || r.busiest) && (
        <Section title="Records">
          {routeRow('Longest flight', r.longest)}
          {r.shortest && r.shortest.routeKey !== r.longest?.routeKey && routeRow('Shortest flight', r.shortest)}
          {routeRow('Longest overland leg', r.longestGround)}
          {r.busiest && (
            <Row label="Busiest year" onClick={() => onYear(r.busiest.year)}>
              {r.busiest.year} <span className="text-dim">{r.busiest.n} trips</span>
            </Row>
          )}
        </Section>
      )}

      <Legend />
    </div>
  )
}
