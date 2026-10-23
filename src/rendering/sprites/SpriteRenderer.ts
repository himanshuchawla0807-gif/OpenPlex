import { getSpriteAsset, getSpriteSource } from '../../assets/sprites/manifest'
import { worldToIso } from '../../engine/isometric'
import type { WorldPoint } from '../../types/geometry'
import type { SpriteAssetDefinition, SpriteFrame, SpritePlacement } from '../../types/sprite'
import { ImageCache } from './ImageCache'

interface ResolvedFrame {
  frame: SpriteFrame
  source: string
}

interface SpriteRenderable {
  position: WorldPoint
  z?: number
  sprite?: SpritePlacement
}

export class SpriteRenderer {
  private readonly cache: ImageCache
  private readonly requested=new Set<string>()

  constructor(cache: ImageCache = new ImageCache()) {
    this.cache = cache
  }

  draw(ctx: CanvasRenderingContext2D, object: SpriteRenderable, elapsedMs: number): boolean {
    const placement = object.sprite
    if (!placement) return false
    if (placement.visible === false) return true

    const asset = getSpriteAsset(placement.assetId)
    const resolved = this.resolveFrame(asset, placement, elapsedMs)
    if (!resolved) return false
    if(!this.requested.has(resolved.source)) {
      this.requested.add(resolved.source);void this.cache.load(resolved.source).catch(()=>null)
    }
    const image = this.cache.get(resolved.source)
    if (!image) return false

    const offset = placement.offset ?? { x: 0, y: 0, z: 0 }
    const projected = worldToIso({
      x: object.position.x + offset.x,
      y: object.position.y + offset.y,
      z: (object.z ?? object.position.z ?? 0) + (offset.z ?? 0),
    })
    const scale = placement.scale ?? 1
    const width = Math.round(asset.displayWidth * scale)
    const height = Math.round(asset.displayHeight * scale)
    const anchorX = placement.anchorX ?? asset.anchorX
    const anchorY = placement.anchorY ?? asset.anchorY
    const frame = resolved.frame
    const destinationX = Math.round(projected.x - width * anchorX + (frame.nudgeX ?? 0))
    const destinationY = Math.round(projected.y - height * anchorY + (frame.nudgeY ?? 0))
    const sourceRect = frame.sourceRect ?? {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.globalAlpha = (placement.opacity ?? 1) * (frame.opacity ?? 1)

    if (placement.flipX) {
      ctx.translate(destinationX + width, destinationY)
      ctx.scale(-1, 1)
      ctx.drawImage(
        image,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        0,
        0,
        width,
        height,
      )
    } else {
      ctx.drawImage(
        image,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        destinationX,
        destinationY,
        width,
        height,
      )
    }

    ctx.restore()
    return true
  }

  private resolveFrame(
    asset: SpriteAssetDefinition,
    placement: SpritePlacement,
    elapsedMs: number,
  ): ResolvedFrame | null {
    const fallbackSource = getSpriteSource(asset)
    if (!fallbackSource || asset.frames.length === 0) return null

    const animationState = placement.animationState
    const direction = placement.direction
    const sequence = animationState
      ? asset.animations?.[animationState]?.[direction ?? 'south']
        ?? asset.animations?.[animationState]?.default
      : undefined

    if (sequence && sequence.frames.length > 0) {
      const animationElapsed = Math.max(
        0,
        elapsedMs - (placement.animationStartedAtMs ?? 0) + (placement.animationOffsetMs ?? 0),
      )
      const rawIndex = Math.floor(animationElapsed / sequence.frameDurationMs)
      const sequenceIndex = sequence.loop === false
        ? Math.min(sequence.frames.length - 1, rawIndex)
        : rawIndex % sequence.frames.length
      const frameIndex = sequence.frames[sequenceIndex]
      const frame = asset.frames[Math.max(0, Math.min(asset.frames.length - 1, frameIndex))]
      return { frame, source: frame.source ?? fallbackSource }
    }

    if (placement.frame !== undefined) {
      const frame = asset.frames[Math.max(0, Math.min(asset.frames.length - 1, placement.frame))]
      return { frame, source: frame.source ?? fallbackSource }
    }

    const totalDuration = asset.frames.reduce((total, frame) => total + (frame.durationMs ?? 100), 0)
    let cursor = (elapsedMs + (placement.animationOffsetMs ?? 0)) % totalDuration
    for (const frame of asset.frames) {
      cursor -= frame.durationMs ?? 100
      if (cursor < 0) return { frame, source: frame.source ?? fallbackSource }
    }

    const frame = asset.frames[asset.frames.length - 1]
    return { frame, source: frame.source ?? fallbackSource }
  }
}
