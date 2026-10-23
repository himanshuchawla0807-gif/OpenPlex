import type { AnimationState } from '../../engine/animation'
import { worldToIso } from '../../engine/isometric'
import type { RoomObject } from '../../types/world'
import { drawBox, drawIsoEllipse, isoPolygon, polygon } from '../primitives'
import { OBJECT_OUTLINE, shadeColor } from './objectUtils'

export function renderMusicObject(
  ctx: CanvasRenderingContext2D,
  object: RoomObject,
  animation: AnimationState,
): boolean {
  switch (object.kind) {
    case 'speaker': drawSpeaker(ctx, object, animation); return true
    case 'microphone': drawMicrophone(ctx, object, animation); return true
    case 'headphones': drawHeadphones(ctx, object); return true
    case 'synth': drawSynth(ctx, object, animation); return true
    case 'acousticPanel': drawAcousticPanel(ctx, object); return true
    default: return false
  }
}

function drawSpeaker(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#39445f'
  drawBox(ctx, x, y, z, 0.72, 0.62, 1.35, {
    top: shadeColor(color, 15), left: shadeColor(color, -28), right: color,
  })
  const lower = worldToIso({ x: x + 0.36, y: y + 0.635, z: z + 0.42 })
  const upper = worldToIso({ x: x + 0.36, y: y + 0.635, z: z + 0.98 })
  const pulse = 9 + animation.speakerPulse * 2.6
  ctx.fillStyle = '#182238'
  ctx.strokeStyle = object.secondaryTint ?? '#6fc9ce'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(lower.x, lower.y, pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(upper.x, upper.y, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawMicrophone(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#d88976'
  drawIsoEllipse(ctx, { x: x + 0.4, y: y + 0.4, z }, 20, 8, '#394455', OBJECT_OUTLINE)
  const base = worldToIso({ x: x + 0.4, y: y + 0.4, z })
  const head = worldToIso({ x: x + 0.4, y: y + 0.4, z: z + 2.25 })
  ctx.strokeStyle = '#2b3946'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.lineTo(head.x, head.y + 12)
  ctx.stroke()
  ctx.save()
  ctx.translate(head.x, head.y)
  ctx.rotate(-0.2)
  ctx.fillStyle = color
  ctx.strokeStyle = OBJECT_OUTLINE
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(0, 0, 9, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  if (animation.indicatorPhase < 0.42) {
    ctx.fillStyle = '#73d1ce'
    ctx.fillRect(head.x + 10, head.y + 9, 3, 3)
  }
}

function drawHeadphones(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#df8875'
  const center = worldToIso({ x: x + 0.36, y: y + 0.23, z: z + 0.24 })
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(center.x, center.y, 14, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = shadeColor(color, -25)
  ctx.fillRect(center.x - 17, center.y - 2, 7, 13)
  ctx.fillRect(center.x + 10, center.y - 2, 7, 13)
}

function drawSynth(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#d8d1c2'
  drawBox(ctx, x, y, z, 2.8, 0.95, 0.24, {
    top: color, left: shadeColor(color, -40), right: shadeColor(color, -24),
  })
  const blackKeys = new Set([1, 3, 6, 8])
  for (let index = 0; index < 10; index += 1) {
    const keyX = x + 0.12 + index * 0.25
    isoPolygon(ctx, [
      { x: keyX, y: y + 0.1, z: z + 0.25 }, { x: keyX + 0.21, y: y + 0.1, z: z + 0.25 },
      { x: keyX + 0.21, y: y + 0.78, z: z + 0.25 }, { x: keyX, y: y + 0.78, z: z + 0.25 },
    ], blackKeys.has(index) ? '#27313f' : '#f5eee0', '#687078', 0.45)
  }
  const indicator = worldToIso({ x: x + 2.56, y: y + 0.18, z: z + 0.29 })
  ctx.fillStyle = animation.indicatorPhase < 0.5 ? '#69d1ca' : '#e78d72'
  ctx.fillRect(indicator.x - 2, indicator.y - 2, 4, 4)
}

function drawAcousticPanel(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 1.4
  const color = object.tint ?? '#7c6ca6'
  isoPolygon(ctx, [
    { x, y, z }, { x: x + 1.05, y, z },
    { x: x + 1.05, y, z: z + 1.45 }, { x, y, z: z + 1.45 },
  ], color, OBJECT_OUTLINE, 1)
  for (let index = 1; index < 4; index += 1) {
    const start = worldToIso({ x: x + index * 0.25, y: y - 0.01, z: z + 0.12 })
    const end = worldToIso({ x: x + index * 0.25, y: y - 0.01, z: z + 1.33 })
    ctx.strokeStyle = shadeColor(color, -28)
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
  const tag = worldToIso({ x: x + 0.52, y: y - 0.02, z: z + 0.18 })
  polygon(ctx, [
    { x: tag.x - 6, y: tag.y - 2 }, { x: tag.x + 6, y: tag.y - 2 },
    { x: tag.x + 6, y: tag.y + 2 }, { x: tag.x - 6, y: tag.y + 2 },
  ], shadeColor(color, 35))
}
