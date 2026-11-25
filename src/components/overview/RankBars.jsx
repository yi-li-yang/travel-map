import { Section } from './parts.jsx'
import { previewProps } from '../../utils/preview.js'

/**
 * A short leaderboard: each row is a bar as long as its count. Hover previews it on the globe, click opens it.
 * `items`: [{ key, label, n, onClick, preview }]
 */
export function RankBars({ title, items, onPreview, color = 'bg-flight' }) {
  if (!items.length) return null
  const top = items[0].n
  return (
    <Section title={title}>
      <ol className="-mx-2">
        {items.map((it) => (
          <li key={it.key}>
            <button
              onClick={it.onClick}
              {...previewProps(onPreview, it.preview)}
              className="flex w-full flex-col gap-1 px-2 py-2 text-left text-[14px] transition-colors duration-fast ease-out hover:bg-surface"
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{it.label}</span>
                <span className="num shrink-0 text-muted">×{it.n}</span>
              </span>
              <span className="block h-1 w-full bg-rule" aria-hidden="true">
                <span className={`block h-full transition-[width] duration-panel ease-out ${color}`} style={{ width: `${(it.n / top) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  )
}
