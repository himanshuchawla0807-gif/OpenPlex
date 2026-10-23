import type { Point } from '../types/geometry'

export type Activity = 'WORKING' | 'READING' | 'INSPECTING' | 'OBSERVING'
export type CharacterState = Activity | 'IDLE' | 'WALKING' | 'RETURNING' | 'TALKING'
export type Polygon = [number, number][]
export interface ActivityPoint {
  id: string
  foot: Point
  activity?: Activity
  facing?: number
  task?: 'study' | 'handle' | 'observe'
}
export interface CharacterDefinition {
  id: string
  gender: 'man' | 'woman'
  start: string
  preferences: string[]
  height: number
}
export interface Cutout {
  id: string
  polygon: Polygon
  depth: number
}
export interface AmbientDefinition {
  id: string
  kind: 'paper' | 'leaf' | 'lamp' | 'cursor' | 'wheel' | 'tool' | 'screen' | 'printer' | 'whiteboard' | 'coffee'
  sourcePolygon?: Polygon
  polygon: Polygon
  pivot: Point
  depth: number
  minDelay: number
  maxDelay: number
  duration: number
  amplitude: number
  activity?: string
  probability?: number
}
export interface LivingRoomDefinition {
  roomId: string
  sheet: string
  repair?: { source: string; masks: Polygon[] }
  points: ActivityPoint[]
  edges: [string, string][]
  characters: [CharacterDefinition, CharacterDefinition]
  foreground: Cutout[]
  ambient: AmbientDefinition[]
}
export interface Journey {
  points: Point[]
  segment: number
  elapsed: number
  duration: number
  lengths: number[]
  destination: string
  purpose: 'activity' | 'visit' | 'return'
}
export interface LivingCharacter extends CharacterDefinition {
  roomId: string
  pointId: string
  foot: Point
  state: CharacterState
  facing: number
  back: boolean
  dwellUntil: number
  actionAt: number
  actionUntil: number
  journey?: Journey
  gait: number
  distance: number
  trips: number
  talks: number
  walkingSeconds: number
  returnPoint?: string
  arrivedAt: number
  currentDwellDuration: number
  lastActivity: string | null
  recentActivities: { id: string; at: number }[]
  recentTransitions: { from: string; to: string; at: number }[]
  lastMovementTime: number
  recentDestination: string
  lastConversationTime: number
  completedActivities: number
  actionStartedAt: number
  pose: number
  nextDecisionAt: number
}
export interface AmbientEvent {
  definition: AmbientDefinition
  nextAt: number
  startedAt: number
  active: boolean
  value: number
  starts: number
}
