import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Papa from 'papaparse'
import {
  loadFlightData,
  buildAirportsDb,
  expandToSegments,
  cleanRows,
  newRowId,
} from './parseCsv.js'

const STORAGE_KEY = 'flightLog:flights'

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? cleanRows(parsed) : null
  } catch {
    return null
  }
}

function writeSaved(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    /* storage full or blocked: the app still works for this session */
  }
}

export function useFlightData() {
  const [airports, setAirports] = useState(null)
  const [rawRows, setRawRows] = useState([])
  // Mutators read the latest rows from here, so callbacks held by toasts (Undo) never go stale.
  const rowsRef = useRef([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    loadFlightData()
      .then(({ rows, airports: db }) => {
        if (cancelled) return
        setAirports(db)
        const initial = readSaved() ?? rows
        rowsRef.current = initial
        setRawRows(initial)
      })
      .catch((err) => !cancelled && setError(err.message || 'Something went wrong.'))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [attempt])

  // Derived from the rows, so hubs and route counts never go stale.
  const citiesDb = useMemo(() => (airports ? buildAirportsDb(airports, rawRows) : {}), [airports, rawRows])
  const segments = useMemo(() => expandToSegments(rawRows, citiesDb), [rawRows, citiesDb])

  const commit = useCallback((rows) => {
    rowsRef.current = rows
    writeSaved(rows)
    setRawRows(rows)
  }, [])

  const addFlight = useCallback(
    (row) => {
      const withId = { ...row, id: newRowId() }
      commit([...rowsRef.current, withId])
      return withId
    },
    [commit],
  )

  const deleteFlight = useCallback(
    (id) => {
      const rows = rowsRef.current
      const index = rows.findIndex((r) => r.id === id)
      if (index < 0) return null
      commit(rows.filter((r) => r.id !== id))
      return { row: rows[index], index }
    },
    [commit],
  )

  const restoreFlight = useCallback(
    ({ row, index }) => {
      const next = [...rowsRef.current]
      next.splice(Math.min(index, next.length), 0, row)
      commit(next)
    },
    [commit],
  )

  const replaceFlights = useCallback((rows) => commit(cleanRows(rows)), [commit])

  const exportCsv = useCallback(
    () => Papa.unparse(rawRows.map(({ year, origin_city, transfer_city, dest_city }) => ({ year, origin_city, transfer_city, dest_city }))),
    [rawRows],
  )

  const resetToDefault = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    const { rows } = await loadFlightData()
    rowsRef.current = rows
    setRawRows(rows)
  }, [])

  return {
    segments,
    citiesDb,
    rawRows,
    isLoading,
    error,
    retry: () => setAttempt((n) => n + 1),
    addFlight,
    deleteFlight,
    restoreFlight,
    replaceFlights,
    exportCsv,
    resetToDefault,
  }
}
