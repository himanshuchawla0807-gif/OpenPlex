import type { AnimationState } from '../../engine/animation'
import { worldToIso } from '../../engine/isometric'
import type { RoomObject } from '../../types/world'
import { drawBox, drawIsoEllipse, isoPolygon, polygon } from '../primitives'
import { OBJECT_OUTLINE, shadeColor } from './objectUtils'

export function renderCommonObject(
  ctx: CanvasRenderingContext2D,
  object: RoomObject,
  animation: AnimationState,
): boolean {
  switch (object.kind) {
    case 'rug': drawRug(ctx, object); return true
    case 'desk': drawDesk(ctx, object); return true
    case 'chair': drawChair(ctx, object); return true
    case 'computer': drawComputer(ctx, object, animation); return true
    case 'monitor': drawMonitor(ctx, object, animation); return true
    case 'keyboard': drawKeyboard(ctx, object); return true
    case 'mouse': drawMouse(ctx, object); return true
    case 'plant': drawPlant(ctx, object, animation); return true
    case 'lamp': drawLamp(ctx, object, animation); return true
    case 'floorLamp': drawFloorLamp(ctx, object, animation); return true
    case 'books': drawBooks(ctx, object); return true
    case 'mug': drawMug(ctx, object); return true
    case 'stool': drawStool(ctx, object); return true
    case 'cabinet': drawCabinet(ctx, object); return true
    case 'shelf': drawShelf(ctx, object); return true
    case 'wallArt': drawWallArt(ctx, object); return true
    case 'cable': drawCable(ctx, object); return true
    case 'decor': drawDecor(ctx, object, animation); return true
    default: return false
  }
}

function drawRug(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0.025
  const outer = object.tint ?? '#c96f56'
  const inner = object.secondaryTint ?? '#e8a96f'
  isoPolygon(ctx, [
    { x, y, z }, { x: x + 3.8, y, z },
    { x: x + 3.8, y: y + 2.8, z }, { x, y: y + 2.8, z },
  ], outer, shadeColor(outer, -42), 1.1)
  isoPolygon(ctx, [
    { x: x + 0.38, y: y + 0.35, z: z + 0.01 }, { x: x + 3.42, y: y + 0.35, z: z + 0.01 },
    { x: x + 3.42, y: y + 2.45, z: z + 0.01 }, { x: x + 0.38, y: y + 2.45, z: z + 0.01 },
  ], inner, shadeColor(inner, 18), 0.8)
  isoPolygon(ctx, [
    { x: x + 1.28, y: y + 0.95, z: z + 0.02 }, { x: x + 2.52, y: y + 0.95, z: z + 0.02 },
    { x: x + 2.52, y: y + 1.85, z: z + 0.02 }, { x: x + 1.28, y: y + 1.85, z: z + 0.02 },
  ], shadeColor(outer, -18))
}

function drawDesk(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const top = object.secondaryTint ?? '#d99b64'
  const base = object.tint ?? '#b87451'
  drawBox(ctx, x, y, z + 1.38, 3.4, 1.25, 0.2, {
    top, left: shadeColor(base, -20), right: base,
  })
  ;[[0.16, 0.14], [3.02, 0.14], [0.16, 0.92], [3.02, 0.92]].forEach(([dx, dy]) => {
    drawBox(ctx, x + dx, y + dy, z, 0.22, 0.22, 1.4, {
      top: shadeColor(base, 5), left: shadeColor(base, -42), right: shadeColor(base, -28),
    })
  })
  drawBox(ctx, x + 2.62, y + 0.12, z + 0.32, 0.58, 0.8, 0.72, {
    top: shadeColor(base, 4), left: shadeColor(base, -30), right: shadeColor(base, -14),
  })
}

function drawChair(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#4e7774'
  drawBox(ctx, x, y, z + 0.52, 1.05, 1, 0.28, {
    top: color, left: shadeColor(color, -34), right: shadeColor(color, -20),
  })
  drawBox(ctx, x, y + 0.82, z + 0.68, 1.05, 0.2, 1.1, {
    top: shadeColor(color, 16), left: shadeColor(color, -38), right: shadeColor(color, -24),
  })
  ;[[0.1, 0.1], [0.82, 0.1], [0.1, 0.72], [0.82, 0.72]].forEach(([dx, dy]) => {
    drawBox(ctx, x + dx, y + dy, z, 0.12, 0.12, 0.56, {
      top: '#425254', left: '#26383b', right: '#314346',
    })
  })
}

function drawComputer(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#455d63'
  drawBox(ctx, x, y, z, 0.65, 0.72, 1.35, {
    top: shadeColor(color, 15), left: shadeColor(color, -28), right: color,
  })
  const face = worldToIso({ x: x + 0.34, y: y + 0.73, z: z + 0.93 })
  ctx.fillStyle = animation.indicatorPhase < 0.55 ? '#76ddd0' : '#efb760'
  ctx.fillRect(face.x - 2, face.y - 2, 4, 4)
  ctx.fillStyle = '#1f3035'
  ctx.fillRect(face.x - 7, face.y + 8, 14, 2)
}

function drawMonitor(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const screen = object.tint ?? '#66d2c6'
  drawBox(ctx, x + 0.5, y + 0.12, z, 0.24, 0.2, 0.38, {
    top: '#52686c', left: '#263d42', right: '#344f54',
  })
  drawBox(ctx, x + 0.1, y + 0.08, z + 0.28, 1.25, 0.24, 0.86, {
    top: '#4b6267', left: '#223a40', right: '#304c52',
  })
  const alpha = Math.min(0.98, animation.screenGlow)
  isoPolygon(ctx, [
    { x: x + 0.2, y: y + 0.055, z: z + 0.42 }, { x: x + 1.25, y: y + 0.055, z: z + 0.42 },
    { x: x + 1.25, y: y + 0.055, z: z + 1.0 }, { x: x + 0.2, y: y + 0.055, z: z + 1.0 },
  ], `rgba(82, 201, 194, ${alpha})`, '#b6eee1', 0.65)
  const base = worldToIso({ x: x + 0.3, y: y + 0.045, z: z + 0.84 })
  ctx.strokeStyle = object.variant === 'graph' ? '#f6d178' : screen
  ctx.lineWidth = 2
  ctx.beginPath()
  if (object.variant === 'waveform') {
    ctx.moveTo(base.x, base.y + 8)
    for (let index = 0; index < 7; index += 1) {
      ctx.lineTo(base.x + index * 6, base.y + (index % 2 === 0 ? 2 : 13))
    }
  } else if (object.variant === 'graph') {
    ctx.moveTo(base.x, base.y + 13)
    ctx.lineTo(base.x + 10, base.y + 8)
    ctx.lineTo(base.x + 20, base.y + 11)
    ctx.lineTo(base.x + 34, base.y - 1)
  } else {
    ctx.moveTo(base.x, base.y)
    ctx.lineTo(base.x + 33, base.y)
    ctx.moveTo(base.x, base.y + 9)
    ctx.lineTo(base.x + 22, base.y + 9)
  }
  ctx.stroke()
  if (animation.cursorVisible) {
    ctx.fillStyle = '#fff3b0'
    ctx.fillRect(base.x + 26, base.y + 6, 3, 8)
  }
}

function drawKeyboard(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#d7c8ad'
  drawBox(ctx, x, y, z, 1.35, 0.48, 0.08, {
    top: color, left: shadeColor(color, -38), right: shadeColor(color, -24),
  })
  for (let index = 1; index < 6; index += 1) {
    const start = worldToIso({ x: x + index * 0.2, y: y + 0.07, z: z + 0.09 })
    const end = worldToIso({ x: x + index * 0.2, y: y + 0.4, z: z + 0.09 })
    ctx.strokeStyle = 'rgba(54, 62, 61, 0.45)'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
}

function drawMouse(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  drawIsoEllipse(ctx, { x: x + 0.18, y: y + 0.22, z }, 10, 5, object.tint ?? '#e3b160', OBJECT_OUTLINE)
}

function drawPlant(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const small = object.variant === 'small'
  const scale = small ? 0.72 : 1
  const pot = object.tint ?? '#d77f54'
  drawBox(ctx, x, y, z, 0.82 * scale, 0.82 * scale, 0.72 * scale, {
    top: shadeColor(pot, 14), left: shadeColor(pot, -34), right: shadeColor(pot, -18),
  })
  const stem = worldToIso({ x: x + 0.4 * scale, y: y + 0.4 * scale, z: z + 0.88 * scale })
  ctx.strokeStyle = '#315b4a'
  ctx.lineWidth = 3.5 * scale
  ctx.beginPath()
  ctx.moveTo(stem.x, stem.y + 14 * scale)
  ctx.lineTo(stem.x + animation.plantSway * 35, stem.y - 34 * scale)
  ctx.stroke()
  ;[[-15, -14, -0.5], [15, -22, 0.55], [-12, -35, -0.32], [10, -45, 0.38], [0, -54, 0]].forEach(([dx, dy, factor]) => {
    ctx.save()
    ctx.translate(stem.x + dx * scale + animation.plantSway * 28 * factor, stem.y + dy * scale)
    ctx.rotate(factor + animation.plantSway)
    ctx.beginPath()
    ctx.ellipse(0, 0, 13 * scale, 5.5 * scale, 0, 0, Math.PI * 2)
    ctx.fillStyle = factor > 0 ? '#3f8266' : '#5da077'
    ctx.fill()
    ctx.strokeStyle = OBJECT_OUTLINE
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  })
}

function drawLamp(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#efb25b'
  const base = worldToIso({ x: x + 0.34, y: y + 0.34, z: z + 0.18 })
  drawSteppedGlow(ctx, base.x, base.y - 30, 34, animation.lampGlow)
  drawIsoEllipse(ctx, { x: x + 0.34, y: y + 0.34, z: z + 0.05 }, 15, 6, '#455d5d', OBJECT_OUTLINE)
  ctx.strokeStyle = OBJECT_OUTLINE
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.lineTo(base.x + 1, base.y - 36)
  ctx.stroke()
  polygon(ctx, [
    { x: base.x - 15, y: base.y - 39 }, { x: base.x + 15, y: base.y - 39 },
    { x: base.x + 9, y: base.y - 22 }, { x: base.x - 9, y: base.y - 22 },
  ], color, OBJECT_OUTLINE, 1)
}

function drawFloorLamp(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#efbc67'
  const top = worldToIso({ x: x + 0.4, y: y + 0.4, z: z + 2.72 })
  drawSteppedGlow(ctx, top.x, top.y + 8, 48, animation.lampGlow)
  drawIsoEllipse(ctx, { x: x + 0.4, y: y + 0.4, z }, 18, 7, '#4b5557', OBJECT_OUTLINE)
  ctx.strokeStyle = OBJECT_OUTLINE
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(top.x, top.y + 108)
  ctx.lineTo(top.x, top.y + 16)
  ctx.stroke()
  polygon(ctx, [
    { x: top.x - 22, y: top.y }, { x: top.x + 22, y: top.y },
    { x: top.x + 14, y: top.y + 26 }, { x: top.x - 14, y: top.y + 26 },
  ], color, OBJECT_OUTLINE, 1.2)
}

function drawSteppedGlow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  intensity: number,
): void {
  const steps = [
    { scale: 1, alpha: 0.08 },
    { scale: 0.66, alpha: 0.13 },
    { scale: 0.34, alpha: 0.22 },
  ]
  steps.forEach(({ scale, alpha }) => {
    const size = Math.round(radius * scale)
    polygon(ctx, [
      { x: centerX, y: centerY - size },
      { x: centerX + size, y: centerY },
      { x: centerX, y: centerY + size },
      { x: centerX - size, y: centerY },
    ], `rgba(255, 220, 125, ${alpha * intensity})`)
  })
}

function drawBooks(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const colors = ['#df7053', '#4b8980', '#e9b75d', '#6e6b83']
  colors.forEach((color, index) => {
    drawBox(ctx, x + index * 0.28, y, z, 0.24, 0.64, 0.45 + index * 0.09, {
      top: color, left: shadeColor(color, -28), right: shadeColor(color, -14),
    })
  })
}

function drawMug(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#e27b56'
  drawBox(ctx, x, y, z, 0.42, 0.42, 0.3, {
    top: color, left: shadeColor(color, -32), right: shadeColor(color, -16),
  })
  drawIsoEllipse(ctx, { x: x + 0.21, y: y + 0.21, z: z + 0.31 }, 8.5, 3.5, color, OBJECT_OUTLINE)
}

function drawStool(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#4f8a83'
  drawIsoEllipse(ctx, { x: x + 0.5, y: y + 0.5, z: z + 1.02 }, 29, 12, color, OBJECT_OUTLINE)
  ;[[0.18, 0.2], [0.64, 0.2], [0.4, 0.64]].forEach(([dx, dy]) => {
    drawBox(ctx, x + dx, y + dy, z, 0.11, 0.11, 0.95, { top: '#5b5a55', left: '#343f40', right: '#414a49' })
  })
}

function drawCabinet(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#c77858'
  drawBox(ctx, x, y, z, 1.6, 0.78, 1.72, {
    top: shadeColor(color, 26), left: shadeColor(color, -34), right: color,
  })
  const splitTop = worldToIso({ x: x + 0.08, y: y + 0.79, z: z + 0.88 })
  const splitBottom = worldToIso({ x: x + 1.5, y: y + 0.79, z: z + 0.88 })
  ctx.strokeStyle = shadeColor(color, -45)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(splitTop.x, splitTop.y)
  ctx.lineTo(splitBottom.x, splitBottom.y)
  ctx.stroke()
  const knob = worldToIso({ x: x + 0.82, y: y + 0.81, z: z + 0.56 })
  ctx.fillStyle = '#f3cc78'
  ctx.beginPath()
  ctx.arc(knob.x, knob.y, 2.6, 0, Math.PI * 2)
  ctx.fill()
}

function drawShelf(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#c9825b'
  drawBox(ctx, x, y, z, 2.4, 0.45, 0.12, {
    top: shadeColor(color, 18), left: shadeColor(color, -34), right: color,
  })
  ;[0.12, 2.14].forEach((dx) => {
    drawBox(ctx, x + dx, y + 0.12, z - 0.58, 0.14, 0.18, 0.58, {
      top: color, left: shadeColor(color, -38), right: shadeColor(color, -20),
    })
  })
}

function drawWallArt(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = object.z ?? 1.4
  const frame = object.tint ?? '#e6bf70'
  const art = object.secondaryTint ?? '#df7459'
  isoPolygon(ctx, [
    { x, y, z }, { x: x + 1.5, y, z }, { x: x + 1.5, y, z: z + 1.1 }, { x, y, z: z + 1.1 },
  ], frame, OBJECT_OUTLINE, 1)
  isoPolygon(ctx, [
    { x: x + 0.12, y: y - 0.015, z: z + 0.12 }, { x: x + 1.38, y: y - 0.015, z: z + 0.12 },
    { x: x + 1.38, y: y - 0.015, z: z + 0.98 }, { x: x + 0.12, y: y - 0.015, z: z + 0.98 },
  ], shadeColor(frame, 26))
  const marker = worldToIso({ x: x + 0.34, y: y - 0.03, z: z + 0.72 })
  ctx.fillStyle = art
  if (object.variant === 'code') {
    ctx.fillRect(marker.x, marker.y, 28, 3)
    ctx.fillRect(marker.x + 6, marker.y + 9, 20, 3)
    ctx.fillStyle = '#69aa9d'
    ctx.fillRect(marker.x + 2, marker.y + 18, 32, 3)
  } else {
    ctx.beginPath()
    ctx.arc(marker.x + 12, marker.y + 12, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = shadeColor(art, -25)
    ctx.fillRect(marker.x + 24, marker.y + 4, 18, 17)
  }
}

function drawCable(ctx: CanvasRenderingContext2D, object: RoomObject): void {
  const { x, y } = object.position
  const z = (object.z ?? 0) + 0.035
  const start = worldToIso({ x, y, z })
  const end = worldToIso({
    x: x + (object.variant === 'short' ? 0.85 : 1.65),
    y: y + (object.variant === 'curve-left' ? 1.25 : 0.95),
    z,
  })
  ctx.strokeStyle = object.tint ?? '#2b4348'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.bezierCurveTo(start.x + 36, start.y + 4, end.x - 28, end.y + 18, end.x, end.y)
  ctx.stroke()
  ctx.fillStyle = '#d7b36a'
  ctx.fillRect(end.x - 2, end.y - 2, 4, 4)
}

function drawDecor(ctx: CanvasRenderingContext2D, object: RoomObject, animation: AnimationState): void {
  const { x, y } = object.position
  const z = object.z ?? 0
  const color = object.tint ?? '#e8b25e'
  if (object.variant === 'vase') {
    drawBox(ctx, x, y, z, 0.42, 0.42, 0.62, {
      top: shadeColor(color, 18), left: shadeColor(color, -30), right: color,
    })
    drawIsoEllipse(ctx, { x: x + 0.21, y: y + 0.21, z: z + 0.64 }, 7, 3, '#304f4e')
  } else if (object.variant === 'light') {
    const center = worldToIso({ x: x + 0.22, y: y + 0.22, z: z + 0.3 })
    ctx.fillStyle = animation.indicatorPhase < 0.5 ? color : shadeColor(color, 45)
    ctx.beginPath()
    ctx.arc(center.x, center.y, 6, 0, Math.PI * 2)
    ctx.fill()
  } else {
    drawBox(ctx, x, y, z, 0.45, 0.45, 0.45, {
      top: shadeColor(color, 18), left: shadeColor(color, -34), right: color,
    })
  }
}
