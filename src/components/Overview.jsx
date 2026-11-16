import { useEffect, useRef, useState } from 'react'
import { CONTINENT_COUNT, WORLD_COUNTRIES } from '../data/countries.js'
import { formatKm } from '../utils/stats.js'

// Count up to a value; jumps straight there when reduced motion is on.
function useCountUp(value, reduced) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value
      setShown(value)
      return undefined
    }
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 600)
      const e = 1 - Math.pow(1 - t, 3)
      setShown(a + (value - a) * e)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])
  return shown
}

function Figure({ value, label, reduced, decimals = 0 }) {
  const v = useCountUp(value, reduced)
  return (
    <div>
      <div className="display text-[44px] leading-none text-fg">
        {decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-GB')}
      </div>
      <div className="mt-1.5 text-[13px] text-dim">{label}</div>
    </div>
  )
}

function Section({ title, aside, children }) {
  return (
    <section className="border-t border-line px-5 py-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
        {aside && <span className="text-[12px] text-dim">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children, onClick }) {
  const inner = (
    <>
      <span className="text-dim">{label}</span>
      <span className="min-w-0 truncate text-right text-fg">{children}</span>
    </>
  )
  const cls = '-mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between gap-4 rounded-md px-2 py-1.5 text-[13px]'
  return onClick ? (
    <button onClick={onClick} className={`${cls} text-left transition-colors hover:bg-white/[0.06]`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

const route = (s) => `${s.originName} – ${s.destName}`

export function Overview({ stats, year, scope, onScope, reduced, onFlyCountry, onSelectCity, onSelectRoute, citiesDb }) {
  const f = stats.focus
  const earth = stats.timesAroundEarth
  const r = stats.records
  const place = (code) => citiesDb[code]?.city || code

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

  return (
    <div>
      <div className="px-5 pb-4">
        <div role="group" aria-label="Scope of the numbers" className="flex gap-1 rounded-lg bg-white/[0.05] p-1">
          {scopeBtn('upto', `Up to ${year}`)}
          {scopeBtn('only', `Only ${year}`)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-6 px-5 pb-6">
        <Figure value={stats.trips} label={stats.trips === 1 ? 'flight' : 'flights'} reduced={reduced} />
        <Figure value={stats.countryCount} label={stats.countryCount === 1 ? 'country' : 'countries'} reduced={reduced} />
        <Figure value={stats.airports} label={stats.airports === 1 ? 'airport' : 'airports'} reduced={reduced} />
        <Figure value={Math.round(stats.km)} label="kilometres flown" reduced={reduced} />
      </div>

      {stats.km > 0 && (
        <p className="px-5 pb-5 text-[13px] leading-relaxed text-dim">
          That is{' '}
          <span className="text-fg">
            {earth >= 1 ? `${earth.toFixed(1)} times` : `${Math.round(earth * 100)}%`} around the Earth
          </span>
          , and about <span className="text-fg">{formatKm(stats.hours)} hours</span> in the air (estimated at 850 km/h).
        </p>
      )}

      <Section title="Passport" aside={`${stats.countryCount} of ${WORLD_COUNTRIES} countries`}>
        <div
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
          role="img"
          aria-label={`${stats.countryCount} of ${WORLD_COUNTRIES} countries`}
        >
          <div
            className="h-full rounded-full bg-city transition-[width] duration-700"
            style={{ width: `${Math.max(1.5, (stats.countryCount / WORLD_COUNTRIES) * 100)}%` }}
          />
        </div>
        <p className="mb-3 text-[12px] text-dim">
          {stats.continents.length} of {CONTINENT_COUNT} continents
          {stats.continents.length > 0 && <> · {stats.continents.join(', ')}</>}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {stats.countries.map((c) => (
            <li key={c.code}>
              <button
                onClick={() => onFlyCountry(c)}
                className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[12.5px] text-fg transition-colors hover:bg-white/[0.12]"
                title={`First visited in ${c.firstYear}`}
              >
                {c.name}
                <span className="ml-1.5 text-dim">{c.firstYear}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`In ${year}`} aside={f.avgTrips ? `your average is ${f.avgTrips.toFixed(1)} a year` : null}>
        {f.trips === 0 ? (
          <p className="text-[13px] text-dim">No flights logged for {year}.</p>
        ) : (
          <>
            <p className="text-[13px] text-dim">
              <span className="display text-[28px] leading-none text-fg">{f.trips}</span>{' '}
              {f.trips === 1 ? 'flight' : 'flights'}, <span className="text-fg">{formatKm(f.km)} km</span>
            </p>
            {(f.newCountries.length > 0 || f.newAirports.length > 0) && (
              <div className="mt-3 space-y-2">
                {f.newCountries.length > 0 && (
                  <p className="text-[13px]">
                    <span className="text-city">First time in </span>
                    {f.newCountries.map((c) => c.name).join(', ')}
                  </p>
                )}
                {f.newAirports.length > 0 && (
                  <p className="text-[13px] text-dim">
                    {f.newAirports.length} new {f.newAirports.length === 1 ? 'airport' : 'airports'}:{' '}
                    <span className="text-fg">{f.newAirports.map((a) => a.code).join(', ')}</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </Section>

      {stats.home && (
        <Section title="Home base">
          <Row label="Most departures" onClick={() => onSelectCity(stats.home.code)}>
            {place(stats.home.code)} <span className="text-dim">{stats.home.code}</span>
          </Row>
          {stats.farthest && stats.farthest.km > 0 && (
            <Row label="Farthest from home" onClick={() => onSelectCity(stats.farthest.code)}>
              {stats.farthest.city} <span className="text-dim">{formatKm(stats.farthest.km)} km</span>
            </Row>
          )}
        </Section>
      )}

      {r.longest && (
        <Section title="Records">
          <Row label="Longest flight" onClick={() => onSelectRoute([r.longest.routeKey])}>
            {route(r.longest)} <span className="text-dim">{formatKm(r.longest.distKm)} km</span>
          </Row>
          {r.shortest && r.shortest.routeKey !== r.longest.routeKey && (
            <Row label="Shortest flight" onClick={() => onSelectRoute([r.shortest.routeKey])}>
              {route(r.shortest)} <span className="text-dim">{formatKm(r.shortest.distKm)} km</span>
            </Row>
          )}
          {r.topRoute && r.topRoute.n > 1 && (
            <Row label="Most flown route" onClick={() => onSelectRoute([r.topRoute.seg.routeKey])}>
              {route(r.topRoute.seg)} <span className="text-dim">×{r.topRoute.n}</span>
            </Row>
          )}
          {r.topAirport && r.topAirport.n > 1 && (
            <Row label="Most visited airport" onClick={() => onSelectCity(r.topAirport.code)}>
              {r.topAirport.city} <span className="text-dim">×{r.topAirport.n}</span>
            </Row>
          )}
          {r.busiest && (
            <Row label="Busiest year">
              {r.busiest.year} <span className="text-dim">{r.busiest.n} flights</span>
            </Row>
          )}
        </Section>
      )}

      <Section title="Legend">
        <ul className="space-y-2 text-[12.5px] text-dim">
          <li className="flex items-center gap-3">
            <span className="h-[2px] w-8 rounded bg-route shadow-glow" /> Direct flight. Thicker means flown more often.
          </li>
          <li className="flex items-center gap-3">
            <span className="h-[2px] w-8 rounded bg-[#6f8fb8]" /> Leg of a connecting trip
          </li>
          <li className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-city ml-[11px] mr-[11px] shadow-[0_0_10px_2px_rgba(255,180,84,0.5)]" /> Airport you flew to or from
          </li>
          <li className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-hub ml-[13px] mr-[13px]" /> Connection only
          </li>
        </ul>
      </Section>
    </div>
  )
}
