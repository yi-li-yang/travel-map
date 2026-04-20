import { useState, useCallback } from 'react'
import { normalizeCode } from '../data/parseCsv.js'

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

function AirportInput({ label, value, onChange, airportsDb, required = true }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    if (val.length >= 2) {
      const upper = val.toUpperCase()
      const lower = val.toLowerCase()
      const matches = Object.entries(airportsDb)
        .filter(([code, info]) =>
          code.startsWith(upper) ||
          info.city?.toLowerCase().includes(lower) ||
          info.name?.toLowerCase().includes(lower)
        )
        .slice(0, 8)
        .map(([code, info]) => ({ code, info }))
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSelect = (code) => {
    onChange(code)
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
        placeholder={`IATA code or city name`}
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
            maxHeight: 200,
          }}
        >
          {suggestions.map(({ code, info }) => (
            <div
              key={code}
              className="cursor-pointer"
              style={{
                padding: '7px 12px',
                fontSize: 13,
                color: 'rgba(0,0,0,0.95)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
              }}
              onMouseDown={() => handleSelect(code)}
              onMouseOver={(e) => e.currentTarget.style.background = '#f6f5f4'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600 }}>{code}</span>
              <span style={{ color: '#615d59', marginLeft: 6 }}>
                {info.city}, {info.country}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ManualEntryForm({ citiesDb: airportsDb, onAdd }) {
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

    const originKey = normalizeCode(origin)
    const destKey = normalizeCode(dest)
    const transferKey = normalizeCode(transfer)

    if (!airportsDb[originKey]) {
      setError(`Unknown airport: "${origin}". Use IATA codes (e.g. CTU, LHR).`)
      return
    }
    if (!airportsDb[destKey]) {
      setError(`Unknown airport: "${dest}". Use IATA codes (e.g. CTU, LHR).`)
      return
    }
    if (transfer && !airportsDb[transferKey]) {
      setError(`Unknown transfer airport: "${transfer}". Use IATA codes (e.g. DOH, AMS).`)
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
  }, [year, origin, transfer, dest, airportsDb, onAdd])

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

      <AirportInput label="Origin" value={origin} onChange={setOrigin} airportsDb={airportsDb} />
      <AirportInput label="Transfer (optional)" value={transfer} onChange={setTransfer} airportsDb={airportsDb} required={false} />
      <AirportInput label="Destination" value={dest} onChange={setDest} airportsDb={airportsDb} />

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
        Enter IATA airport codes (e.g. CTU, LHR) or search by city name.
      </p>
    </form>
  )
}
