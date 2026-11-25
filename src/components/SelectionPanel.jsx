import { Back, Stat } from './panelParts.jsx'
import { RouteChain } from './RouteChain.jsx'
import { flightTime, formatKm } from '../utils/stats.js'
import { previewProps } from '../utils/preview.js'
import { GROUND, isAirport, tripRouteKeys } from '../data/route.js'

/** Shown in the drawer when a city is selected on the globe. */
export function CityPanel({ city, citiesDb, back, onBack, onSelectTrip, onPreview }) {
  if (!city) return null
  return (
    <div className="px-6 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="text-[25px] font-semibold leading-[1.15]">{city.city || city.code}</h2>
      <p className="mt-1 text-[14px] text-muted">
        {isAirport(city) ? (
          <>
            {city.name} <span className="num text-ink">({city.code})</span>
          </>
        ) : (
          'No airport'
        )}
        , {city.country}
        {city.isHub && ' · connection only'}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat value={city.visits} label={city.visits === 1 ? 'arrival' : 'arrivals'} />
        <Stat value={city.departures} label={city.departures === 1 ? 'departure' : 'departures'} />
        <Stat value={city.firstYear ?? '–'} label="first year" />
      </div>
      {city.lastYear && city.lastYear !== city.firstYear && (
        <p className="mt-4 text-[14px] text-muted">
          Most recently in <span className="num text-ink">{city.lastYear}</span>
        </p>
      )}

      <h3 className="label mb-2 mt-8">Trips through here</h3>
      <ul className="-mx-2">
        {city.trips.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onSelectTrip(t)}
              {...previewProps(onPreview, { routeKeys: tripRouteKeys(t) })}
              className="flex w-full items-baseline gap-3 px-2 py-2 text-left transition-colors duration-fast ease-out hover:bg-surface"
            >
              <span className="num w-10 shrink-0 text-[14px] text-muted">{t.year}</span>
              <span className="min-w-0 flex-1 text-[14px] leading-snug">
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
    <div className="px-6 pb-6">
      <Back onClick={onBack} label={back} />
      <h2 className="text-[25px] font-semibold leading-[1.15]">
        <button onClick={() => onSelectCity(route.from)} className="transition-colors hover:text-ink hover:underline">
          {route.fromCity}
        </button>
        <span className="text-muted">{ground ? ' ⇢ ' : ' → '}</span>
        <button onClick={() => onSelectCity(route.to)} className="transition-colors hover:text-ink hover:underline">
          {route.toCity}
        </button>
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        {ground ? 'Overland, straight-line distance' : `Flight, ${route.from} to ${route.to} · about ${flightTime(route.km)}`}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat value={formatKm(route.km)} label="kilometres each way" />
        <Stat value={times || '–'} label={times === 1 ? `time ${verb}` : `times ${verb}`} />
      </div>
      {times > 0 && (
        <>
          <p className="label mb-2 mt-8">{ground ? 'Travelled' : 'Flown'} in</p>
          <ul className="flex flex-wrap gap-2">
            {uniqueYears.map((y) => {
              const n = route.years.filter((v) => v === y).length
              return (
                <li key={y}>
                  <button
                    onClick={() => onYear(y)}
                    title={`Show the globe as of ${y}`}
                    className="num border border-edge px-2 py-1 text-[14px] transition-colors duration-fast ease-out hover:bg-surface"
                  >
                    {y}
                    {n > 1 && <span className="ml-1 text-[12px] text-muted">×{n}</span>}
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
