import { useEffect, useState } from 'react'

// Subscribe to a CSS media query, e.g. useMedia('(min-width: 768px)').
export function useMedia(query, fallback = false) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : fallback)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
