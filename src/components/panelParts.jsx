import { Button } from './ui/Button.jsx'
import { ChevronLeftIcon } from './ui/Icons.jsx'

/** Back to wherever the person came from: the overview, or the city or trip they were just looking at. */
export function Back({ onClick, label = 'Overview' }) {
  return (
    <Button variant="quiet" size="sm" onClick={onClick} className="-ml-2 mb-3 max-w-full">
      <ChevronLeftIcon width={16} height={16} className="shrink-0" /> <span className="truncate">{label}</span>
    </Button>
  )
}

export function Stat({ value, label }) {
  return (
    <div>
      <div className="num text-[25px] leading-none">{value}</div>
      <div className="mt-2 text-[12px] text-muted">{label}</div>
    </div>
  )
}
