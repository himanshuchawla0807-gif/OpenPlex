import type { LivingCharacter, LivingRoomDefinition } from './types'

export const ACTIVITY_COOLDOWN = 300
export const MIN_SETTLED_TIME = 75
export const CONVERSATION_COOLDOWN = 420

/** Keep preference weights, but remove occupied, reserved and recently visited stations. */
export function activityChoices(actor: LivingCharacter, pair: LivingCharacter[], time: number): string[] {
  return actor.preferences.filter(id => id !== actor.pointId &&
    !actor.recentActivities.slice(-2).some(visit => visit.id === id && time - visit.at < ACTIVITY_COOLDOWN) &&
    !actor.recentTransitions.some(route => route.from === actor.pointId && route.to === id && time - route.at < 600) &&
    !pair.some(other => other !== actor && (other.pointId === id || other.journey?.destination === id)))
}

export function conversationApproach(room: LivingRoomDefinition, pointId: string): string | undefined {
  return room.edges.flatMap(([a, b]) => a === pointId ? [b] : b === pointId ? [a] : [])
    .find(id => !room.points.find(point => point.id === id)!.activity)
}

/** Almost constant speed with gentle acceleration/deceleration at each authored turn. */
export function walkingProgress(t: number): number {
  const ramp = 0.15, speed = 1 / (1 - ramp)
  if (t < ramp) return speed * t * t / (2 * ramp)
  if (t > 1 - ramp) return 1 - speed * (1 - t) ** 2 / (2 * ramp)
  return speed * (t - ramp / 2)
}
