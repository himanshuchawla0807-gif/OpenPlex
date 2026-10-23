export interface Point {
  x: number
  y: number
}

export interface WorldPoint extends Point {
  z?: number
}

export interface Size {
  width: number
  height: number
}

export interface IsoConfig {
  tileWidth: number
  tileHeight: number
}

export interface CameraState {
  x: number
  y: number
  zoom: number
}
