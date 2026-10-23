import type {
  WorkerAnimationState,
  WorkerDirection,
  WorkerEntity,
  WorkerTask,
} from '../types/worker'

const MAX_DELTA_MS = 80
const ARRIVAL_DISTANCE = 0.025

export class WorkerSystem {
  readonly workers: WorkerEntity[]
  private lastTimestampMs: number | null = null

  constructor(workers: WorkerEntity[]) {
    this.workers = workers
  }

  update(timestampMs: number): void {
    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs
      this.workers.forEach((worker) => this.startCurrentTask(worker, timestampMs))
      return
    }

    const deltaMs = Math.min(MAX_DELTA_MS, Math.max(0, timestampMs - this.lastTimestampMs))
    this.lastTimestampMs = timestampMs
    this.workers.forEach((worker) => this.updateWorker(worker, deltaMs, timestampMs))
  }

  private updateWorker(worker: WorkerEntity, deltaMs: number, timestampMs: number): void {
    const task = worker.routine[worker.currentTaskIndex]
    if (task.type === 'walk') {
      this.updateWalkTask(worker, task, deltaMs, timestampMs)
      return
    }

    worker.taskElapsedMs += deltaMs
    if (worker.taskElapsedMs >= task.durationMs) {
      this.advanceTask(worker, timestampMs)
    }
  }

  private updateWalkTask(
    worker: WorkerEntity,
    task: Extract<WorkerTask, { type: 'walk' }>,
    deltaMs: number,
    timestampMs: number,
  ): void {
    const dx = task.target.x - worker.position.x
    const dy = task.target.y - worker.position.y
    const distance = Math.hypot(dx, dy)
    const step = worker.speed * (deltaMs / 1_000)

    if (distance <= Math.max(ARRIVAL_DISTANCE, step)) {
      worker.position.x = task.target.x
      worker.position.y = task.target.y
      this.advanceTask(worker, timestampMs)
      return
    }

    worker.direction = directionFromDelta(dx, dy)
    worker.position.x += (dx / distance) * step
    worker.position.y += (dy / distance) * step
    this.syncSprite(worker)
  }

  private advanceTask(worker: WorkerEntity, timestampMs: number): void {
    worker.currentTaskIndex = (worker.currentTaskIndex + 1) % worker.routine.length
    worker.taskElapsedMs = 0
    this.startCurrentTask(worker, timestampMs)
  }

  private startCurrentTask(worker: WorkerEntity, timestampMs: number): void {
    const task = worker.routine[worker.currentTaskIndex]
    const nextState: WorkerAnimationState = task.type === 'walk'
      ? 'walking'
      : task.type === 'work'
        ? 'working'
        : 'idle'

    worker.state = nextState
    worker.stateStartedAtMs = timestampMs
    if (task.type !== 'walk' && task.direction) worker.direction = task.direction
    this.syncSprite(worker)
  }

  private syncSprite(worker: WorkerEntity): void {
    worker.sprite.animationState = worker.state
    worker.sprite.direction = worker.direction
    worker.sprite.animationStartedAtMs = worker.stateStartedAtMs
  }
}

function directionFromDelta(dx: number, dy: number): WorkerDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west'
  return dy >= 0 ? 'south' : 'north'
}
