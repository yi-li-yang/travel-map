import { Back, Stat } from './panelParts.jsx'
import { RouteChain } from './RouteChain.jsx'
import { flightTime, formatKm } from '../utils/stats.js'
import { previewProps } from '../utils/preview.js'
import { GROUND, isAirport, tripRouteKeys } from '../data/route.js'

/** Shown in the drawer when a city is selected on the globe. */
export function CityPanel({ city, citiesDb, back, onBack, onSelectTrip, onPreview }) {
  if (!city) return null
  return (
    <div className="px-5 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="display text-[40px] leading-[1.05]">{city.city || city.code}</h2>
      <p className="mt-1 text-[13px] text-dim">
        {isAirport(city) ? (
          <>
            {city.name} <span className="text-fg">({city.code})</span>
          </>
        ) : (
          'No airport'
        )}
        , {city.country}
        {city.isHub && ' · connection only'}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat value={city.visits} label={city.visits === 1 ? 'arrival' : 'arrivals'} />
        <Stat value={city.departures} label={city.departures === 1 ? 'departure' : 'departures'} />
        <Stat value={city.firstYear ?? '–'} label="first year" />
      </div>
      {city.lastYear && city.lastYear !== city.firstYear && (
        <p className="mt-4 text-[13px] text-dim">
          Most recently in <span className="text-fg">{city.lastYear}</span>
        </p>
      )}

      <h3 className="mb-2 mt-7 text-[13px] font-semibold">Trips through here</h3>
      <ul className="-mx-2">
        {city.trips.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onSelectTrip(t)}
              {...previewProps(onPreview, { routeKeys: tripRouteKeys(t) })}
              className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="w-10 shrink-0 text-[13px] text-dim">{t.year}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-snug">
                <RouteChain trip={t} citiesDb={citiesDb} highlight={city.code} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One route between two places: how far, how often, and the years. Years jump the timeline. */
export function RoutePanel({ route, back, onBack, onSelectCity, onYear }) {
  if (!route) return null
  const times = route.years.length
  const ground = route.mode === GROUND
  const verb = ground ? 'travelled' : 'flown'
  const uniqueYears = [...new Set(route.years)]
  return (
    <div className="px-5 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="display text-[36px] leading-[1.08]">
        <button onClick={() => onSelectCity(route.from)} className="rounded transition-colors hover:text-route">
          {route.fromCity}
        </button>
        <span className="text-dim">{ground ? ' ⇢ ' : ' → '}</span>
        <button onClick={() => onSelectCity(route.to)} className="rounded transition-colors hover:text-route">
          {route.toCity}
        </button>
      </h2>
      <p className="mt-1 text-[13px] text-dim">
        {ground ? 'Overland, straight-line distance' : `Flight, ${route.from} to ${route.to} · about ${flightTime(route.km)}`}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat value={formatKm(route.km)} label="kilometres each way" />
        <Stat value={times || '–'} label={times === 1 ? `time ${verb}` : `times ${verb}`} />
      </div>
      {times > 0 && (
        <>
          <p className="mb-2 mt-6 text-[13px] text-dim">{ground ? 'Travelled' : 'Flown'} in</p>
          <ul className="flex flex-wrap gap-1.5">
            {uniqueYears.map((y) => {
              const n = route.years.filter((v) => v === y).length
              return (
                <li key={y}>
                  <button
                    onClick={() => onYear(y)}
                    title={`Show the globe as of ${y}`}
                    className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[12.5px] transition-colors hover:bg-white/[0.12]"
                  >
                    {y}
                    {n > 1 && <span className="ml-1 text-dim">×{n}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
