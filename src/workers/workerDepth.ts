import { getSpriteAsset } from '../assets/sprites/manifest'
import type { DepthDescriptor } from '../engine/depth'
import type { WorkerEntity } from '../types/worker'

export function describeWorkerDepth(worker: WorkerEntity): DepthDescriptor {
  return {
    layer: worker.sprite.layer ?? getSpriteAsset(worker.sprite.assetId).layer,
    anchor: {
      x: worker.position.x,
      y: worker.position.y,
      z: worker.position.z ?? 0,
    },
  }
}
