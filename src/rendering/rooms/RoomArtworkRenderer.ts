import { getRoomArtwork } from '../../assets/rooms/manifest'
import { worldToIso } from '../../engine/isometric'
import type { DepthDescriptor } from '../../engine/depth'
import type { RoomArtworkLayerDefinition } from '../../types/roomArtwork'
import type { Room } from '../../types/world'
import { RenderLayer } from '../layers'
import { ImageCache } from '../sprites/ImageCache'

export class RoomArtworkRenderer {
  private readonly cache: ImageCache
  private readonly requested = new Set<string>()

  constructor(cache: ImageCache) {
    this.cache = cache
  }

  isReady(room: Room): boolean {
    if (!room.artwork) return false
    const artwork = getRoomArtwork(room.artwork.assetId)
    for (const layer of [artwork.base, ...artwork.depthLayers]) if (!this.requested.has(layer.source)) {
      this.requested.add(layer.source)
      void this.cache.load(layer.source).catch(() => null)
    }
    return [artwork.base, ...artwork.depthLayers]
      .every((layer) => this.cache.get(layer.source) !== null)
  }

  getDepthLayers(room: Room): RoomArtworkLayerDefinition[] {
    return room.artwork ? getRoomArtwork(room.artwork.assetId).depthLayers : []
  }

  drawBase(ctx: CanvasRenderingContext2D, room: Room): void {
    if (!room.artwork) return
    this.drawLayer(ctx, room, getRoomArtwork(room.artwork.assetId).base)
  }

  drawLayer(
    ctx: CanvasRenderingContext2D,
    room: Room,
    layer: RoomArtworkLayerDefinition,
  ): void {
    const image = this.cache.get(layer.source)
    if (!image) return
    const origin = worldToIso(room.origin)

    ctx.save()
    const scale = layer.scale ?? 1
    ctx.translate(origin.x + layer.offset.x, origin.y + layer.offset.y)
    ctx.scale(scale, scale)
    ctx.imageSmoothingEnabled = false
    if (layer.clipPolygon?.length) {
      // Clip only the exterior margin. Every painted interior pixel stays untouched.
      ctx.beginPath()
      layer.clipPolygon.forEach((point, index) => {
        const x = point.x
        const y = point.y
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.clip()
    }
    ctx.drawImage(
      image,
      0,
      0,
      layer.displayWidth,
      layer.displayHeight,
    )
    ctx.restore()
  }

  describeDepthLayer(room: Room, layer: RoomArtworkLayerDefinition): DepthDescriptor {
    const anchor = layer.depthAnchor ?? { x: room.width, y: room.depth, z: 0 }
    return {
      layer: layer.layer ?? RenderLayer.Furniture,
      anchor: {
        x: room.origin.x + anchor.x,
        y: room.origin.y + anchor.y,
        z: anchor.z ?? 0,
      },
    }
  }
}
