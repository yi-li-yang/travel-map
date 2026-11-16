import { Button } from './Button.jsx'

// Short messages, announced politely to screen readers. Actions (like Undo) are real buttons.
export function Toasts({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="panel pointer-events-auto flex animate-rise items-center gap-3 rounded-xl py-2 pl-4 pr-2 text-[13px]"
        >
          <span>{t.text}</span>
          {t.action && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                t.action.run()
                onDismiss(t.id)
              }}
            >
              {t.action.label}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
