import { useCallback, useEffect, useRef, useState } from 'react'

const BASE_MS = 900

/**
 * Steps `year` forward through the years that have flights.
 * `years` is the sorted list of active years; the timeline itself can show any year in range.
 */
export function usePlayback({ years, year, setYear }) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const yearRef = useRef(year)
  yearRef.current = year
  const stopAtRef = useRef(Infinity)

  useEffect(() => {
    if (!playing || !years.length) return undefined
    const id = setInterval(() => {
      const next = years.find((y) => y > yearRef.current)
      if (next === undefined || next > stopAtRef.current) setPlaying(false)
      else setYear(next)
    }, BASE_MS / speed)
    return () => clearInterval(id)
  }, [playing, speed, years, setYear])

  const stop = useCallback(() => setPlaying(false), [])

  const start = useCallback(
    (opts = {}) => {
      if (!years.length) return
      const last = years[years.length - 1]
      if (opts.from !== undefined) setYear(opts.from)
      else if (yearRef.current >= last) setYear(years[0])
      if (opts.speed) setSpeed(opts.speed)
      stopAtRef.current = opts.stopAt ?? Infinity
      setPlaying(true)
    },
    [years, setYear],
  )

  const toggle = useCallback(() => (playing ? stop() : start()), [playing, start, stop])

  // Jump to the previous/next year that has flights.
  const step = useCallback(
    (dir) => {
      setPlaying(false)
      const y = yearRef.current
      const target = dir > 0 ? years.find((v) => v > y) : [...years].reverse().find((v) => v < y)
      if (target !== undefined) setYear(target)
    },
    [years, setYear],
  )

  return { playing, speed, setSpeed, start, stop, toggle, step }
}
