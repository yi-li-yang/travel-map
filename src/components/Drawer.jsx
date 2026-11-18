import { useEffect, useRef } from 'react'
import { Tabs } from './ui/Tabs.jsx'
import { Button } from './ui/Button.jsx'
import { CloseIcon } from './ui/Icons.jsx'

export const DRAWER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trips', label: 'Trips' },
]

// How much of the screen the phone sheet covers: "half" to read, "peek" to keep the globe in view.
export const SHEET_HEIGHT = { half: 0.6, peek: 0.34 }

const DRAG_PX = 36

/**
 * Right-hand panel on desktop, bottom sheet on phones. Drag the handle to resize or dismiss the sheet.
 */
export function Drawer({ open, desktop, tab, scrollKey, snap = 'half', onSnap, onTab, onClose, children }) {
  const scroller = useRef(null)
  const drag = useRef({ startY: 0, moved: false })
  // Each tab or selection starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab, scrollKey])

  const hiddenTransform = desktop ? 'translateX(calc(100% + 24px))' : 'translateY(105%)'
  const style = {
    transform: open ? 'none' : hiddenTransform,
    visibility: open ? 'visible' : 'hidden',
    transition: `transform 320ms cubic-bezier(.2,.8,.2,1), height 280ms cubic-bezier(.2,.8,.2,1), visibility 0s linear ${open ? '0s' : '320ms'}`,
    ...(desktop ? null : { height: `${SHEET_HEIGHT[snap] * 100}dvh` }),
  }
  const placement = desktop ? 'right-4 top-4 bottom-4 w-[var(--drawer-w)] rounded-panel' : 'inset-x-0 bottom-0 rounded-t-panel'

  const handle = {
    onPointerDown: (e) => {
      drag.current = { startY: e.clientY, moved: false }
      try {
        e.currentTarget.setPointerCapture(e.pointerId) // keep receiving moves when the finger leaves the handle
      } catch {
        /* the pointer is already gone: the drag just ends sooner */
      }
    },
    onPointerUp: (e) => {
      const dy = e.clientY - drag.current.startY
      if (Math.abs(dy) < DRAG_PX) return
      drag.current.moved = true
      if (dy < 0) onSnap('half')
      else if (snap === 'half') onSnap('peek')
      else onClose()
    },
    onClick: () => {
      // A drag ends with a click too; only a plain tap (or Enter) toggles the height.
      if (drag.current.moved) {
        drag.current.moved = false
        return
      }
      onSnap(snap === 'half' ? 'peek' : 'half')
    },
  }

  return (
    <aside className={`panel absolute z-30 flex flex-col overflow-hidden ${placement}`} style={style} aria-label="Trip details">
      {!desktop && (
        <button
          type="button"
          {...handle}
          className="mx-auto flex h-7 w-24 shrink-0 touch-none items-center justify-center"
          aria-label={snap === 'half' ? 'Make the panel smaller' : 'Make the panel larger'}
        >
          <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
        </button>
      )}
      <div className={`flex shrink-0 items-center gap-2 p-3 pb-4 ${desktop ? '' : 'pt-0'}`}>
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
