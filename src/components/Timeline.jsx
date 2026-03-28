import { useState, useEffect, useRef, useCallback } from 'react'

export default function Timeline({ segments, onYearChange }) {
  const years = segments.map((s) => s.year).filter(Boolean)
  const minYear = years.length ? Math.min(...years) : 2008
  const maxYear = years.length ? Math.max(...years) : 2026

  const [currentYear, setCurrentYear] = useState(maxYear)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)

  // Sync maxYear on data load
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
      className="flex items-center gap-4 px-4 py-3 border-t"
      style={{ background: '#0d0d1f', borderColor: '#1e293b' }}
    >
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
        style={{ background: '#f59e0b', color: '#0a0a1a' }}
        title={isPlaying ? 'Pause' : 'Play timeline'}
      >
        {isPlaying ? (
          // Pause icon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="4" height="12" rx="1" />
            <rect x="8" y="1" width="4" height="12" rx="1" />
          </svg>
        ) : (
          // Play icon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <polygon points="2,1 13,7 2,13" />
          </svg>
        )}
      </button>

      {/* Year display */}
      <div className="flex-shrink-0 text-right w-12">
        <span className="text-lg font-bold" style={{ color: '#f59e0b' }}>{currentYear}</span>
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
          style={{ accentColor: '#f59e0b' }}
        />
        <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>

      {/* Flight count */}
      <div className="flex-shrink-0 text-right text-xs" style={{ color: '#94a3b8' }}>
        <div>{flightsThisYear > 0 ? `+${flightsThisYear} this year` : 'no flights'}</div>
        <div style={{ color: '#64748b' }}>{totalSoFar} total</div>
      </div>
    </div>
  )
}
