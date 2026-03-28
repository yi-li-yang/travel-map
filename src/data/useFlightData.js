import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { loadFlightData, buildCitiesDb, expandToSegments } from './parseCsv.js'

const STORAGE_KEY = 'flightFog:flights'

export function useFlightData() {
  const [rawRows, setRawRows] = useState([])
  const [citiesDb, setCitiesDb] = useState({})
  const [segments, setSegments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function init() {
      try {
        const { rawRows: fetchedRows, citiesDb: db } = await loadFlightData()
        setCitiesDb(db)

        // Check localStorage for saved data
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const savedRows = JSON.parse(saved)
          setRawRows(savedRows)
          setSegments(expandToSegments(savedRows, db))
        } else {
          setRawRows(fetchedRows)
          setSegments(expandToSegments(fetchedRows, db))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const persist = useCallback((rows, db) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    setRawRows(rows)
    setSegments(expandToSegments(rows, db))
  }, [])

  const addFlight = useCallback((row) => {
    const newRows = [...rawRows, row]
    persist(newRows, citiesDb)
  }, [rawRows, citiesDb, persist])

  const deleteFlight = useCallback((index) => {
    const newRows = rawRows.filter((_, i) => i !== index)
    persist(newRows, citiesDb)
  }, [rawRows, citiesDb, persist])

  const importCsv = useCallback((text) => {
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
    persist(data, citiesDb)
  }, [citiesDb, persist])

  const exportCsv = useCallback(() => {
    return Papa.unparse(rawRows)
  }, [rawRows])

  const resetToDefault = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    const { rawRows: rows, citiesDb: db } = await loadFlightData()
    setCitiesDb(db)
    setRawRows(rows)
    setSegments(expandToSegments(rows, db))
  }, [])

  return {
    segments,
    citiesDb,
    rawRows,
    isLoading,
    error,
    addFlight,
    deleteFlight,
    importCsv,
    exportCsv,
    resetToDefault,
  }
}
