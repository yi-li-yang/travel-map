import { useEffect, useRef } from 'react'
import { Tabs } from './ui/Tabs.jsx'
import { Button } from './ui/Button.jsx'
import { CloseIcon } from './ui/Icons.jsx'

export const DRAWER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'flights', label: 'Flights' },
  { id: 'add', label: 'Add flight' },
]

/**
 * Right-hand panel on desktop, bottom sheet on phones.
 * Stays mounted while closed so scroll position and form input survive.
 */
export function Drawer({ open, desktop, tab, scrollKey, onTab, onClose, children }) {
  const scroller = useRef(null)
  // Each tab or selection starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab, scrollKey])

  const hiddenTransform = desktop ? 'translateX(calc(100% + 24px))' : 'translateY(105%)'
  const style = {
    transform: open ? 'none' : hiddenTransform,
    visibility: open ? 'visible' : 'hidden',
    transition: `transform 320ms cubic-bezier(.2,.8,.2,1), visibility 0s linear ${open ? '0s' : '320ms'}`,
  }
  const placement = desktop
    ? 'right-4 top-4 bottom-4 w-[var(--drawer-w)] rounded-panel'
    : 'inset-x-0 bottom-0 h-[60dvh] rounded-t-panel'

  return (
    <aside
      className={`panel absolute z-30 flex flex-col overflow-hidden ${placement}`}
      style={style}
      aria-label="Flight details"
    >
      {!desktop && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden="true" />}
      <div className="flex shrink-0 items-center gap-2 p-3 pb-4">
        <div className="min-w-0 flex-1">
          <Tabs tabs={DRAWER_TABS} value={tab} onChange={onTab} label="Panel sections" idPrefix="drawer" />
        </div>
        <Button variant="quiet" size="icon" onClick={onClose} aria-label="Close panel" aria-expanded={open}>
          <CloseIcon />
        </Button>
      </div>
      <div
        ref={scroller}
        role="tabpanel"
        id="drawer-panel"
        aria-labelledby={`drawer-${tab}`}
        className="scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
      >
        {children}
      </div>
    </aside>
  )
}
