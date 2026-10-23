import { worldToIso } from '../engine/isometric'
import type { CameraState, Point, Size } from '../types/geometry'
import type { Room } from '../types/world'
import { getRoomArtwork } from '../assets/rooms/manifest'
import { MIN_ZOOM } from './Camera'

interface ScreenBounds {
  min: Point
  max: Point
}

function getWorldBounds(rooms: readonly Room[]): ScreenBounds {
  const points = rooms.flatMap((room) => {
    if (room.artwork) {
      const { base } = getRoomArtwork(room.artwork.assetId)
      const origin = worldToIso(room.origin)
      if (base.clipPolygon) {
        return base.clipPolygon.map((point) => ({
          x: origin.x + base.offset.x + point.x * (base.scale ?? 1),
          y: origin.y + base.offset.y + point.y * (base.scale ?? 1),
        }))
      }
      return [
        { x: origin.x + base.offset.x, y: origin.y + base.offset.y },
        { x: origin.x + base.offset.x + base.displayWidth, y: origin.y + base.offset.y + base.displayHeight },
      ]
    }
    const { x, y } = room.origin
    const maxX = x + room.width
    const maxY = y + room.depth
    return [
      worldToIso({ x, y, z: room.wallHeight }),
      worldToIso({ x: maxX, y, z: room.wallHeight }),
      worldToIso({ x, y: maxY, z: room.wallHeight }),
      worldToIso({ x: maxX, y: maxY, z: 0 }),
      worldToIso({ x, y, z: 0 }),
      worldToIso({ x: maxX, y, z: 0 }),
      worldToIso({ x, y: maxY, z: 0 }),
    ]
  })

  return points.reduce<ScreenBounds>((bounds, point) => ({
    min: { x: Math.min(bounds.min.x, point.x), y: Math.min(bounds.min.y, point.y) },
    max: { x: Math.max(bounds.max.x, point.x), y: Math.max(bounds.max.y, point.y) },
  }), {
    min: { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
    max: { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
  })
}

export function fitCameraToRooms(viewport: Size, rooms: readonly Room[]): CameraState {
  if(!rooms.length)return {x:0,y:0,zoom:.6}
  const bounds = getWorldBounds(rooms)
  const width = Math.max(1, bounds.max.x - bounds.min.x)
  const height = Math.max(1, bounds.max.y - bounds.min.y)
  const horizontalPadding = viewport.width < 600 ? 20 : 100
  // Reserve screen-space room for the labels below the artwork, including the bottom room.
  const verticalPadding = 96
  const zoom = Math.min(
    0.86,
    Math.max(MIN_ZOOM, (viewport.width - horizontalPadding) / width),
    Math.max(MIN_ZOOM, (viewport.height - verticalPadding) / height),
  )
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
  }

  return {
    x: -center.x * zoom,
    y: -center.y * zoom,
    zoom,
  }
}
