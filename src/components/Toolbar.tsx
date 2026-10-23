interface ToolbarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function Toolbar({ zoom, onZoomIn, onZoomOut, onReset }: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="Camera controls">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">+</button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out">−</button>
      <div className="toolbar-divider" />
      <button className="reset-button" type="button" onClick={onReset} aria-label="Reset camera">↺</button>
      <output className="zoom-readout" aria-label="Current zoom">{Math.round(zoom * 100)}%</output>
    </div>
  )
}
