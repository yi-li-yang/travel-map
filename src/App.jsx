import { useState, useCallback } from 'react'
import FlatMap from './components/FlatMap.jsx'
import Timeline from './components/Timeline.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import FlightTable from './components/FlightTable.jsx'
import ManualEntryForm from './components/ManualEntryForm.jsx'
import { useFlightData } from './data/useFlightData.js'

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'flights', label: 'Flights' },
  { id: 'add', label: '+ Add' },
]

export default function App() {
  const {
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
  } = useFlightData()

  const [maxYear, setMaxYear] = useState(2026)
  const [activeTab, setActiveTab] = useState('stats')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleYearChange = useCallback((year) => {
    setMaxYear(year)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#0a0a1a' }}>
        <div className="text-sm" style={{ color: '#475569' }}>Loading flight data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#0a0a1a' }}>
        <div className="text-sm" style={{ color: '#f87171' }}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a1a' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ background: '#0d0d1f', borderColor: '#1e293b', zIndex: 10 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold" style={{ color: '#f59e0b', letterSpacing: '0.05em' }}>
            ✈ Flight Fog
          </span>
          <span className="text-xs" style={{ color: '#334155' }}>
            {segments.length} arcs · {rawRows.length} trips
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            className="text-xs px-2 py-1 rounded border"
            style={{ borderColor: '#334155', color: '#475569' }}
            title="Reset to default CSV data"
          >
            Reset
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-xs px-2 py-1 rounded border"
            style={{ borderColor: '#334155', color: '#94a3b8' }}
            title="Toggle sidebar"
          >
            {sidebarOpen ? 'Hide ›' : '‹ Show'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Map area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Map takes all remaining space */}
          <div className="flex-1 min-h-0">
            <FlatMap
              segments={segments}
              citiesDb={citiesDb}
              maxYear={maxYear}
            />
          </div>
          {/* Timeline at bottom of map */}
          <div className="flex-shrink-0">
            <Timeline segments={segments} onYearChange={handleYearChange} />
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="flex flex-col flex-shrink-0 border-l"
            style={{ width: 300, borderColor: '#1e293b', background: '#0d0d1f' }}
          >
            {/* Tab bar */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: '#1e293b' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: activeTab === tab.id ? '#f59e0b' : '#475569',
                    borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                    background: 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {activeTab === 'stats' && (
                <StatsPanel segments={segments} citiesDb={citiesDb} />
              )}
              {activeTab === 'flights' && (
                <FlightTable
                  rawRows={rawRows}
                  onDelete={deleteFlight}
                  onExport={exportCsv}
                  onImport={importCsv}
                />
              )}
              {activeTab === 'add' && (
                <ManualEntryForm citiesDb={citiesDb} onAdd={addFlight} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
