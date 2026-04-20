import { useCallback, useRef } from 'react'

const BTN_SECONDARY = {
  background: 'rgba(0,0,0,0.05)',
  color: 'rgba(0,0,0,0.95)',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  flex: 1,
}

const TH_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.125px',
  textTransform: 'uppercase',
  color: '#a39e98',
  textAlign: 'left',
  padding: '8px 4px',
}

export default function FlightTable({ rawRows, onDelete, onExport, onImport }) {
  const fileInputRef = useRef(null)

  const handleExport = useCallback(() => {
    const csv = onExport()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flight_history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [onExport])

  const handleImportFile = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onImport(ev.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [onImport])

  return (
    <div className="flex flex-col h-full" style={{ background: '#ffffff' }}>
      {/* Action buttons */}
      <div className="flex gap-2 p-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <button
          onClick={handleExport}
          style={BTN_SECONDARY}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        >
          Export CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={BTN_SECONDARY}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        >
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <th style={{ ...TH_STYLE, paddingLeft: 8 }}>Year</th>
              <th style={TH_STYLE}>From</th>
              <th style={TH_STYLE}>Via</th>
              <th style={TH_STYLE}>To</th>
              <th style={{ ...TH_STYLE, width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {rawRows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '6px 4px 6px 8px', color: '#a39e98' }}>{row.year}</td>
                <td style={{ padding: '6px 4px', color: 'rgba(0,0,0,0.95)' }}>{row.origin_city}</td>
                <td style={{ padding: '6px 4px', color: '#615d59' }}>{row.transfer_city || '—'}</td>
                <td style={{ padding: '6px 4px', color: 'rgba(0,0,0,0.95)' }}>{row.dest_city}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <button
                    onClick={() => onDelete(i)}
                    style={{
                      width: 18,
                      height: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 3,
                      color: '#a39e98',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#ef4444'
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#a39e98'
                      e.currentTarget.style.background = 'transparent'
                    }}
                    title="Delete flight"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rawRows.length === 0 && (
          <div className="p-4 text-center" style={{ fontSize: 12, color: '#a39e98' }}>
            No flights recorded.
          </div>
        )}
      </div>
    </div>
  )
}
