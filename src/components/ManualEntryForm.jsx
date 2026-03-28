import { useState, useCallback } from 'react'
import { normalizeCityName } from '../data/parseCsv.js'

function CityInput({ label, value, onChange, citiesDb, required = true }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    if (val.length >= 2) {
      const norm = normalizeCityName(val)
      const matches = Object.keys(citiesDb)
        .filter((k) => k.includes(norm))
        .slice(0, 8)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSelect = (city) => {
    onChange(city)
    setShowSuggestions(false)
  }

  return (
    <div className="relative">
      <label className="block text-xs mb-1" style={{ color: '#94a3b8' }}>
        {label}{required && <span style={{ color: '#f59e0b' }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => value.length >= 2 && setShowSuggestions(suggestions.length > 0)}
        placeholder={label}
        className="w-full text-sm rounded px-2 py-1.5 outline-none"
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          color: '#e2e8f0',
        }}
      />
      {showSuggestions && (
        <div
          className="absolute z-20 w-full mt-1 rounded border shadow-lg overflow-y-auto"
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            maxHeight: 160,
          }}
        >
          {suggestions.map((city) => (
            <div
              key={city}
              className="px-3 py-1.5 text-sm cursor-pointer capitalize"
              style={{ color: '#cbd5e1' }}
              onMouseDown={() => handleSelect(city)}
              onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ManualEntryForm({ citiesDb, onAdd }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [origin, setOrigin] = useState('')
  const [transfer, setTransfer] = useState('')
  const [dest, setDest] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const yr = parseInt(year, 10)
    if (!yr || yr < 1900 || yr > 2100) {
      setError('Invalid year')
      return
    }

    const originKey = normalizeCityName(origin)
    const destKey = normalizeCityName(dest)
    const transferKey = normalizeCityName(transfer)

    if (!citiesDb[originKey]) {
      setError(`Unknown city: "${origin}". Add it to cities.json first.`)
      return
    }
    if (!citiesDb[destKey]) {
      setError(`Unknown city: "${dest}". Add it to cities.json first.`)
      return
    }
    if (transfer && !citiesDb[transferKey]) {
      setError(`Unknown transfer city: "${transfer}". Add it to cities.json first.`)
      return
    }

    onAdd({
      year: String(yr),
      origin_city: originKey,
      transfer_city: transferKey,
      dest_city: destKey,
    })

    setOrigin('')
    setTransfer('')
    setDest('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }, [year, origin, transfer, dest, citiesDb, onAdd])

  return (
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
      <h3 className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#f59e0b' }}>
        Add Flight
      </h3>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#94a3b8' }}>
          Year <span style={{ color: '#f59e0b' }}>*</span>
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min="1900"
          max="2100"
          className="w-full text-sm rounded px-2 py-1.5 outline-none"
          style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
        />
      </div>

      <CityInput label="Origin" value={origin} onChange={setOrigin} citiesDb={citiesDb} />
      <CityInput label="Transfer (optional)" value={transfer} onChange={setTransfer} citiesDb={citiesDb} required={false} />
      <CityInput label="Destination" value={dest} onChange={setDest} citiesDb={citiesDb} />

      {error && (
        <div className="text-xs rounded px-2 py-1.5" style={{ background: '#450a0a', color: '#fca5a5' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs rounded px-2 py-1.5" style={{ background: '#052e16', color: '#86efac' }}>
          Flight added!
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2 rounded text-sm font-semibold transition-opacity"
        style={{ background: '#f59e0b', color: '#0a0a1a' }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        Add to Map
      </button>

      <p className="text-xs" style={{ color: '#334155' }}>
        City names must match entries in cities.json (case-insensitive).
      </p>
    </form>
  )
}
