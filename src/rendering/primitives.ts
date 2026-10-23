import { worldToIso } from '../engine/isometric'
import type { Point, WorldPoint } from '../types/geometry'

export interface BoxStyle {
  top: string
  left: string
  right: string
  stroke?: string
}

export function polygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  fill: string,
  stroke?: string,
  lineWidth = 1,
): void {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

export function isoPolygon(
  ctx: CanvasRenderingContext2D,
  points: WorldPoint[],
  fill: string,
  stroke?: string,
  lineWidth?: number,
): void {
  polygon(ctx, points.map((point) => worldToIso(point)), fill, stroke, lineWidth)
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  style: BoxStyle,
): void {
  const topZ = z + height
  isoPolygon(ctx, [
    { x, y, z: topZ },
    { x: x + width, y, z: topZ },
    { x: x + width, y: y + depth, z: topZ },
    { x, y: y + depth, z: topZ },
  ], style.top, style.stroke ?? '#2f4747', 1.15)
  isoPolygon(ctx, [
    { x: x + width, y, z },
    { x: x + width, y: y + depth, z },
    { x: x + width, y: y + depth, z: topZ },
    { x: x + width, y, z: topZ },
  ], style.right, style.stroke ?? '#2f4747', 1.15)
  isoPolygon(ctx, [
    { x, y: y + depth, z },
    { x: x + width, y: y + depth, z },
    { x: x + width, y: y + depth, z: topZ },
    { x, y: y + depth, z: topZ },
  ], style.left, style.stroke ?? '#2f4747', 1.15)
}

export function drawIsoEllipse(
  ctx: CanvasRenderingContext2D,
  center: WorldPoint,
  radiusX: number,
  radiusY: number,
  fill: string,
  stroke?: string,
): void {
  const point = worldToIso(center)
  ctx.beginPath()
  ctx.ellipse(point.x, point.y, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.1
    ctx.stroke()
  }
}
