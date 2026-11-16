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
export const PlusIcon = make(<path d="M10 4.5v11M4.5 10h11" />)
export const MinusIcon = make(<path d="M4.5 10h11" />)
export const CloseIcon = make(<path d="M5 5l10 10M15 5L5 15" />)
export const SearchIcon = make(
  <>
    <circle cx="9" cy="9" r="5" />
    <path d="M13 13l3.5 3.5" />
  </>,
)
export const TrashIcon = make(<path d="M4.5 6h11M8 6V4.5h4V6M6 6l.6 9h6.8l.6-9" />)
export const DownloadIcon = make(<path d="M10 4v8.5m0 0L6.5 9m3.5 3.5L13.5 9M4.5 15.5h11" />)
export const UploadIcon = make(<path d="M10 12.5V4m0 0L6.5 7.5M10 4l3.5 3.5M4.5 15.5h11" />)
export const ResetViewIcon = make(
  <>
    <circle cx="10" cy="10" r="5.5" />
    <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" />
  </>,
)
export const LayersIcon = make(
  <path d="M10 3.5l7 3.8-7 3.8-7-3.8zM3.5 10.6L10 14.2l6.5-3.6M3.5 13.8L10 17.4l6.5-3.6" />,
)
export const PanelIcon = make(
  <>
    <rect x="3" y="4" width="14" height="12" rx="2.5" />
    <path d="M12 4v12" />
  </>,
)
export const ChevronLeftIcon = make(<path d="M12 5l-5 5 5 5" />)
export const KeyboardIcon = make(
  <>
    <rect x="2.5" y="5.5" width="15" height="9" rx="2" />
    <path d="M6 9h.01M9 9h.01M12 9h.01M14.5 9h.01M6.5 12h7" />
  </>,
)
