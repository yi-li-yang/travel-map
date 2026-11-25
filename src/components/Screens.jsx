import { Button } from './ui/Button.jsx'

/** Covers the app until the data and the globe are ready, then fades away. */
export function LoadingScreen({ visible, message }) {
  return (
    <div
      className={`fixed inset-0 z-40 grid place-items-center bg-ground transition-opacity duration-panel ease-out ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center gap-5">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <circle cx="36" cy="36" r="30" stroke="var(--rule)" strokeWidth="1.5" />
          <ellipse cx="36" cy="36" rx="13" ry="30" stroke="var(--rule)" strokeWidth="1.5" />
          <path d="M6 36h60" stroke="var(--rule)" strokeWidth="1.5" />
          <g style={{ transformOrigin: '36px 36px', animation: 'spin 1.8s linear infinite' }}>
            <circle cx="36" cy="6" r="3.2" fill="var(--signal)" />
          </g>
        </svg>
        <p className="text-[16px] text-muted">{message}</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ground p-6">
      <div className="panel max-w-sm p-6">
        <h1 className="text-[25px] font-semibold leading-[1.15]">Could not load the trips</h1>
        <p className="mt-2 text-[14px] text-muted">{message}</p>
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
      <div className="panel max-w-sm p-6">
        <h2 className="text-[25px] font-semibold leading-[1.15]">The globe needs WebGL</h2>
        <p className="mt-2 text-[14px] text-muted">
          Your browser could not start 3D graphics. Turn on hardware acceleration or try another browser. The trips are
          still listed in the Trips tab.
        </p>
      </div>
    </div>
  )
}

/** Shown on the globe when there is nothing to draw yet. */
export function EmptyHero({ name, className = '', style }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 grid place-items-center p-6 ${className}`} style={style}>
      <div className="panel max-w-sm animate-rise p-6">
        <h2 className="text-[25px] font-semibold leading-[1.15]">No trips for {name} yet</h2>
        <p className="mt-2 text-[14px] text-muted">Once some are added, their routes will draw themselves in.</p>
      </div>
    </div>
  )
}
