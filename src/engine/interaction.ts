import type { Camera } from '../camera/Camera'
import type { Point, Size } from '../types/geometry'
import type { Room } from '../types/world'
import { sortByDepth } from './depth'
import { isoToWorld, worldToIso } from './isometric'
import { getRoomArtwork } from '../assets/rooms/manifest'

export function canvasToWorld(point: Point, viewport: Size, camera: Camera): Point {
  const state = camera.value
  return isoToWorld({
    x: (point.x - viewport.width / 2 - state.x) / state.zoom,
    y: (point.y - viewport.height / 2 - state.y) / state.zoom,
  })
}

export function hitTestRoom(point: Point, room: Room): boolean {
  const artwork = room.artwork && getRoomArtwork(room.artwork.assetId)
  if (artwork?.hitPolygon) {
    const projected = worldToIso({ x: point.x - room.origin.x, y: point.y - room.origin.y })
    const px = (projected.x - artwork.base.offset.x) / (artwork.base.scale ?? 1)
    const py = (projected.y - artwork.base.offset.y) / (artwork.base.scale ?? 1)
    const vertices = artwork.hitPolygon
    let inside = false
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[i], b = vertices[j]
      if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  const localX = point.x - room.origin.x
  const localY = point.y - room.origin.y
  return localX >= 0 && localX <= room.width && localY >= 0 && localY <= room.depth
}

export function findTopRoomAtPoint(point: Point, rooms: readonly Room[]): Room | undefined {
  return sortByDepth(rooms, (room) => ({
    anchor: {
      x: room.origin.x + room.width,
      y: room.origin.y + room.depth,
      z: 0,
    },
  }))
    .reverse()
    .find((room) => hitTestRoom(point, room))
}
