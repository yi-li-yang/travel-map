import { useMemo } from 'react'
import { CONTINENT_COUNT, WORLD_COUNTRIES } from '../../data/countries.js'
import { Meter, Section } from './parts.jsx'

/** Countries reached, how they spread over the continents, and each country with the year of the first visit. */
export function Passport({ stats, onFlyCountry }) {
  const byContinent = useMemo(() => {
    const counts = new Map()
    for (const c of stats.countries) {
      if (c.continent && c.continent !== 'Antarctica') counts.set(c.continent, (counts.get(c.continent) || 0) + 1)
    }
    return [...counts].sort((a, b) => b[1] - a[1])
  }, [stats.countries])
  const most = byContinent[0]?.[1] || 1

  return (
    <Section title="Passport" aside={`${stats.countryCount} of ${WORLD_COUNTRIES} countries`}>
      <Meter
        value={stats.countryCount}
        max={WORLD_COUNTRIES}
        className="bg-place"
        label={`${stats.countryCount} of ${WORLD_COUNTRIES} countries`}
      />
      <p className="mb-3 mt-3 text-[14px] text-muted">
        <span className="num">{stats.continents.length}</span> of <span className="num">{CONTINENT_COUNT}</span> continents
      </p>
      <ul className="mb-4 space-y-2">
        {byContinent.map(([name, n]) => (
          <li key={name} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-3 text-[14px]">
            <span className="truncate text-muted">{name}</span>
            <Meter value={n} max={most} className="bg-place" label={`${n} ${n === 1 ? 'country' : 'countries'} in ${name}`} />
            <span className="num text-right">{n}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-2">
        {stats.countries.map((c) => (
          <li key={c.code}>
            <button
              onClick={() => onFlyCountry(c)}
              className="border border-edge px-2 py-1 text-[14px] text-ink transition-colors duration-fast ease-out hover:bg-surface"
              title={`First visited in ${c.firstYear}`}
            >
              {c.name}
              <span className="num ml-2 text-[12px] text-muted">{c.firstYear}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}
