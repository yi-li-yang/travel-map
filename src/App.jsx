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

const BTN_SECONDARY = {
  background: 'rgba(0,0,0,0.05)',
  color: 'rgba(0,0,0,0.95)',
  border: 'none',
  borderRadius: 4,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

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
      <div className="flex items-center justify-center h-screen" style={{ background: '#f6f5f4' }}>
        <div style={{ fontSize: 14, color: '#a39e98' }}>Loading flight data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f6f5f4' }}>
        <div style={{ fontSize: 14, color: '#ef4444' }}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f6f5f4' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          height: 52,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.25px' }}>
            Flight Fog
          </span>
          <span
            style={{
              background: '#f2f9ff',
              color: '#097fe8',
              borderRadius: 9999,
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.125px',
            }}
          >
            {rawRows.length} trips · {segments.length} arcs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            style={BTN_SECONDARY}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            title="Reset to default CSV data"
          >
            Reset
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={BTN_SECONDARY}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
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
          <div className="flex-1 min-h-0">
            <FlatMap segments={segments} citiesDb={citiesDb} maxYear={maxYear} />
          </div>
          <div className="flex-shrink-0">
            <Timeline segments={segments} onYearChange={handleYearChange} />
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="flex flex-col flex-shrink-0"
            style={{ width: 300, borderLeft: '1px solid rgba(0,0,0,0.1)', background: '#ffffff' }}
          >
            {/* Tab bar */}
            <div
              className="flex flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 transition-colors"
                  style={{
                    padding: '10px 0',
                    fontSize: 13,
                    fontWeight: 600,
                    color: activeTab === tab.id ? '#0075de' : '#a39e98',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #0075de' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: '#ffffff' }}>
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
