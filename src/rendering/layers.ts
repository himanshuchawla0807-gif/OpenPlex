export const RenderLayer = {
  Background: 0,
  Floor: 100,
  Walls: 200,
  Structure: 300,
  Furniture: 400,
  SmallObjects: 500,
  Characters: 600,
  Foreground: 700,
  Highlight: 800,
} as const

export type RenderLayer = (typeof RenderLayer)[keyof typeof RenderLayer]
