import { Button } from './ui/Button.jsx'
import { ChevronLeftIcon } from './ui/Icons.jsx'
import { rowRouteKeys, formatKm } from '../utils/stats.js'

function Back({ onClick }) {
  return (
    <Button variant="quiet" size="sm" onClick={onClick} className="-ml-2 mb-3">
      <ChevronLeftIcon width={16} height={16} /> Overview
    </Button>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="display text-[32px] leading-none">{value}</div>
      <div className="mt-1 text-[12.5px] text-dim">{label}</div>
    </div>
  )
}

/** Shown in the drawer when a city or a route is selected on the globe. */
export function CityPanel({ city, citiesDb, onBack, onSelectRoute }) {
  if (!city) return null
  const name = (c) => citiesDb[c]?.city || c
  const stops = (r) => [r.origin_city, r.transfer_city, r.dest_city].filter(Boolean)
  return (
    <div className="px-5 pb-6">
      <Back onClick={onBack} />
      <h2 className="display text-[40px] leading-[1.05]">{city.city || city.code}</h2>
      <p className="mt-1 text-[13px] text-dim">
        {city.name} <span className="text-fg">({city.code})</span>, {city.country}
        {city.isHub && ' · connection only'}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat value={city.visits} label={city.visits === 1 ? 'arrival' : 'arrivals'} />
        <Stat value={city.departures} label={city.departures === 1 ? 'departure' : 'departures'} />
        <Stat value={city.firstYear ?? '–'} label="first year" />
      </div>

      <h3 className="mb-2 mt-7 text-[13px] font-semibold">Flights through here</h3>
      <ul className="-mx-2">
        {city.rows.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onSelectRoute(rowRouteKeys(r))}
              className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="w-10 shrink-0 text-[13px] text-dim">{r.year}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {stops(r).map((c, i) => (
                  <span key={c + i}>
                    {i > 0 && <span className="text-dim"> → </span>}
                    <span className={c === city.code ? 'text-city' : ''}>{name(c)}</span>
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RoutePanel({ route, onBack, onSelectCity }) {
  if (!route) return null
  const times = route.years.length
  return (
    <div className="px-5 pb-6">
      <Back onClick={onBack} />
      <h2 className="display text-[36px] leading-[1.08]">
        <button onClick={() => onSelectCity(route.from)} className="rounded transition-colors hover:text-route">
          {route.fromCity}
        </button>
        <span className="text-dim"> → </span>
        <button onClick={() => onSelectCity(route.to)} className="rounded transition-colors hover:text-route">
          {route.toCity}
        </button>
      </h2>
      <p className="mt-1 text-[13px] text-dim">
        {route.from} to {route.to}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat value={formatKm(route.km)} label="kilometres each way" />
        <Stat value={times || '–'} label={times === 1 ? 'time flown' : 'times flown'} />
      </div>
      {times > 0 && (
        <p className="mt-5 text-[13px] text-dim">
          Flown in <span className="text-fg">{route.years.join(', ')}</span>
        </p>
      )}
    </div>
  )
}
