import { distance, findRoute } from './routes.ts'
import { AmbientSchedule } from './AmbientSchedule.ts'
import { activityChoices, conversationApproach, CONVERSATION_COOLDOWN, MIN_SETTLED_TIME, walkingProgress } from './scheduling.ts'
import type { LivingCharacter, LivingRoomDefinition } from './types'

interface Conversation {
  visitor: LivingCharacter
  host: LivingCharacter
  location: string
  until: number
}
export interface ConversationMemory {
  nextAt: number
  lastAt: number
  recentLocations: string[]
}

/** Time is visible-page time. Each person owns their deadlines; nobody takes turns moving. */
export class LivingWorld {
  readonly characters: LivingCharacter[]
  readonly ambientSchedule: AmbientSchedule
  get ambient() { return this.ambientSchedule.events }
  readonly conversations = new Map<string, Conversation>()
  readonly conversationMemory = new Map<string, ConversationMemory>()
  time = 0
  readonly rooms: LivingRoomDefinition[]
  private readonly random: () => number

  constructor(rooms: LivingRoomDefinition[], random: () => number = Math.random) {
    this.rooms = rooms; this.random = random
    this.characters = rooms.flatMap(room => room.characters.map(definition => {
      const point = room.points.find(p => p.id === definition.start)!
      const duration = this.dwellDuration()
      return { ...definition, roomId: room.roomId, pointId: point.id, foot: { ...point.foot },
        state: point.activity ?? 'IDLE', facing: point.facing ?? 1, back: false,
        dwellUntil: duration, currentDwellDuration: duration, arrivedAt: 0,
        lastActivity: null, recentActivities: [{id: point.id, at: 0}], recentTransitions: [],
        lastMovementTime: -Infinity, recentDestination: point.id, lastConversationTime: -Infinity,
        completedActivities: 0, nextDecisionAt: 0,
        actionAt: this.range(6, 26), actionStartedAt: -Infinity, actionUntil: 0, pose: 0,
        gait: 0, distance: 0, trips: 0, talks: 0, walkingSeconds: 0 } as LivingCharacter
    }))
    for (const room of rooms) this.conversationMemory.set(room.roomId, {
      nextAt: this.range(440, 660), lastAt: -Infinity, recentLocations: [],
    })
    this.ambientSchedule = new AmbientSchedule(rooms, random)
  }

  update(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return
    this.time += delta
    for (const room of this.rooms) {
      const pair = this.characters.filter(a => a.roomId === room.roomId)
      this.maybeConverse(room, pair)
      const conversation = this.conversations.get(room.roomId)
      for (const actor of pair) {
        if (actor.journey) { this.walk(room, actor, delta); continue }
        if (conversation && actor === conversation.visitor) continue
        // The host keeps working while the colleague approaches.
        if (conversation && !conversation.visitor.journey) continue
        this.dwell(room, actor)
        if (conversation) continue
        if (this.time >= Math.max(actor.dwellUntil, actor.nextDecisionAt) && this.time >= actor.actionUntil) {
          const choices = activityChoices(actor, pair, this.time)
          if (choices.length) this.travel(room, actor, this.pick(choices), 'activity')
          else actor.nextDecisionAt = this.time + this.range(35, 65)
        }
      }
      if (conversation && !conversation.visitor.journey) this.converse(room, conversation)
    }
    this.ambientSchedule.update(this.time, this.characters)
  }

  private range(min: number, max: number): number { return min + this.random() * (max - min) }
  private pick<T>(values: T[]): T { return values[Math.floor(this.random() * values.length)] }
  private dwellDuration(): number {
    return this.random() < 0.15 ? this.range(190, 250) : this.range(90, 180)
  }

  private maybeConverse(room: LivingRoomDefinition, pair: LivingCharacter[]): void {
    const memory = this.conversationMemory.get(room.roomId)!
    if (this.conversations.has(room.roomId) || this.time < memory.nextAt) return
    memory.nextAt = this.time + this.range(25, 55)
    if (!pair.every(a => !a.journey && a.completedActivities >= 2 &&
      this.time - a.arrivedAt >= MIN_SETTLED_TIME && this.time >= a.actionUntil &&
      this.time - a.lastConversationTime >= CONVERSATION_COOLDOWN)) return
    const hosts = pair.filter(a => !memory.recentLocations.slice(-2).includes(a.pointId) && conversationApproach(room, a.pointId))
    if (!hosts.length || this.random() > 0.7) return
    const host = this.pick(hosts), visitor = pair.find(a => a !== host)!
    const approach = conversationApproach(room, host.pointId)!
    visitor.returnPoint = visitor.pointId
    this.travel(room, visitor, approach, 'visit')
    this.conversations.set(room.roomId, {visitor, host, location: host.pointId, until: Infinity})
  }

  private converse(room: LivingRoomDefinition, conversation: Conversation): void {
    const {visitor, host} = conversation
    if (conversation.until === Infinity) {
      if (this.time < host.actionUntil) return
      conversation.until = this.time + this.range(9, 14)
      const memory = this.conversationMemory.get(room.roomId)!
      memory.lastAt = this.time
      memory.recentLocations = [...memory.recentLocations, conversation.location].slice(-3)
      for (const actor of [visitor, host]) {
        actor.state = 'TALKING'; actor.talks++; actor.lastConversationTime = this.time
        actor.completedActivities = 0; actor.actionStartedAt = this.time + this.range(0, 2)
      }
      host.facing = visitor.foot.x >= host.foot.x ? 1 : -1; visitor.facing = -host.facing
    } else if (this.time >= conversation.until) {
      // A discussion is not an automatic out-and-back loop: take up a fresh task.
      const choices = activityChoices(visitor, [host, visitor], this.time)
      this.travel(room, visitor, choices.length ? this.pick(choices) : visitor.returnPoint!, 'return')
      host.dwellUntil = this.time + this.dwellDuration()
      host.currentDwellDuration = host.dwellUntil - host.arrivedAt
      host.actionAt = this.time + this.range(4, 9)
      this.dwell(room, host)
      this.conversations.delete(room.roomId)
      this.conversationMemory.get(room.roomId)!.nextAt = this.time + this.range(480, 780)
    }
  }

  private dwell(room: LivingRoomDefinition, actor: LivingCharacter): void {
    const point = room.points.find(p => p.id === actor.pointId)!
    if (this.time >= actor.actionAt) {
      actor.actionStartedAt = this.time; actor.actionUntil = this.time + this.range(7, 11)
      actor.actionAt = actor.actionUntil + this.range(18, 42)
      actor.pose = point.task === 'observe' ? 0 : this.random() < 0.85 ? 1 : 0
    }
    const pausing = this.time >= actor.actionUntil && this.time < actor.actionUntil + 5
    actor.state = pausing ? 'IDLE' : (point.activity ?? 'INSPECTING')
    actor.facing = point.facing ?? 1; actor.back = false
  }

  private travel(room: LivingRoomDefinition, actor: LivingCharacter, destination: string, purpose: 'activity' | 'visit' | 'return'): void {
    const points = findRoute(room, actor.pointId, destination)
    points[0] = {...actor.foot}
    if (points.length === 1) points.push({...points[0]})
    const lengths = points.slice(1).map((p, i) => distance(points[i], p))
    const length = lengths.reduce((sum, n) => sum + n, 0)
    // Long cross-room routes may exceed 15s rather than making someone sprint to meet a timer.
    const duration = Math.max(7, 3 + length / this.range(48, 58))
    actor.journey = {points, segment: 0, elapsed: 0, duration, lengths, destination, purpose}
    if (room.points.find(p => p.id === actor.pointId)?.activity) actor.lastActivity = actor.pointId
    actor.recentDestination = destination
    actor.lastMovementTime = this.time; actor.actionUntil = this.time
    if (purpose === 'activity') {
      actor.completedActivities++
      actor.recentTransitions = [...actor.recentTransitions, {from: actor.pointId, to: destination, at: this.time}].slice(-6)
    }
    actor.state = purpose === 'return' ? 'RETURNING' : 'WALKING'; actor.trips++
  }

  private walk(room: LivingRoomDefinition, actor: LivingCharacter, delta: number): void {
    const journey = actor.journey!
    actor.walkingSeconds += delta; journey.elapsed += delta
    const total = journey.lengths.reduce((sum, n) => sum + n, 0) || 1
    const duration = Math.max(0.5, journey.duration * journey.lengths[journey.segment] / total)
    const progress = walkingProgress(Math.min(1, journey.elapsed / duration))
    const from = journey.points[journey.segment], to = journey.points[journey.segment + 1]
    const next = {x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress}
    actor.distance += distance(actor.foot, next); actor.gait = Math.floor(actor.distance / 26) % 2
    actor.foot = next; actor.facing = to.x >= from.x ? 1 : -1; actor.back = to.y < from.y - 15
    if (journey.elapsed < duration + 0.15) return
    journey.segment++; journey.elapsed = 0
    if (journey.segment < journey.lengths.length) return
    actor.pointId = journey.destination; actor.journey = undefined; actor.arrivedAt = this.time
    actor.currentDwellDuration = this.dwellDuration(); actor.dwellUntil = this.time + actor.currentDwellDuration
    actor.nextDecisionAt = actor.dwellUntil
    if (journey.purpose !== 'visit') actor.recentActivities = [...actor.recentActivities, {id: actor.pointId, at: this.time}].slice(-4)
    actor.actionAt = this.time + this.range(3, 7); actor.actionUntil = this.time; actor.pose = 0
    this.dwell(room, actor)
  }
}
