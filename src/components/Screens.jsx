import { Button } from './ui/Button.jsx'

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
        <h1 className="display text-[28px]">Could not load the trips</h1>
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
      <div className="panel max-w-sm animate-rise rounded-panel p-6 text-center">
        <h2 className="display text-[32px] leading-tight">No trips for {name} yet</h2>
        <p className="mt-2 text-[14px] text-dim">Once some are added, their routes will draw themselves in.</p>
      </div>
    </div>
  )
}
