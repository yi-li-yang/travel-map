// Tabler outline icons at a 1.5px stroke, as the visual system asks. They inherit currentColor,
// so they stay in ink or muted. Callers pass width (and height) as before; it sets the size.
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRotate,
  IconPlus,
  IconMinus,
  IconX,
  IconFocusCentered,
  IconStack2,
  IconWorld,
  IconLayoutSidebarRight,
  IconChevronLeft,
} from '@tabler/icons-react'

const make = (Icon) =>
  function AppIcon({ width = 20, height, ...props }) {
    return <Icon size={width} stroke={1.5} aria-hidden="true" {...props} />
  }

export const PlayIcon = make(IconPlayerPlay)
export const PauseIcon = make(IconPlayerPause)
export const ReplayIcon = make(IconRotate)
export const PlusIcon = make(IconPlus)
export const MinusIcon = make(IconMinus)
export const CloseIcon = make(IconX)
export const ResetViewIcon = make(IconFocusCentered)
export const LayersIcon = make(IconStack2)
export const SpinIcon = make(IconWorld)
export const PanelIcon = make(IconLayoutSidebarRight)
export const ChevronLeftIcon = make(IconChevronLeft)
