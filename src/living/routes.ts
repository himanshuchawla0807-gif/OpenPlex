import type { Point } from '../types/geometry'
import type { LivingRoomDefinition } from './types'

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Authored circulation graph, never a straight line through the room's furniture. */
export function findRoute(room: LivingRoomDefinition, from: string, to: string): Point[] {
  const costs = new Map<string, number>([[from, 0]])
  const previous = new Map<string, string>()
  const pending = new Set(room.points.map((point) => point.id))
  const lookup = new Map(room.points.map((point) => [point.id, point.foot]))
  if (!lookup.has(from) || !lookup.has(to)) throw new Error(`Unknown activity point: ${from} / ${to}`)
  while (pending.size) {
    const current = [...pending].sort((a, b) => (costs.get(a) ?? Infinity) - (costs.get(b) ?? Infinity))[0]
    pending.delete(current)
    if (current === to) break
    for (const [a, b] of room.edges) {
      const next = a === current ? b : b === current ? a : null
      if (!next || !pending.has(next)) continue
      const cost = (costs.get(current) ?? Infinity) + distance(lookup.get(current)!, lookup.get(next)!)
      if (cost < (costs.get(next) ?? Infinity)) { costs.set(next, cost); previous.set(next, current) }
    }
  }
  if (from !== to && !previous.has(to)) throw new Error(`Disconnected route: ${from} / ${to}`)
  const ids = [to]
  while (ids[0] !== from) ids.unshift(previous.get(ids[0])!)
  return ids.map((id) => ({ ...lookup.get(id)! }))
}
