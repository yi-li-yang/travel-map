// Small inline icons on a 20px grid. Stroke-based so they inherit currentColor.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const make = (children) =>
  function Icon(props) {
    return (
      <svg {...base} {...props}>
        {children}
      </svg>
    )
  }

export const PlayIcon = make(<path d="M6.5 4.5v11l9-5.5z" fill="currentColor" stroke="none" />)
export const PauseIcon = make(
  <>
    <rect x="5.5" y="4.5" width="3.2" height="11" rx="1" fill="currentColor" stroke="none" />
    <rect x="11.3" y="4.5" width="3.2" height="11" rx="1" fill="currentColor" stroke="none" />
  </>,
)
export const ReplayIcon = make(<path d="M4.6 10a5.4 5.4 0 1 0 1.7-3.9M4.4 3.6v3.3h3.3" />)
export const PlusIcon = make(<path d="M10 4.5v11M4.5 10h11" />)
export const MinusIcon = make(<path d="M4.5 10h11" />)
export const CloseIcon = make(<path d="M5 5l10 10M15 5L5 15" />)
export const ResetViewIcon = make(
  <>
    <circle cx="10" cy="10" r="5.5" />
    <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" />
  </>,
)
export const LayersIcon = make(
  <path d="M10 3.5l7 3.8-7 3.8-7-3.8zM3.5 10.6L10 14.2l6.5-3.6M3.5 13.8L10 17.4l6.5-3.6" />,
)
export const SpinIcon = make(
  <>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M3.5 10h13M10 3.5c2.4 2 2.4 11 0 13M10 3.5c-2.4 2-2.4 11 0 13" />
  </>,
)
export const PanelIcon = make(
  <>
    <rect x="3" y="4" width="14" height="12" rx="2.5" />
    <path d="M12 4v12" />
  </>,
)
export const ChevronLeftIcon = make(<path d="M12 5l-5 5 5 5" />)
