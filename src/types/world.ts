import type { Point, WorldPoint } from './geometry'
import type { RoomArtworkPlacement } from './roomArtwork'
import type { SpritePlacement } from './sprite'

export type RoomObjectKind =
  | 'desk'
  | 'chair'
  | 'computer'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'plant'
  | 'lamp'
  | 'floorLamp'
  | 'rug'
  | 'books'
  | 'mug'
  | 'stool'
  | 'cabinet'
  | 'shelf'
  | 'wallArt'
  | 'cable'
  | 'decor'
  | 'drawingBoard'
  | 'canvas'
  | 'speaker'
  | 'microphone'
  | 'headphones'
  | 'synth'
  | 'acousticPanel'

export interface RoomTheme {
  id: 'developer' | 'creative' | 'music'
  floorA: string
  floorB: string
  wallBack: string
  wallSide: string
  wallLower: string
  trim: string
  accent: string
  label: string
}

export interface RoomObject {
  id: string
  kind: RoomObjectKind
  position: Point
  z?: number
  rotation?: 0 | 1 | 2 | 3
  tint?: string
  secondaryTint?: string
  variant?: string
  sprite?: SpritePlacement
}

export interface Room {
  id: string
  name: string
  origin: Point
  width: number
  depth: number
  wallHeight: number
  theme: RoomTheme
  objects: RoomObject[]
  artwork?: RoomArtworkPlacement
  dynamicAnchors?: Record<string, WorldPoint>
}
