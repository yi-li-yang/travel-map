import { useDeferredValue, useId, useMemo, useRef, useState } from 'react'
import { Button } from './ui/Button.jsx'
import { countryName } from '../data/countries.js'
import { normalizeCode } from '../data/parseCsv.js'

const MAX_RESULTS = 7

function useAirportIndex(db, rows) {
  return useMemo(() => {
    const used = new Set()
    for (const r of rows) for (const c of [r.origin_city, r.transfer_city, r.dest_city]) if (c) used.add(c)
    return Object.entries(db).map(([code, a]) => ({
        used: used.has(code),
        code,
        city: a.city || '',
        name: a.name || '',
        country: a.country,
        cityLc: (a.city || '').toLowerCase(),
        nameLc: (a.name || '').toLowerCase(),
      }))
  }, [db, rows])
}

function search(index, raw) {
  const q = raw.trim().toLowerCase()
  if (q.length < 2) return []
  const code = q.toUpperCase()
  const scored = []
  for (const a of index) {
    let s = 0
    if (a.code === code) s = 100
    else if (a.cityLc === q) s = 80
    else if (a.cityLc.startsWith(q)) s = 60
    else if (a.code.startsWith(code)) s = 50
    else if (a.nameLc.startsWith(q)) s = 40
    else if (q.length >= 3 && (a.cityLc.includes(q) || a.nameLc.includes(q))) s = 20
    if (s) scored.push([s + (a.used ? 25 : 0), a])
  }
  // Airports you have used come first, then shorter city names (London before Londolozi).
  scored.sort((x, y) => y[0] - x[0] || x[1].city.length - y[1].city.length || x[1].name.length - y[1].name.length)
  return scored.slice(0, MAX_RESULTS).map(([, a]) => a)
}

/** Accessible airport picker: type a code or city, arrow keys to move, Enter to choose. */
function AirportInput({ label, hint, index, db, value, onChange, optional }) {
  const uid = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const deferred = useDeferredValue(text)
  const results = useMemo(() => (open ? search(index, deferred) : []), [index, deferred, open])
  const inputRef = useRef(null)

  const picked = value ? db[value] : null

  const choose = (a) => {
    onChange(a.code)
    setText('')
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault()
        choose(results[active])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation()
        setOpen(false)
      }
    } else if (e.key === 'Backspace' && !text && value) {
      onChange('')
    }
  }

  const listId = `${uid}-list`
  return (
    <div className="relative">
      <label htmlFor={`${uid}-input`} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium">
        {label}
        {optional && <span className="text-[12px] font-normal text-dim">optional</span>}
      </label>

      {picked ? (
        <div className="flex h-11 items-center justify-between rounded-xl bg-white/[0.07] pl-3 pr-1">
          <span className="min-w-0 truncate text-[14px]">
            <span className="text-city">{value}</span> {picked.city}, {countryName(picked.country)}
          </span>
          <Button
            size="iconSm"
            variant="quiet"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onChange('')
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
          >
            ×
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            id={`${uid}-input`}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${uid}-opt-${results[active].code}` : undefined}
            autoComplete="off"
            spellCheck={false}
            value={text}
            placeholder={hint}
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
              setActive(0)
            }}
            onFocus={() => text && setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-xl bg-white/[0.07] px-3 text-[14px] text-fg focus:bg-white/[0.1]"
          />
          {open && results.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="panel absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl py-1"
              style={{ background: 'rgba(21,30,53,0.98)' }}
            >
              {results.map((a, i) => (
                <li
                  key={a.code}
                  id={`${uid}-opt-${a.code}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(a)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-white/[0.1]' : ''}`}
                >
                  <div className="text-[14px]">
                    <span className="mr-2 font-semibold text-city">{a.code}</span>
                    {a.city}, {countryName(a.country)}
                  </div>
                  <div className="truncate text-[12px] text-dim">{a.name}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

const thisYear = new Date().getFullYear()

export function AddFlightForm({ citiesDb, rawRows, onAdd }) {
  const index = useAirportIndex(citiesDb, rawRows)
  const yearId = useId()
  const [year, setYear] = useState(String(thisYear))
  const [origin, setOrigin] = useState('')
  const [transfer, setTransfer] = useState('')
  const [dest, setDest] = useState('')
  const [error, setError] = useState('')

  const row = { year: year.trim(), origin_city: origin, transfer_city: transfer, dest_city: dest }
  const duplicate = useMemo(
    () =>
      Boolean(origin && dest) &&
      rawRows.some(
        (r) =>
          r.year === year.trim() &&
          normalizeCode(r.origin_city) === origin &&
          normalizeCode(r.transfer_city) === transfer &&
          normalizeCode(r.dest_city) === dest,
      ),
    [rawRows, year, origin, transfer, dest],
  )

  const submit = (e) => {
    e.preventDefault()
    const y = parseInt(year, 10)
    if (!Number.isFinite(y) || y < 1950 || y > 2100) return setError('Enter a year between 1950 and 2100.')
    if (!origin) return setError('Choose where you flew from.')
    if (!dest) return setError('Choose where you flew to.')
    if (origin === dest) return setError('Origin and destination are the same airport.')
    setError('')
    onAdd({ ...row, year: String(y) })
    setOrigin('')
    setTransfer('')
    setDest('')
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-5 pb-6" noValidate>
      <div>
        <label htmlFor={yearId} className="mb-1.5 block text-[13px] font-medium">
          Year
        </label>
        <input
          id={yearId}
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="h-11 w-28 rounded-xl bg-white/[0.07] px-3 text-[14px] focus:bg-white/[0.1]"
        />
      </div>

      <AirportInput label="From" hint="Airport code or city, e.g. LHR" index={index} db={citiesDb} value={origin} onChange={setOrigin} />
      <AirportInput label="Connection" hint="Where you changed planes" index={index} db={citiesDb} value={transfer} onChange={setTransfer} optional />
      <AirportInput label="To" hint="Airport code or city, e.g. Tokyo" index={index} db={citiesDb} value={dest} onChange={setDest} />

      <div aria-live="polite" className="min-h-[1.25rem] text-[13px]">
        {error && <p className="text-danger">{error}</p>}
        {!error && duplicate && <p className="text-city-soft">You already logged this exact flight. Adding it again counts it twice.</p>}
      </div>

      <Button type="submit" variant="primary" className="w-full justify-center">
        Add flight
      </Button>
    </form>
  )
}
