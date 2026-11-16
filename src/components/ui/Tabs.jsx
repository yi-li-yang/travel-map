import { useRef } from 'react'

// Accessible tab list: arrow keys move between tabs, Home/End jump to the ends.
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
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 rounded-xl bg-white/[0.05] p-1">
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
            className={`h-9 flex-1 rounded-lg text-[13px] font-medium transition-colors ${
              active ? 'bg-white/[0.12] text-fg' : 'text-dim hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
