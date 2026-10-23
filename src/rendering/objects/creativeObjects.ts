import { worldToIso } from '../../engine/isometric'
import type { RoomObject } from '../../types/world'
import { drawBox, isoPolygon } from '../primitives'
import { shadeColor } from './objectUtils'

export function renderCreativeObject(ctx: CanvasRenderingContext2D, object: RoomObject): boolean {
  switch (object.kind) {
    case 'drawingBoard': drawDrawingBoard(ctx, object); return true
    case 'canvas': drawCanvas(ctx, object); return true
    default: return false
  }
}

function drawDrawingBoard(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const paper = object.tint ?? '#f1dfbf'
  const accent = object.secondaryTint ?? '#df7557'
  drawBox(ctx, x, y, z, 2.15, 1.35, 0.11, {
    top: paper, left: shadeColor(paper, -36), right: shadeColor(paper, -22),
  })
  isoPolygon(ctx, [
    { x: x + 0.22, y: y + 0.2, z: z + 0.12 }, { x: x + 1.92, y: y + 0.2, z: z + 0.12 },
    { x: x + 1.92, y: y + 1.12, z: z + 0.12 }, { x: x + 0.22, y: y + 1.12, z: z + 0.12 },
  ], '#f7ecd5', '#b89c7e', 0.7)
  const start = worldToIso({ x: x + 0.5, y: y + 0.46, z: z + 0.14 })
  ctx.strokeStyle = accent
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.bezierCurveTo(start.x + 18, start.y - 10, start.x + 35, start.y + 14, start.x + 54, start.y - 2)
  ctx.stroke()
  ctx.fillStyle = '#5aa494'
  ctx.fillRect(start.x + 17, start.y + 10, 23, 3)
}

function drawCanvas(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const base = object.tint ?? '#f0ca78'
  const accent = object.secondaryTint ?? '#62a497'
  drawBox(ctx, x + 0.08, y + 0.16, z, 0.12, 0.12, 2.05, {
    top: '#725a50', left: '#4b4142', right: '#5a4947',
  })
  drawBox(ctx, x + 1.15, y + 0.16, z, 0.12, 0.12, 2.05, {
    top: '#725a50', left: '#4b4142', right: '#5a4947',
  })
  isoPolygon(ctx, [
    { x, y, z: z + 0.35 }, { x: x + 1.35, y, z: z + 0.35 },
    { x: x + 1.35, y, z: z + 1.95 }, { x, y, z: z + 1.95 },
  ], '#f6e6c7', '#6c5350', 1.2)
  const marker = worldToIso({ x: x + 0.34, y: y - 0.02, z: z + 1.28 })
  if (object.variant === 'sun') {
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.arc(marker.x + 12, marker.y + 5, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(marker.x - 5, marker.y + 20, 46, 16)
  } else {
    ctx.fillStyle = base
    ctx.fillRect(marker.x - 4, marker.y - 5, 25, 21)
    ctx.fillStyle = accent
    ctx.fillRect(marker.x + 17, marker.y + 10, 26, 22)
  }
}
