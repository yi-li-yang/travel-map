import { useEffect, useState } from 'react'

const SHOW_MS = 4200

function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // The timer restarts after the pointer or focus leaves, so a message you are reading stays.
  useEffect(() => {
    if (paused || leaving) return undefined
    const id = setTimeout(() => setLeaving(true), SHOW_MS)
    return () => clearTimeout(id)
  }, [paused, leaving])

  return (
    <div
      className={`panel pointer-events-auto rounded-xl px-4 py-2 text-[13px] ${leaving ? 'animate-sink' : 'animate-rise'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onAnimationEnd={() => leaving && onDismiss(toast.id)}
    >
      {toast.text}
    </div>
  )
}

// Short messages, announced politely to screen readers.
export function Toasts({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
