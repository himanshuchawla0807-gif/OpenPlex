import type { IsoConfig, Point, WorldPoint } from '../types/geometry'

export const ISO_CONFIG: IsoConfig = {
  tileWidth: 80,
  tileHeight: 40,
}

export function worldToIso(point: WorldPoint, config = ISO_CONFIG): Point {
  const z = point.z ?? 0
  return {
    x: (point.x - point.y) * (config.tileWidth / 2),
    y: (point.x + point.y) * (config.tileHeight / 2) - z * config.tileHeight,
  }
}

export function isoToWorld(point: Point, config = ISO_CONFIG): Point {
  return {
    x: point.x / config.tileWidth + point.y / config.tileHeight,
    y: point.y / config.tileHeight - point.x / config.tileWidth,
  }
}
