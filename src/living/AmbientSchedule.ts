import type { AmbientEvent, LivingCharacter, LivingRoomDefinition } from './types'

/** Independent object clocks; only selected tools borrow a character's work window. */
export class AmbientSchedule {
  readonly events = new Map<string, AmbientEvent[]>()
  private lastStart = new Map<string, number>()
  private random: () => number

  constructor(rooms: LivingRoomDefinition[], random: () => number) {
    this.random = random
    for (const room of rooms) this.events.set(room.roomId, room.ambient.map(definition => ({
      definition, nextAt: this.range(12, definition.maxDelay), startedAt: -Infinity,
      active: false, value: 0, starts: 0,
    })))
  }

  private range(min: number, max: number): number { return min + this.random() * (max - min) }

  update(time: number, characters: LivingCharacter[]): void {
    for (const [roomId, events] of this.events) for (const event of events) {
      const def = event.definition
      const operator = characters.find(a => a.roomId === roomId && a.pointId === def.activity &&
        !a.journey && ['WORKING', 'READING', 'INSPECTING'].includes(a.state) && time < a.actionUntil)
      if (!event.active && time >= event.nextAt) {
        const permitted = !def.activity || (operator && operator.actionUntil - time >= def.duration)
        if (permitted && events.filter(e => e.active).length < 2 && time - (this.lastStart.get(roomId) ?? -Infinity) > 4) {
          if (this.random() < (def.probability ?? 0.8)) {
            event.active = true; event.startedAt = time; event.starts++
            this.lastStart.set(roomId, time)
          } else event.nextAt = time + this.range(def.minDelay, def.maxDelay)
        }
      }
      if (!event.active) continue
      const phase = (time - event.startedAt) / def.duration
      if (phase >= 1 || (def.activity && !operator)) {
        event.active = false; event.value = 0
        event.nextAt = time + this.range(def.minDelay, def.maxDelay)
      } else {
        event.value = Math.sin(phase * Math.PI) ** 2 * Math.sin(phase * Math.PI * 2) * def.amplitude
      }
    }
  }
}
