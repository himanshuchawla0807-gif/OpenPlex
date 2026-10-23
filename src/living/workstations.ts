import type { Point } from '../types/geometry'

/** Native artwork pixels, never screen pixels. A chair's seat is not its floor anchor. */
export interface WorkstationAlignment {
  chairSeat: Point
  approach: Point
  interaction: Point
  surface?:'desk'|'lap'
  monitor?: Point
  facing: 1 | -1
  modes?:readonly ('typing'|'reading'|'writing'|'inspecting')[]
}
const seat=(x:number,y:number,ax:number,ay:number,ix:number,iy:number,facing:1|-1=1):WorkstationAlignment=>({
  chairSeat:{x,y},approach:{x:ax,y:ay},interaction:{x:ix,y:iy},facing,
})
export const workstations:Record<string,Record<string,WorkstationAlignment>>={
  'connected-office':{
    'desk-1':{...seat(609,500,609,538,573,473),monitor:{x:565,y:438}},
    'desk-3':{...seat(760,425,760,463,727,395),monitor:{x:721,y:369}},
    'desk-6':{...seat(934,541,934,581,905,500),monitor:{x:889,y:476}},
  },
  'collaboration-suite':{
    'suite-seat-1':{...seat(663,522,685,586,706,485,-1),modes:['reading','writing','inspecting']},
    'suite-seat-2':{...seat(783,583,793,651,778,520,-1),modes:['reading','writing','inspecting']},
    'suite-seat-3':{...seat(933,605,917,671,907,550),modes:['reading','writing','inspecting']},
  },
  'research-lab':{
    'lab-seat-1':{...seat(441,478,417,534,395,440),monitor:{x:372,y:381}},
    'lab-seat-2':{...seat(1250,524,1278,581,1286,487,-1),monitor:{x:1295,y:444}},
  },
  'design-studio':{
    'design-seat':{...seat(471,709,477,766,495,662,-1),monitor:{x:510,y:614}},
  },
  'team-lounge':{
    'lounge-seat':{...seat(1354,555,1317,620,1336,546),surface:'lap',modes:['reading','inspecting']},
  },
}

export function smoothstep(value:number):number {
  const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)
}

/** Acceleration-limited speed with distance-based braking; never ease the simulation's coordinates. */
export function walkingSpeed(current:number,cruise:number,remaining:number,dt:number,turn=1):number {
  const acceleration=95
  const target=Math.min(cruise*turn,Math.sqrt(Math.max(0,2*acceleration*remaining)))
  return current+Math.max(-acceleration*dt,Math.min(acceleration*dt,target-current))
}
