import { useState, useCallback } from 'react'
import { normalizeCityName } from '../data/parseCsv.js'

const CARD_SHADOW = 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2px 8px, rgba(0,0,0,0.02) 0px 0.8px 3px'

const INPUT_STYLE = {
  background: '#ffffff',
  border: '1px solid #dddddd',
  borderRadius: 4,
  color: 'rgba(0,0,0,0.9)',
  fontSize: 14,
  padding: '6px 10px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  display: 'block',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(0,0,0,0.95)',
  marginBottom: 4,
}

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
      <label style={LABEL_STYLE}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={(e) => {
          e.target.style.borderColor = '#097fe8'
          e.target.style.outline = '2px solid rgba(9,127,232,0.2)'
          if (value.length >= 2) setShowSuggestions(suggestions.length > 0)
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#dddddd'
          e.target.style.outline = 'none'
          setTimeout(() => setShowSuggestions(false), 150)
        }}
        placeholder={label}
        style={INPUT_STYLE}
      />
      {showSuggestions && (
        <div
          className="absolute z-20 w-full mt-1 overflow-y-auto"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            boxShadow: CARD_SHADOW,
            maxHeight: 160,
          }}
        >
          {suggestions.map((city) => (
            <div
              key={city}
              className="cursor-pointer capitalize"
              style={{
                padding: '7px 12px',
                fontSize: 13,
                color: 'rgba(0,0,0,0.95)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
              }}
              onMouseDown={() => handleSelect(city)}
              onMouseOver={(e) => e.currentTarget.style.background = '#f6f5f4'}
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
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3" style={{ background: '#ffffff' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.125px', color: '#a39e98', textTransform: 'uppercase' }}>
        Add Flight
      </div>

      <div>
        <label style={LABEL_STYLE}>
          Year <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min="1900"
          max="2100"
          style={INPUT_STYLE}
          onFocus={(e) => {
            e.target.style.borderColor = '#097fe8'
            e.target.style.outline = '2px solid rgba(9,127,232,0.2)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#dddddd'
            e.target.style.outline = 'none'
          }}
        />
      </div>

      <CityInput label="Origin" value={origin} onChange={setOrigin} citiesDb={citiesDb} />
      <CityInput label="Transfer (optional)" value={transfer} onChange={setTransfer} citiesDb={citiesDb} required={false} />
      <CityInput label="Destination" value={dest} onChange={setDest} citiesDb={citiesDb} />

      {error && (
        <div
          style={{
            fontSize: 12,
            borderRadius: 4,
            padding: '7px 10px',
            background: 'rgba(239,68,68,0.06)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            fontSize: 12,
            borderRadius: 4,
            padding: '7px 10px',
            background: 'rgba(26,174,57,0.06)',
            color: '#1aae39',
            border: '1px solid rgba(26,174,57,0.15)',
          }}
        >
          Flight added!
        </div>
      )}

      <button
        type="submit"
        style={{
          background: '#0075de',
          color: '#ffffff',
          border: 'none',
          borderRadius: 4,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          fontFamily: 'inherit',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#005bab'}
        onMouseOut={(e) => e.currentTarget.style.background = '#0075de'}
      >
        Add to Map
      </button>

      <p style={{ fontSize: 12, color: '#a39e98', margin: 0 }}>
        City names must match entries in cities.json.
      </p>
    </form>
  )
}
