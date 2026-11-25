import { Button } from './ui/Button.jsx'
import { Scrubber } from './Scrubber.jsx'
import { PlayIcon, PauseIcon, ReplayIcon } from './ui/Icons.jsx'

const SPEEDS = [1, 2, 4]
const thisYear = new Date().getFullYear()

// Year as rolling digits in the monospace face: each digit slides to its value, and none shifts.
function RollingYear({ year }) {
  const digits = String(year).padStart(4, ' ').split('')
  return (
    <div className="num flex text-[25px] font-medium leading-none text-ink md:text-[31px]" aria-hidden="true">
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block h-[1em] w-[0.6em] overflow-hidden">
          <span
            className="absolute left-0 top-0 flex flex-col transition-transform duration-panel ease-out"
            style={{ transform: `translateY(${d === ' ' ? 0 : -Number(d)}em)` }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n} className="block h-[1em] text-center">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}

/** The dock under the globe: play, the year, a histogram you can scrub, and the playback speed. */
export function Timeline({ minYear, maxYear, perYear, firstCountries, life = [], year, onYear, playing, onToggle, speed, onSpeed, footer, dockRef, className = '', style }) {
  const planned = year > thisYear
  const finished = !playing && maxYear > minYear && year >= maxYear
  const nextSpeed = () => onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])
  const action = playing ? 'Pause timeline' : finished ? 'Replay timeline' : 'Play timeline'

  return (
    <section ref={dockRef} className={`panel p-3 md:px-4 ${className}`} style={style} aria-label="Timeline">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap md:gap-4">
        <Button variant="primary" size="icon" onClick={onToggle} aria-label={action} title={action} className="!h-12 !w-12">
          {playing ? <PauseIcon width={22} height={22} /> : finished ? <ReplayIcon width={22} height={22} /> : <PlayIcon width={22} height={22} />}
        </Button>

        <div className="relative">
          <RollingYear year={year} />
          <span className="sr-only" aria-live="polite">
            {year}
          </span>
          {planned && <span className="absolute -top-4 left-0 whitespace-nowrap text-[12px] text-muted">Planned trips</span>}
        </div>

        <button
          onClick={nextSpeed}
          className="num ml-auto h-9 min-w-[44px] px-2 text-[14px] text-muted transition-colors duration-fast ease-out hover:bg-surface hover:text-ink md:order-last md:ml-0"
          aria-label={`Playback speed ${speed}×. Change speed`}
        >
          {speed}×
        </button>

        <div className="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1">
          <Scrubber minYear={minYear} maxYear={maxYear} perYear={perYear} firstCountries={firstCountries} life={life} year={year} onYear={onYear} />
        </div>
      </div>
      {footer}
    </section>
  )
}
