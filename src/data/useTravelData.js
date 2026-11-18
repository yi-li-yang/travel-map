import { useState, useEffect, useMemo } from 'react'
import { loadTravelData, buildPlacesDb, expandToSegments } from './parseCsv.js'
import { csvPath } from './users.js'

// Earlier versions kept an editable copy of the trips (and the chosen person) in the browser.
// That copy would hide the CSV, so it is removed once.
function clearOldBrowserData() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('flightLog:flights') || key === 'flightLog:user') localStorage.removeItem(key)
  } catch {
    /* storage blocked: nothing to clean */
  }
}
clearOldBrowserData()

/**
 * One person's trips, read from public/trips/<id>.csv. The app never writes them.
 * While another person's file loads, the previous person's trips stay on screen, so the globe is never torn down.
 */
export function useTravelData(user) {
  const csv = csvPath(user)
  const [loaded, setLoaded] = useState({ csv: null, trips: [], places: null, updated: null, life: [] })
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    loadTravelData(csv, `${user.id}:`)
      .then(({ trips, places, updated, life }) => !cancelled && setLoaded({ csv, trips, places, updated, life }))
      .catch((err) => !cancelled && setError(err.message || 'Something went wrong.'))
    return () => {
      cancelled = true
    }
  }, [attempt, csv, user.id])

  const { trips, places } = loaded
  // Derived from the trips, so connection-only places and route counts never go stale.
  const citiesDb = useMemo(() => (places ? buildPlacesDb(places, trips) : {}), [places, trips])
  const segments = useMemo(() => expandToSegments(trips, citiesDb), [trips, citiesDb])

  return {
    trips,
    segments,
    citiesDb,
    updated: loaded.updated,
    life: loaded.life,
    hasLoaded: loaded.csv !== null,
    error,
    retry: () => setAttempt((n) => n + 1),
  }
}
