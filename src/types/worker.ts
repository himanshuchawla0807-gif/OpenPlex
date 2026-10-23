import type { Point, WorldPoint } from './geometry'
import type { SpritePlacement } from './sprite'

export type WorkerRole = 'researcher'

export type WorkerDirection = 'north' | 'south' | 'east' | 'west'

export type WorkerAnimationState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'sitting'
  | 'typing'
  | 'reading'
  | 'writing'
  | 'interacting'

export type WorkerTask =
  | { type: 'walk'; target: Point }
  | { type: 'work'; durationMs: number; direction?: WorkerDirection }
  | { type: 'idle'; durationMs: number; direction?: WorkerDirection }

export interface WorkerEntity {
  id: string
  roomId: string
  role: WorkerRole
  position: WorldPoint
  state: WorkerAnimationState
  direction: WorkerDirection
  speed: number
  routine: WorkerTask[]
  currentTaskIndex: number
  taskElapsedMs: number
  stateStartedAtMs: number
  sprite: SpritePlacement
}
