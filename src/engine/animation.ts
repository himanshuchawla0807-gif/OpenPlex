export interface AnimationState {
  elapsed: number
  screenGlow: number
  lampGlow: number
  plantSway: number
  cursorVisible: boolean
  speakerPulse: number
  indicatorPhase: number
}

export function getAnimationState(timestamp: number): AnimationState {
  const elapsed = timestamp / 1000
  return {
    elapsed,
    screenGlow: 0.72 + Math.sin(elapsed * 2.4) * 0.14 + (Math.sin(elapsed * 0.85) > 0.96 ? 0.14 : 0),
    lampGlow: 0.82 + Math.sin(elapsed * 1.6) * 0.1,
    plantSway: Math.sin(elapsed * 1.25) * 0.055,
    cursorVisible: Math.floor(elapsed * 2.2) % 2 === 0,
    speakerPulse: 0.5 + Math.sin(elapsed * 3.8) * 0.5,
    indicatorPhase: (elapsed * 1.7) % 1,
  }
}
