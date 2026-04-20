import { useState, useEffect, useRef, useCallback } from 'react'

export default function Timeline({ segments, onYearChange }) {
  const years = segments.map((s) => s.year).filter(Boolean)
  const minYear = years.length ? Math.min(...years) : 2008
  const maxYear = years.length ? Math.max(...years) : 2026

  const [currentYear, setCurrentYear] = useState(maxYear)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    setCurrentYear(maxYear)
    onYearChange(maxYear)
  }, [maxYear]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onYearChange(currentYear)
  }, [currentYear, onYearChange])

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentYear((y) => {
          if (y >= maxYear) {
            setIsPlaying(false)
            return maxYear
          }
          return y + 1
        })
      }, 600)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, maxYear])

  const handleSlider = useCallback((e) => {
    setCurrentYear(Number(e.target.value))
    setIsPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    if (currentYear >= maxYear) {
      setCurrentYear(minYear)
    }
    setIsPlaying((p) => !p)
  }, [currentYear, maxYear, minYear])

  const flightsThisYear = segments.filter((s) => s.year === currentYear).length
  const totalSoFar = segments.filter((s) => s.year <= currentYear).length

  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.1)' }}
    >
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          background: '#0075de',
          color: '#ffffff',
          border: 'none',
          borderRadius: 4,
          width: 34,
          height: 34,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#005bab'}
        onMouseOut={(e) => e.currentTarget.style.background = '#0075de'}
        title={isPlaying ? 'Pause' : 'Play timeline'}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="4" height="12" rx="1" />
            <rect x="8" y="1" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
            <polygon points="2,1 13,7 2,13" />
          </svg>
        )}
      </button>

      {/* Year display */}
      <div className="flex-shrink-0 w-12 text-right">
        <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.5px' }}>
          {currentYear}
        </span>
      </div>

      {/* Slider */}
      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={currentYear}
          onChange={handleSlider}
          className="w-full"
          style={{ accentColor: '#0075de' }}
        />
        <div className="flex justify-between" style={{ fontSize: 11, color: '#a39e98' }}>
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>

      {/* Flight count */}
      <div className="flex-shrink-0 text-right">
        <div style={{ fontSize: 12, fontWeight: 500, color: '#615d59' }}>
          {flightsThisYear > 0 ? `+${flightsThisYear} this year` : 'no flights'}
        </div>
        <div style={{ fontSize: 12, color: '#a39e98' }}>{totalSoFar} total</div>
      </div>
    </div>
  )
}
