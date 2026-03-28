import { useCallback, useRef } from 'react'

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
    <div className="flex flex-col h-full">
      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-b" style={{ borderColor: '#1e293b' }}>
        <button
          onClick={handleExport}
          className="flex-1 text-xs py-1.5 px-2 rounded border transition-colors"
          style={{ borderColor: '#334155', color: '#94a3b8', background: 'transparent' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Export CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 text-xs py-1.5 px-2 rounded border transition-colors"
          style={{ borderColor: '#334155', color: '#94a3b8', background: 'transparent' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <th className="text-left py-2 px-2 font-medium" style={{ color: '#475569' }}>Year</th>
              <th className="text-left py-2 px-1 font-medium" style={{ color: '#475569' }}>From</th>
              <th className="text-left py-2 px-1 font-medium" style={{ color: '#475569' }}>Via</th>
              <th className="text-left py-2 px-1 font-medium" style={{ color: '#475569' }}>To</th>
              <th className="py-2 px-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {rawRows.map((row, i) => (
              <tr
                key={i}
                className="border-b"
                style={{ borderColor: '#0f172a' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#0f172a'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td className="py-1.5 px-2" style={{ color: '#64748b' }}>{row.year}</td>
                <td className="py-1.5 px-1" style={{ color: '#cbd5e1' }}>{row.origin_city}</td>
                <td className="py-1.5 px-1" style={{ color: '#818cf8' }}>{row.transfer_city || '—'}</td>
                <td className="py-1.5 px-1" style={{ color: '#cbd5e1' }}>{row.dest_city}</td>
                <td className="py-1.5 px-1 text-center">
                  <button
                    onClick={() => onDelete(i)}
                    className="w-4 h-4 text-xs flex items-center justify-center rounded hover:bg-red-900 transition-colors"
                    style={{ color: '#475569' }}
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
          <div className="p-4 text-xs text-center" style={{ color: '#334155' }}>
            No flights recorded.
          </div>
        )}
      </div>
    </div>
  )
}
