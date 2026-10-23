import type { RoomObject, RoomObjectKind } from '../types/world'
import type { DepthDescriptor } from '../engine/depth'
import { getSpriteAsset } from '../assets/sprites/manifest'
import { RenderLayer } from '../rendering/layers'

interface ObjectDefinition {
  width: number
  depth: number
  height: number
  layer: number
}

const definitions: Record<RoomObjectKind, ObjectDefinition> = {
  rug: { width: 3.8, depth: 2.8, height: 0.03, layer: RenderLayer.Floor },
  wallArt: { width: 1.5, depth: 0.08, height: 1.1, layer: RenderLayer.Walls },
  acousticPanel: { width: 1.05, depth: 0.1, height: 1.45, layer: RenderLayer.Walls },
  cable: { width: 1.7, depth: 1.4, height: 0.03, layer: RenderLayer.Floor + 10 },
  desk: { width: 3.4, depth: 1.25, height: 1.55, layer: RenderLayer.Furniture },
  cabinet: { width: 1.6, depth: 0.78, height: 1.72, layer: RenderLayer.Furniture },
  shelf: { width: 2.4, depth: 0.45, height: 0.7, layer: RenderLayer.Structure },
  canvas: { width: 1.35, depth: 0.28, height: 2.1, layer: RenderLayer.Structure },
  chair: { width: 1.05, depth: 1.0, height: 1.9, layer: RenderLayer.Furniture },
  computer: { width: 0.65, depth: 0.72, height: 1.35, layer: RenderLayer.Furniture },
  monitor: { width: 1.35, depth: 0.3, height: 1.1, layer: RenderLayer.Furniture },
  plant: { width: 0.82, depth: 0.82, height: 2.05, layer: RenderLayer.Furniture },
  lamp: { width: 0.7, depth: 0.7, height: 1.3, layer: RenderLayer.Furniture },
  floorLamp: { width: 0.8, depth: 0.8, height: 3.1, layer: RenderLayer.Furniture },
  stool: { width: 1.0, depth: 1.0, height: 1.1, layer: RenderLayer.Furniture },
  drawingBoard: { width: 2.15, depth: 1.35, height: 0.12, layer: RenderLayer.Furniture },
  speaker: { width: 0.72, depth: 0.62, height: 1.35, layer: RenderLayer.Furniture },
  microphone: { width: 0.8, depth: 0.8, height: 2.55, layer: RenderLayer.Furniture },
  synth: { width: 2.8, depth: 0.95, height: 0.3, layer: RenderLayer.Furniture },
  keyboard: { width: 1.35, depth: 0.48, height: 0.09, layer: RenderLayer.SmallObjects },
  mouse: { width: 0.35, depth: 0.45, height: 0.1, layer: RenderLayer.SmallObjects },
  books: { width: 1.2, depth: 0.68, height: 0.9, layer: RenderLayer.SmallObjects },
  mug: { width: 0.45, depth: 0.45, height: 0.35, layer: RenderLayer.SmallObjects },
  decor: { width: 0.45, depth: 0.45, height: 0.6, layer: RenderLayer.SmallObjects },
  headphones: { width: 0.72, depth: 0.45, height: 0.55, layer: RenderLayer.SmallObjects },
}

export function getObjectDefinition(kind: RoomObjectKind): Readonly<ObjectDefinition> {
  return definitions[kind]
}

export function describeObjectDepth(object: RoomObject): DepthDescriptor {
  const definition = getObjectDefinition(object.kind)
  const spriteLayer = object.sprite
    ? object.sprite.layer ?? getSpriteAsset(object.sprite.assetId).layer
    : undefined
  return {
    layer: spriteLayer ?? definition.layer,
    anchor: {
      x: object.position.x + definition.width,
      y: object.position.y + definition.depth,
      z: (object.z ?? 0) + definition.height,
    },
  }
}
