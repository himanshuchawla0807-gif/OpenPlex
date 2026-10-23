import type { WorkerEntity, WorkerTask } from '../types/worker'
import { developerOfficeAnchors } from './roomAnchors'

const researcherRoutine: WorkerTask[] = [
  { type: 'walk', target: developerOfficeAnchors.researcherDesk },
  { type: 'work', durationMs: 5_800, direction: 'north' },
  { type: 'walk', target: developerOfficeAnchors.printer },
  { type: 'idle', durationMs: 2_400, direction: 'south' },
  { type: 'walk', target: developerOfficeAnchors.researcherDesk },
  { type: 'work', durationMs: 6_400, direction: 'north' },
  { type: 'walk', target: developerOfficeAnchors.entrance },
  { type: 'idle', durationMs: 1_900, direction: 'east' },
]

export function createWorkers(): WorkerEntity[] {
  return [
    {
      id: 'worker-01',
      roomId: 'developer-office',
      role: 'researcher',
      position: { ...developerOfficeAnchors.entrance },
      state: 'walking',
      direction: 'east',
      speed: 0.58,
      routine: researcherRoutine.map((task) => (
        task.type === 'walk'
          ? { ...task, target: { ...task.target } }
          : { ...task }
      )),
      currentTaskIndex: 0,
      taskElapsedMs: 0,
      stateStartedAtMs: 0,
      sprite: {
        assetId: 'researcher-worker',
        animationState: 'walking',
        direction: 'east',
        animationStartedAtMs: 0,
      },
    },
  ]
}
