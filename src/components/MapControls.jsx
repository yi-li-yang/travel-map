import { Button } from './ui/Button.jsx'
import { PlusIcon, MinusIcon, ResetViewIcon, LayersIcon } from './ui/Icons.jsx'

export function MapControls({ onZoomIn, onZoomOut, onReset, basemap, onToggleBasemap, className = '', style }) {
  const sat = basemap === 'satellite'
  return (
    <div className={`panel flex flex-col rounded-2xl p-1 ${className}`} style={style} role="group" aria-label="Map controls">
      <Button variant="quiet" size="icon" onClick={onZoomIn} aria-label="Zoom in">
        <PlusIcon />
      </Button>
      <Button variant="quiet" size="icon" onClick={onZoomOut} aria-label="Zoom out">
        <MinusIcon />
      </Button>
      <Button variant="quiet" size="icon" onClick={onReset} aria-label="Reset view" title="Reset view">
        <ResetViewIcon />
      </Button>
      <Button
        variant="quiet"
        size="icon"
        onClick={onToggleBasemap}
        aria-pressed={sat}
        aria-label={sat ? 'Switch to the night map' : 'Switch to satellite imagery'}
        title={sat ? 'Night map' : 'Satellite'}
        className={sat ? '!bg-white/[0.12] !text-route' : ''}
      >
        <LayersIcon />
      </Button>
    </div>
  )
}
