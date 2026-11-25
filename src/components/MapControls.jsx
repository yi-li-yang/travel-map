import { Button } from './ui/Button.jsx'
import { PlusIcon, MinusIcon, ResetViewIcon, LayersIcon, SpinIcon } from './ui/Icons.jsx'

export function MapControls({ onZoomIn, onZoomOut, onReset, basemap, onToggleBasemap, spinning, onToggleSpin, className = '', style }) {
  const sat = basemap === 'satellite'
  // A pressed toggle reads as pressed in shape as well as colour: a recessed square with an edge.
  const on = '!bg-ground !text-ink ring-1 ring-inset ring-edge'
  return (
    <div className={`panel flex flex-col ${className}`} style={style} role="group" aria-label="Map controls">
      <Button variant="quiet" size="icon" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <PlusIcon />
      </Button>
      <Button variant="quiet" size="icon" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <MinusIcon />
      </Button>
      <Button variant="quiet" size="icon" onClick={onReset} aria-label="Reset view" title="Reset view">
        <ResetViewIcon />
      </Button>
      {onToggleSpin && (
        <Button
          variant="quiet"
          size="icon"
          onClick={onToggleSpin}
          aria-pressed={spinning}
          aria-label={spinning ? 'Stop turning the globe' : 'Turn the globe slowly'}
          title={spinning ? 'Stop turning' : 'Turn slowly'}
          className={spinning ? on : ''}
        >
          <SpinIcon />
        </Button>
      )}
      <Button
        variant="quiet"
        size="icon"
        onClick={onToggleBasemap}
        aria-pressed={sat}
        aria-label={sat ? 'Switch to the night map' : 'Switch to satellite imagery'}
        title={sat ? 'Night map' : 'Satellite'}
        className={sat ? on : ''}
      >
        <LayersIcon />
      </Button>
    </div>
  )
}
