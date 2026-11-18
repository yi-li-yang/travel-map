import { Section } from './parts.jsx'
import { previewProps } from '../../utils/preview.js'

/**
 * A short leaderboard: each row is a bar as long as its count. Hover previews it on the globe, click opens it.
 * `items`: [{ key, label, n, onClick, preview }]
 */
export function RankBars({ title, items, onPreview }) {
  if (!items.length) return null
  const top = items[0].n
  return (
    <Section title={title}>
      <ol className="-mx-2 space-y-0.5">
        {items.map((it) => (
          <li key={it.key}>
            <button
              onClick={it.onClick}
              {...previewProps(onPreview, it.preview)}
              className="relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.06]"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-md bg-route/[0.13] transition-[width] duration-700"
                style={{ width: `${(it.n / top) * 100}%` }}
                aria-hidden="true"
              />
              <span className="relative min-w-0 truncate">{it.label}</span>
              <span className="relative shrink-0 text-dim">×{it.n}</span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  )
}
