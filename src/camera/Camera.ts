import type { CameraState, Point, Size } from '../types/geometry'

export const MIN_ZOOM = 0.08
export const MAX_ZOOM = 1.9

export class Camera {
  private state: CameraState

  constructor(initial: CameraState) {
    this.state = { ...initial }
  }

  get value(): Readonly<CameraState> {
    return this.state
  }

  pan(deltaX: number, deltaY: number): void {
    this.state.x += deltaX
    this.state.y += deltaY
  }

  zoomAt(nextZoom: number, pointer: Point, viewport: Size): void {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    const center = { x: viewport.width / 2, y: viewport.height / 2 }

    // Preserve the projected world point under the pointer while scale changes.
    const localX = (pointer.x - center.x - this.state.x) / this.state.zoom
    const localY = (pointer.y - center.y - this.state.y) / this.state.zoom
    this.state.x = pointer.x - center.x - localX * zoom
    this.state.y = pointer.y - center.y - localY * zoom
    this.state.zoom = zoom
  }

  reset(next: CameraState): void {
    this.state = { ...next }
  }
}
