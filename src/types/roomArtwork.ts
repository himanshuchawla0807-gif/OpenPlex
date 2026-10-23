import type { Point, WorldPoint } from './geometry'

export type RoomArtworkAssetId = 'collaboration-suite' | 'research-lab' | 'design-studio' | 'team-lounge' | 'connected-office' | 'developer-office-placeholder' | 'illustrated-workshop' | 'botanists-conservatory' | 'printmakers-atelier'

export interface RoomArtworkLayerDefinition {
  id: string
  source: string
  offset: Point
  displayWidth: number
  displayHeight: number
  scale?: number
  depthAnchor?: WorldPoint
  layer?: number
  /** Image-pixel silhouette; excludes exterior paper without editing the source raster. */
  clipPolygon?: Point[]
}

export interface RoomArtworkDefinition {
  base: RoomArtworkLayerDefinition
  depthLayers: RoomArtworkLayerDefinition[]
  /** Authored image-pixel silhouette, registered to the base plate. */
  hitPolygon?: Point[]
  frontEdge?: Point[]
}

export interface RoomArtworkPlacement {
  assetId: RoomArtworkAssetId
}
