import { RenderLayer } from '../../rendering/layers'
import type { SpriteAssetDefinition, SpriteAssetId } from '../../types/sprite'

export interface SpriteAtlasDefinition {
  source: string
  width: number
  height: number
}

// Add packed sheets here, then point an asset's `atlas` field at the key.
export const spriteAtlases: Record<string, SpriteAtlasDefinition> = {}

function createGridFrames(columns: number, rows: number, cellWidth: number, cellHeight: number) {
  return Array.from({ length: columns * rows }, (_, index) => ({
    sourceRect: {
      x: (index % columns) * cellWidth,
      y: Math.floor(index / columns) * cellHeight,
      width: cellWidth,
      height: cellHeight,
    },
  }))
}

export const spriteManifest: Record<SpriteAssetId, SpriteAssetDefinition> = {
  'developer-desk': {
    source: '/assets/sprites/desk.png',
    displayWidth: 168,
    displayHeight: 124,
    anchorX: 0.5,
    anchorY: 0.94,
    layer: RenderLayer.Furniture,
    frames: [
      { sourceRect: { x: 390, y: 64, width: 1000, height: 760 } },
    ],
  },
  'office-chair': {
    source: '/assets/sprites/chair.png',
    displayWidth: 76,
    displayHeight: 100,
    anchorX: 0.5,
    anchorY: 0.96,
    layer: RenderLayer.Furniture,
    frames: [
      { sourceRect: { x: 292, y: 155, width: 620, height: 1000 } },
    ],
  },
  'potted-plant': {
    source: '/assets/sprites/plant.png',
    displayWidth: 68,
    displayHeight: 88,
    anchorX: 0.5,
    anchorY: 0.96,
    layer: RenderLayer.Furniture,
    frames: [
      { sourceRect: { x: 570, y: 60, width: 650, height: 770 } },
    ],
  },
  'desktop-computer': {
    source: '/assets/sprites/computer.png',
    displayWidth: 72,
    displayHeight: 98,
    anchorX: 0.5,
    anchorY: 0.96,
    layer: RenderLayer.Furniture,
    frames: [
      { sourceRect: { x: 596, y: 66, width: 610, height: 794 }, durationMs: 720 },
      { sourceRect: { x: 596, y: 66, width: 610, height: 794 }, durationMs: 120, opacity: 0.84, nudgeY: -1 },
    ],
  },
  'desk-lamp': {
    source: '/assets/sprites/lamp.png',
    displayWidth: 72,
    displayHeight: 96,
    anchorX: 0.5,
    anchorY: 0.96,
    layer: RenderLayer.SmallObjects,
    frames: [
      { sourceRect: { x: 458, y: 48, width: 780, height: 920 } },
    ],
  },
  'researcher-worker': {
    source: '/assets/sprites/worker-researcher.png',
    displayWidth: 82,
    displayHeight: 110,
    anchorX: 0.5,
    anchorY: 0.92,
    layer: RenderLayer.Furniture,
    frames: createGridFrames(8, 4, 192, 256),
    animations: {
      idle: {
        south: { frames: [0, 1], frameDurationMs: 520 },
        north: { frames: [8, 9], frameDurationMs: 520 },
        east: { frames: [16, 17], frameDurationMs: 520 },
        west: { frames: [24, 25], frameDurationMs: 520 },
      },
      walking: {
        south: { frames: [2, 3, 4, 5], frameDurationMs: 180 },
        north: { frames: [10, 11, 12, 13], frameDurationMs: 180 },
        east: { frames: [18, 19, 20, 21], frameDurationMs: 180 },
        west: { frames: [26, 27, 28, 29], frameDurationMs: 180 },
      },
      working: {
        south: { frames: [6, 7], frameDurationMs: 330 },
        north: { frames: [14, 15], frameDurationMs: 330 },
        east: { frames: [22, 23], frameDurationMs: 330 },
        west: { frames: [30, 31], frameDurationMs: 330 },
      },
    },
  },
}

export function getSpriteAsset(assetId: SpriteAssetId): SpriteAssetDefinition {
  return spriteManifest[assetId]
}

export function getSpriteSource(asset: SpriteAssetDefinition): string | null {
  if (asset.source) return asset.source
  return asset.atlas ? spriteAtlases[asset.atlas]?.source ?? null : null
}
