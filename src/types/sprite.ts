import type { WorldPoint } from './geometry'

export type SpriteAssetId =
  | 'developer-desk'
  | 'office-chair'
  | 'potted-plant'
  | 'desktop-computer'
  | 'desk-lamp'
  | 'researcher-worker'

export interface SpriteSourceRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SpriteFrame {
  source?: string
  sourceRect?: SpriteSourceRect
  durationMs?: number
  opacity?: number
  nudgeX?: number
  nudgeY?: number
}

export interface SpriteAnimationSequence {
  frames: number[]
  frameDurationMs: number
  loop?: boolean
}

export type SpriteAnimationMap = Record<
  string,
  Record<string, SpriteAnimationSequence>
>

export interface SpriteAssetDefinition {
  source?: string
  atlas?: string
  displayWidth: number
  displayHeight: number
  anchorX: number
  anchorY: number
  layer: number
  frames: SpriteFrame[]
  animations?: SpriteAnimationMap
}

export interface SpritePlacement {
  assetId: SpriteAssetId
  offset?: WorldPoint
  anchorX?: number
  anchorY?: number
  scale?: number
  opacity?: number
  flipX?: boolean
  visible?: boolean
  frame?: number
  animationOffsetMs?: number
  animationState?: string
  direction?: string
  animationStartedAtMs?: number
  layer?: number
}
