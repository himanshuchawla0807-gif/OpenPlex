import type { AnimationState } from '../engine/animation'
import type { RoomObject } from '../types/world'
import { renderCommonObject } from './objects/commonObjects'
import { renderCreativeObject } from './objects/creativeObjects'
import { renderMusicObject } from './objects/musicObjects'

export function renderRoomObject(
  ctx: CanvasRenderingContext2D,
  object: RoomObject,
  animation: AnimationState,
): void {
  if (renderCommonObject(ctx, object, animation)) return
  if (renderCreativeObject(ctx, object)) return
  renderMusicObject(ctx, object, animation)
}
