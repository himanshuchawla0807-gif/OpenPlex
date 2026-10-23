import type { WorldPoint } from '../types/geometry'

export interface DepthDescriptor {
  anchor: WorldPoint
  layer?: number
}

function depthValue(descriptor: DepthDescriptor): number {
  const layer = descriptor.layer ?? 0
  const z = descriptor.anchor.z ?? 0
  return layer * 1_000_000 + (descriptor.anchor.x + descriptor.anchor.y) * 1_000 + z
}

export function sortByDepth<T>(
  items: readonly T[],
  describe: (item: T) => DepthDescriptor,
): T[] {
  return items
    .map((item, index) => ({ item, index, descriptor: describe(item) }))
    .sort((a, b) => {
      const primary = depthValue(a.descriptor) - depthValue(b.descriptor)
      if (primary !== 0) return primary

      // The diagonal tie-breaker keeps sorting deterministic for equal x + y.
      const diagonalA = a.descriptor.anchor.x - a.descriptor.anchor.y
      const diagonalB = b.descriptor.anchor.x - b.descriptor.anchor.y
      return diagonalA - diagonalB || a.index - b.index
    })
    .map(({ item }) => item)
}
