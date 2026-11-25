import { useRef } from 'react'

// Accessible tab list: arrow keys move between tabs, Home/End jump to the ends.
// The selected tab carries the accent as a 2px rule under its label.
export function Tabs({ tabs, value, onChange, label = 'Sections', idPrefix = 'tab' }) {
  const refs = useRef({})

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === value)
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next === null) return
    e.preventDefault()
    const id = tabs[next].id
    onChange(id)
    refs.current[id]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-6 border-b border-rule">
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[t.id] = el)}
            role="tab"
            id={`${idPrefix}-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`-mb-px h-10 border-b-2 text-[14px] font-medium transition-colors duration-fast ease-out ${
              active ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
