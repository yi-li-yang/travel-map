import { useMemo, useRef, useState } from 'react'
import { Button } from './ui/Button.jsx'
import { DownloadIcon, UploadIcon, TrashIcon, SearchIcon } from './ui/Icons.jsx'
import { rowRouteKeys } from '../utils/stats.js'

export function FlightList({
  rawRows,
  citiesDb,
  year,
  selected,
  onSelectRoute,
  onDelete,
  onExport,
  onImportFile,
  onReset,
  onGoAdd,
}) {
  const [query, setQuery] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef(null)
  const name = (c) => citiesDb[c]?.city || c

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (r) => {
      if (!q) return true
      const stops = [r.origin_city, r.transfer_city, r.dest_city].filter(Boolean)
      return (
        r.year.includes(q) ||
        stops.some((c) => c.toLowerCase().includes(q) || name(c).toLowerCase().includes(q))
      )
    }
    const byYear = new Map()
    for (const r of rawRows) {
      if (!match(r)) continue
      if (!byYear.has(r.year)) byYear.set(r.year, [])
      byYear.get(r.year).push(r)
    }
    return [...byYear.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRows, query, citiesDb])

  const isSelected = (r) => {
    if (selected?.type !== 'route') return false
    const keys = rowRouteKeys(r)
    return keys.length === selected.routeKeys.length && keys.every((k) => selected.routeKeys.includes(k))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-5 pb-3">
        <label className="relative block">
          <span className="sr-only">Search flights</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" width={16} height={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, code or year"
            className="h-10 w-full rounded-xl bg-white/[0.06] pl-9 pr-3 text-[14px] text-fg placeholder:text-[#66708a] focus:bg-white/[0.09]"
          />
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={onExport}>
            <DownloadIcon width={16} height={16} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <UploadIcon width={16} height={16} /> Import CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="scroll min-h-0 flex-1 overflow-y-auto">
        {rawRows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="display text-[26px]">No flights yet</p>
            <p className="mx-auto mt-2 max-w-[22ch] text-[13px] text-dim">Add a flight, or import a CSV you exported before.</p>
            <Button variant="primary" className="mt-4" onClick={onGoAdd}>
              Add a flight
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-dim">No flights match “{query}”.</p>
        ) : (
          groups.map(([y, rows]) => (
            <section key={y} aria-label={`Flights in ${y}`}>
              <h3 className="sticky top-0 z-10 bg-[rgba(14,21,38,0.92)] px-5 py-1.5 text-[12px] font-semibold text-dim backdrop-blur">
                {y}
                <span className="ml-2 font-normal">{rows.length}</span>
              </h3>
              <ul className="px-3">
                {rows.map((r) => {
                  const stops = [r.origin_city, r.transfer_city, r.dest_city].filter(Boolean)
                  const future = Number(r.year) > year
                  return (
                    <li
                      key={r.id}
                      className={`group flex items-center rounded-xl transition-opacity ${isSelected(r) ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]'} ${
                        future ? 'opacity-45' : ''
                      }`}
                    >
                      <button
                        onClick={() => onSelectRoute(rowRouteKeys(r))}
                        className="min-w-0 flex-1 px-2 py-2.5 text-left"
                        aria-label={`Show ${stops.map(name).join(' to ')} on the globe`}
                      >
                        <span className="block truncate text-[13.5px]">
                          {stops.map((c, i) => (
                            <span key={c + i}>
                              {i > 0 && <span className="text-dim"> → </span>}
                              {name(c)}
                            </span>
                          ))}
                        </span>
                        <span className="block truncate text-[11.5px] text-dim">{stops.join(' · ')}</span>
                      </button>
                      <Button
                        variant="quiet"
                        size="icon"
                        className="opacity-60 hover:!text-danger group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Delete flight ${stops.join(' to ')}, ${r.year}`}
                        onClick={() => onDelete(r.id)}
                      >
                        <TrashIcon width={18} height={18} />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}

        <div className="px-5 py-5">
          {confirmReset ? (
            <div className="rounded-xl bg-danger/10 p-3 text-[13px]">
              <p>Replace your flights with the original list from flight_history.csv? Flights you added or changed here will be lost.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="danger" onClick={() => { setConfirmReset(false); onReset() }}>
                  Restore
                </Button>
                <Button size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="quiet" onClick={() => setConfirmReset(true)}>
              Restore original flights
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
