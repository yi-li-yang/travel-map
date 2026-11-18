import { useLayoutEffect, useState } from 'react'

/**
 * How much of the screen's height the bottom dock takes, from its top edge to the bottom of the viewport.
 * That includes its own margin and any safe-area padding, so the globe can keep clear of all of it.
 * 0 until the element has been measured.
 */
export function useDockSpace(element) {
  const [space, setSpace] = useState(0)
  useLayoutEffect(() => {
    if (!element) return undefined
    const measure = () => setSpace(Math.round(window.innerHeight - element.getBoundingClientRect().top))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [element])
  return space
}
