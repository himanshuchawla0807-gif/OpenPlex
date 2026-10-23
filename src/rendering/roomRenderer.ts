import type { AnimationState } from '../engine/animation'
import { sortByDepth } from '../engine/depth'
import { worldToIso } from '../engine/isometric'
import type { Room } from '../types/world'
import type { WorkerEntity } from '../types/worker'
import { describeObjectDepth } from '../world/objectData'
import { describeWorkerDepth } from '../workers/workerDepth'
import { renderRoomObject } from './objectRenderer'
import { drawBox, isoPolygon, polygon } from './primitives'
import { shadeColor } from './objects/objectUtils'
import type { SpriteRenderer } from './sprites/SpriteRenderer'
import type { RoomArtworkRenderer } from './rooms/RoomArtworkRenderer'
import { getRoomArtwork } from '../assets/rooms/manifest'

const OUTLINE = '#263f43'

export function renderRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  animation: AnimationState,
  hovered: boolean,
  selected: boolean,
  spriteRenderer: SpriteRenderer,
  roomArtworkRenderer: RoomArtworkRenderer,
  workers: WorkerEntity[],
): void {
  if (room.artwork && roomArtworkRenderer.isReady(room)) {
    renderArtworkRoom(
      ctx,
      room,
      animation,
      hovered,
      selected,
      spriteRenderer,
      roomArtworkRenderer,
      workers,
    )
    return
  }

  // Never flash procedural furniture while the illustration is loading.
  if (room.artwork && room.artwork.assetId !== 'developer-office-placeholder') return

  drawRoomShadow(ctx, room)
  drawFloor(ctx, room)
  drawWalls(ctx, room)

  const roomWorkers = workers.filter((worker) => worker.roomId === room.id)
  const renderables = [
    ...room.objects.map((object) => ({ type: 'object' as const, object })),
    ...roomWorkers.map((worker) => ({ type: 'worker' as const, worker })),
  ]

  sortByDepth(renderables, (renderable) => (
    renderable.type === 'object'
      ? describeObjectDepth(renderable.object)
      : describeWorkerDepth(renderable.worker)
  )).forEach((renderable) => {
    if (renderable.type === 'worker') {
      spriteRenderer.draw(ctx, renderable.worker, animation.elapsed * 1_000)
      return
    }

    const renderedAsSprite = spriteRenderer.draw(ctx, renderable.object, animation.elapsed * 1_000)
    if (!renderedAsSprite) renderRoomObject(ctx, renderable.object, animation)
    })

  drawFrontBoundaries(ctx, room)
  drawRoomMarker(ctx, room)
  if (hovered || selected) drawRoomHighlight(ctx, room, selected, animation.elapsed)
}

function renderArtworkRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  animation: AnimationState,
  hovered: boolean,
  selected: boolean,
  spriteRenderer: SpriteRenderer,
  roomArtworkRenderer: RoomArtworkRenderer,
  workers: WorkerEntity[],
): void {
  roomArtworkRenderer.drawBase(ctx, room)

  if (room.artwork?.assetId === 'illustrated-workshop') {
    // A tiny cursor is separate from the printed environment plate.
    const origin = worldToIso(room.origin)
    const { base } = getRoomArtwork(room.artwork.assetId)
    if (Math.floor(animation.elapsed * 1.5) % 2 === 0) {
      ctx.save()
      ctx.fillStyle = '#ead393'
      ctx.fillRect(origin.x + base.offset.x + 363, origin.y + base.offset.y + 431, 5, 2)
      ctx.restore()
    }
  }

  const renderables = [
    ...workers
      .filter((worker) => worker.roomId === room.id)
      .map((worker) => ({ type: 'worker' as const, worker })),
    ...roomArtworkRenderer
      .getDepthLayers(room)
      .map((layer) => ({ type: 'artwork-layer' as const, layer })),
  ]

  sortByDepth(renderables, (renderable) => (
    renderable.type === 'worker'
      ? describeWorkerDepth(renderable.worker)
      : roomArtworkRenderer.describeDepthLayer(room, renderable.layer)
  )).forEach((renderable) => {
    if (renderable.type === 'worker') {
      spriteRenderer.draw(ctx, renderable.worker, animation.elapsed * 1_000)
    } else {
      roomArtworkRenderer.drawLayer(ctx, room, renderable.layer)
    }
  })

  if (hovered || selected) drawRoomHighlight(ctx, room, selected, animation.elapsed)
}

function drawRoomShadow(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y } = room.origin
  ctx.save()
  isoPolygon(ctx, [
    { x: x - 0.2, y: y + 0.35 }, { x: x + room.width + 0.55, y: y + 0.35 },
    { x: x + room.width + 0.55, y: y + room.depth + 0.62 }, { x: x - 0.2, y: y + room.depth + 0.62 },
  ], 'rgba(36, 45, 44, 0.16)')
  ctx.restore()
}

function drawFloor(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y } = room.origin
  const { theme } = room
  isoPolygon(ctx, [
    { x, y, z: -0.12 }, { x: x + room.width, y, z: -0.12 },
    { x: x + room.width, y: y + room.depth, z: -0.12 }, { x, y: y + room.depth, z: -0.12 },
  ], shadeColor(theme.floorB, -45), OUTLINE, 1.6)

  for (let tileX = 0; tileX < room.width; tileX += 1) {
    for (let tileY = 0; tileY < room.depth; tileY += 1) {
      const alternating = (tileX + tileY) % 2 === 0
      isoPolygon(ctx, [
        { x: x + tileX, y: y + tileY, z: 0 }, { x: x + tileX + 1, y: y + tileY, z: 0 },
        { x: x + tileX + 1, y: y + tileY + 1, z: 0 }, { x: x + tileX, y: y + tileY + 1, z: 0 },
      ], alternating ? theme.floorA : theme.floorB, 'rgba(75, 67, 64, 0.22)', 0.65)
    }
  }

  // Small corner dots add scale without pretending to be final pixel artwork.
  ;[[1.1, 5.8], [6.55, 1.15], [6.9, 5.65]].forEach(([dx, dy]) => {
    const dot = worldToIso({ x: x + dx, y: y + dy, z: 0.03 })
    ctx.fillStyle = 'rgba(54, 58, 57, 0.24)'
    ctx.fillRect(dot.x - 1.5, dot.y - 1.5, 3, 3)
  })
}

function drawWalls(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y } = room.origin
  const { theme } = room
  const h = room.wallHeight

  isoPolygon(ctx, [
    { x, y, z: 0 }, { x: x + room.width, y, z: 0 },
    { x: x + room.width, y, z: h }, { x, y, z: h },
  ], theme.wallBack, OUTLINE, 1.4)
  isoPolygon(ctx, [
    { x, y, z: 0 }, { x, y: y + room.depth, z: 0 },
    { x, y: y + room.depth, z: h }, { x, y, z: h },
  ], theme.wallSide, OUTLINE, 1.4)

  isoPolygon(ctx, [
    { x, y, z: 0.12 }, { x: x + room.width, y, z: 0.12 },
    { x: x + room.width, y, z: 0.92 }, { x, y, z: 0.92 },
  ], theme.wallLower, 'rgba(26, 43, 47, 0.72)', 0.9)
  isoPolygon(ctx, [
    { x, y, z: 0.12 }, { x, y: y + room.depth, z: 0.12 },
    { x, y: y + room.depth, z: 0.92 }, { x, y, z: 0.92 },
  ], shadeColor(theme.wallLower, -12), 'rgba(24, 40, 44, 0.72)', 0.9)

  drawBox(ctx, x - 0.07, y - 0.07, h, room.width + 0.14, 0.16, 0.13, {
    top: theme.trim, left: shadeColor(theme.trim, -44), right: shadeColor(theme.trim, -18),
  })
  drawBox(ctx, x - 0.07, y - 0.07, h, 0.16, room.depth + 0.14, 0.13, {
    top: theme.trim, left: shadeColor(theme.trim, -44), right: shadeColor(theme.trim, -18),
  })

  // Fine wall guides visually connect each room to the same world-grid system.
  for (let offset = 1; offset < room.width; offset += 1) {
    const bottom = worldToIso({ x: x + offset, y: y - 0.01, z: 1.02 })
    const top = worldToIso({ x: x + offset, y: y - 0.01, z: h - 0.16 })
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 0.65
    ctx.beginPath()
    ctx.moveTo(bottom.x, bottom.y)
    ctx.lineTo(top.x, top.y)
    ctx.stroke()
  }
}

function drawFrontBoundaries(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y } = room.origin
  const { theme } = room
  drawBox(ctx, x + room.width - 0.14, y, 0, 0.14, room.depth, 0.25, {
    top: theme.trim, left: shadeColor(theme.trim, -45), right: shadeColor(theme.trim, -23),
  })
  drawBox(ctx, x, y + room.depth - 0.14, 0, room.width, 0.14, 0.25, {
    top: theme.trim, left: shadeColor(theme.trim, -45), right: shadeColor(theme.trim, -23),
  })
}

function drawRoomMarker(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y } = room.origin
  const anchor = worldToIso({ x: x + room.width - 0.55, y: y + room.depth - 0.55, z: 0.34 })
  polygon(ctx, [
    { x: anchor.x, y: anchor.y - 8 }, { x: anchor.x + 12, y: anchor.y },
    { x: anchor.x, y: anchor.y + 8 }, { x: anchor.x - 12, y: anchor.y },
  ], room.theme.label, OUTLINE, 0.9)
}

function drawRoomHighlight(ctx: CanvasRenderingContext2D, room: Room, selected: boolean, elapsed: number): void {
  const artwork = room.artwork && getRoomArtwork(room.artwork.assetId)
  if (artwork?.frontEdge) {
    const origin = worldToIso(room.origin)
    ctx.save()
    ctx.strokeStyle = selected ? '#bd6548' : '#467b79'
    ctx.lineWidth = selected ? 3 : 2
    ctx.beginPath()
    artwork.frontEdge.forEach((point, index) => {
      const x = origin.x + artwork.base.offset.x + point.x * (artwork.base.scale ?? 1)
      const y = origin.y + artwork.base.offset.y + point.y * (artwork.base.scale ?? 1)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.restore()
    return
  }
  const { x, y } = room.origin
  const pulse = selected ? 0.84 + Math.sin(elapsed * 3) * 0.16 : 0.72
  ctx.save()
  ctx.globalAlpha = pulse
  isoPolygon(ctx, [
    { x, y, z: 0.31 }, { x: x + room.width, y, z: 0.31 },
    { x: x + room.width, y: y + room.depth, z: 0.31 }, { x, y: y + room.depth, z: 0.31 },
  ], 'rgba(0,0,0,0)', selected ? room.theme.accent : room.theme.trim, selected ? 3 : 2)
  ctx.restore()
}
