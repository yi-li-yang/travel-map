import { Figures } from './overview/Figures.jsx'
import { Passport } from './overview/Passport.jsx'
import { RankBars } from './overview/RankBars.jsx'
import { YearFocus } from './overview/YearFocus.jsx'
import { Row, Section } from './overview/parts.jsx'
import { formatKm } from '../utils/stats.js'
import { GROUND, shortLabel } from '../data/route.js'

// Each mark on the globe, drawn as the globe draws it.
function Legend() {
  const item = 'flex items-center gap-3'
  const key = 'flex w-8 shrink-0 items-center justify-center'
  return (
    <Section title="Legend">
      <ul className="space-y-2 text-[14px] text-muted">
        <li className={item}>
          <span className={key}>
            <span className="h-[2px] w-8" style={{ backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--data-sky) 30%, transparent), var(--data-sky))' }} />
          </span>
          Flight, fading in from where it left. Thicker means travelled more often.
        </li>
        <li className={item}>
          <span className={key}>
            <span className="h-[2px] w-8 bg-flight opacity-50" />
          </span>
          Leg of a connecting flight
        </li>
        <li className={item}>
          <span className={key}>
            <span className="w-8 border-t-2 border-dashed border-overland" />
          </span>
          Overland: train, road or boat
        </li>
        <li className={item}>
          <span className={key}>
            <span className="h-2.5 w-2.5 rounded-dot bg-place" />
          </span>
          Place you visited
        </li>
        <li className={item}>
          <span className={key}>
            <span className="h-1.5 w-1.5 rounded-dot bg-muted" />
          </span>
          Connection only
        </li>
        <li className={item}>
          <span className={key}>
            <span className="h-[2px] w-8 bg-signal" />
          </span>
          What you selected
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
      className={`h-8 flex-1 text-[14px] font-medium transition-colors duration-fast ease-out ${
        scope === id ? 'bg-ground text-ink ring-1 ring-inset ring-edge' : 'text-muted hover:text-ink'
      }`}
    >
      {text}
    </button>
  )

  const routeRow = (title, seg) =>
    seg && (
      <Row label={title} onClick={() => onSelectRoute([seg.routeKey])} onPreview={onPreview} preview={{ routeKeys: [seg.routeKey] }}>
        {route(seg)} <span className="num text-muted">{formatKm(seg.distKm)}</span> <span className="text-muted">km</span>
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
      <div className="px-6 pb-6">
        <div role="group" aria-label="Scope of the numbers" className="flex border border-rule">
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
            {place(stats.home.code)} {label(stats.home.code) === stats.home.code && <span className="text-muted">{stats.home.code}</span>}
          </Row>
          {stats.farthest && stats.farthest.km > 0 && (
            <Row label="Farthest from home" onClick={() => onSelectCity(stats.farthest.code)} onPreview={onPreview} preview={{ code: stats.farthest.code }}>
              {stats.farthest.city} <span className="num text-muted">{formatKm(stats.farthest.km)}</span> <span className="text-muted">km</span>
            </Row>
          )}
        </Section>
      )}

      <RankBars title="Most travelled routes" items={routeItems} onPreview={onPreview} />
      <RankBars title="Most visited places" items={placeItems} onPreview={onPreview} color="bg-place" />

      {(r.longest || r.longestGround || r.busiest) && (
        <Section title="Records">
          {routeRow('Longest flight', r.longest)}
          {r.shortest && r.shortest.routeKey !== r.longest?.routeKey && routeRow('Shortest flight', r.shortest)}
          {routeRow('Longest overland leg', r.longestGround)}
          {r.busiest && (
            <Row label="Busiest year" onClick={() => onYear(r.busiest.year)}>
              <span className="num">{r.busiest.year}</span> <span className="num text-muted">{r.busiest.n}</span> <span className="text-muted">trips</span>
            </Row>
          )}
        </Section>
      )}

      <Legend />
    </div>
  )
}
