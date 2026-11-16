import { useEffect, useRef } from 'react'
import { Button } from './ui/Button.jsx'
import { CloseIcon } from './ui/Icons.jsx'

/** Covers the app until the data and the globe are ready, then fades away. */
export function LoadingScreen({ visible, message }) {
  return (
    <div
      className={`fixed inset-0 z-40 grid place-items-center bg-space transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center gap-5">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <circle cx="36" cy="36" r="30" stroke="rgba(143,211,255,0.25)" strokeWidth="1.5" />
          <ellipse cx="36" cy="36" rx="13" ry="30" stroke="rgba(143,211,255,0.25)" strokeWidth="1.5" />
          <path d="M6 36h60" stroke="rgba(143,211,255,0.25)" strokeWidth="1.5" />
          <g style={{ transformOrigin: '36px 36px', animation: 'spin 1.8s linear infinite' }}>
            <circle cx="36" cy="6" r="3.2" fill="#ffb454" />
          </g>
        </svg>
        <p className="display text-[22px] text-dim">{message}</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-space p-6">
      <div className="panel max-w-sm rounded-panel p-6 text-center">
        <h1 className="display text-[28px]">Could not load your flights</h1>
        <p className="mt-2 text-[14px] text-dim">{message}</p>
        <Button variant="primary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

export function WebglError() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="panel max-w-sm rounded-panel p-6 text-center">
        <h2 className="display text-[26px]">The globe needs WebGL</h2>
        <p className="mt-2 text-[14px] text-dim">
          Your browser could not start 3D graphics. Turn on hardware acceleration or try another browser. Your flights are
          still available in the Flights tab.
        </p>
      </div>
    </div>
  )
}

/** Shown on the globe when there is nothing to draw yet. */
export function EmptyHero({ onAdd, onImport, className = '', style }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 grid place-items-center p-6 ${className}`} style={style}>
      <div className="panel pointer-events-auto max-w-sm animate-rise rounded-panel p-6 text-center">
        <h2 className="display text-[32px] leading-tight">Your globe is empty</h2>
        <p className="mt-2 text-[14px] text-dim">Add a flight, or import a CSV you exported before. Routes will draw themselves in.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={onAdd}>
            Add a flight
          </Button>
          <Button onClick={onImport}>Import CSV</Button>
        </div>
      </div>
    </div>
  )
}

/** Small modal. Escape or the backdrop closes it, and focus starts on the first button. */
function Modal({ title, onClose, children, labelledBy }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('button')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="panel w-full max-w-sm animate-rise rounded-panel p-5" style={{ background: 'rgba(14,21,38,0.96)' }}>
        {children}
      </div>
    </div>
  )
}

export function ImportDialog({ pending, currentCount, onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} labelledBy="import-title">
      <h2 id="import-title" className="display text-[26px]">
        Replace your flights?
      </h2>
      <p className="mt-2 text-[14px] text-dim">
        <span className="text-fg">{pending.fileName}</span> has {pending.rows.length} {pending.rows.length === 1 ? 'flight' : 'flights'}. Importing replaces
        the {currentCount} you have now.
        {pending.skipped > 0 && ` ${pending.skipped} rows were left out because the year or an airport code was not recognised.`}
      </p>
      <p className="mt-2 text-[13px] text-dim">Export first if you want to keep a copy of the current list.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onConfirm}>
          Replace with imported flights
        </Button>
      </div>
    </Modal>
  )
}

const SHORTCUTS = [
  ['Space', 'Play or pause the timeline'],
  ['← →', 'Previous or next year with flights'],
  ['Esc', 'Clear the selection'],
  ['[', 'Show or hide the side panel'],
  ['?', 'Show this list'],
]

export function ShortcutsHelp({ onClose }) {
  return (
    <Modal onClose={onClose} labelledBy="keys-title">
      <div className="flex items-start justify-between">
        <h2 id="keys-title" className="display text-[26px]">
          Keyboard shortcuts
        </h2>
        <Button variant="quiet" size="iconSm" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </Button>
      </div>
      <dl className="mt-3 space-y-2.5">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-[14px]">
            <dt className="text-dim">{d}</dt>
            <dd>
              <kbd className="rounded-md bg-white/[0.1] px-2 py-0.5 font-sans text-[12.5px]">{k}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
