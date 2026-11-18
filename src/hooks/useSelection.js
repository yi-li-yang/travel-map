import { useCallback, useState } from 'react'

// A selection is { type: 'city', code } or { type: 'route', routeKeys, tripId? }.
// `back` is the selection to return to, set when you open something from inside a panel.
const MAX_BACK = 3

function trimBack(sel, depth = MAX_BACK) {
  return { ...sel, back: depth > 0 && sel.back ? trimBack(sel.back, depth - 1) : null }
}

export const selectionKey = (sel) => {
  if (!sel) return ''
  return sel.type === 'city' ? `city:${sel.code}` : `route:${sel.tripId ?? sel.routeKeys.join(',')}`
}

export function useSelection() {
  const [selected, setSelected] = useState(null)

  // `keepBack`: this was opened from a panel, so Back returns there instead of to the overview.
  const select = useCallback((sel, { keepBack = false } = {}) => {
    setSelected((current) => (sel ? { ...sel, back: keepBack && current ? trimBack(current) : null } : null))
  }, [])
  const back = useCallback(() => setSelected((current) => current?.back ?? null), [])
  const clear = useCallback(() => setSelected(null), [])

  return { selected, select, back, clear }
}
