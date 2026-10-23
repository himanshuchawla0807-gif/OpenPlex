import type { Point } from '../types/geometry'

export type Polygon = readonly (readonly [number, number])[]
export const officeFloor: Polygon = [[65,523],[730,198],[1490,590],[1490,690],[1030,955],[1000,940],[904,995],[730,880],[600,950]]
// Ground footprints, including the glass meeting-room boundary. These do not alter any artwork.
export const officeFurniture: readonly Polygon[] = [
  [[484,490],[789,355],[815,385],[520,520]],
  [[644,610],[949,475],[980,508],[678,644]],
  [[950,390],[1149,507],[1322,418],[1120,302]],
  [[272,579],[337,548],[395,583],[329,621]],
  [[656,254],[760,204],[813,230],[709,289]],
  [[462,335],[513,310],[544,329],[492,358]],
  [[146,428],[276,370],[367,439],[263,495]],
  [[798,747],[1021,632],[1138,746],[963,850]],
  [[649,784],[674,763],[798,827],[769,890],[650,822]],
  [[470,703],[536,669],[600,700],[546,767]],
  [[1280,565],[1312,549],[1494,632],[1472,664]],
]
export const personClearance = 23
const grid = 12
export function createRoomNavigator(floor: Polygon, furniture: readonly Polygon[], clearance=personClearance) {
const walkableCache = new Map<string,boolean>()
const segmentCache = new Map<string,boolean>()
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y)
function inside(p: Point, polygon: Polygon): boolean {
  let hit=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j]
    if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit
  }
  return hit
}
function edgeDistance(p: Point,a: readonly number[],b: readonly number[]): number {
  const dx=b[0]-a[0],dy=b[1]-a[1]
  const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)))
  return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy)
}
function isOfficeWalkable(p: Point): boolean {
  const key=p.x+','+p.y
  if(walkableCache.has(key))return walkableCache.get(key)!
  const result=inside(p,floor)&&!furniture.some(polygon=>inside(p,polygon)||polygon.some((a,i)=>edgeDistance(p,a,polygon[(i+1)%polygon.length])<5))
  // Cache the fixed navigation grid only; continuous animation positions must not grow this cache.
  if(p.x%grid===0&&p.y%grid===0)walkableCache.set(key,result)
  return result
}
const clearSegment = (a: Point,b: Point,occupied: readonly Point[]) => {
  if(occupied.some(q=>edgeDistance(q,[a.x,a.y],[b.x,b.y])<clearance))return false
  const key=[a.x,a.y,b.x,b.y].join(',')
  if(segmentCache.has(key))return segmentCache.get(key)!
  const result=staticClearSegment(a,b)
  if(a.x%grid===0&&a.y%grid===0&&b.x%grid===0&&b.y%grid===0)segmentCache.set(key,result)
  return result
}
function staticClearSegment(a: Point,b: Point): boolean {
  const start=[a.x,a.y],end=[b.x,b.y]
  if(furniture.some(polygon=>polygon.some((p,i)=>{
    const q=polygon[(i+1)%polygon.length]
    return Math.min(edgeDistance(a,p,q),edgeDistance(b,p,q),edgeDistance({x:p[0],y:p[1]},start,end),edgeDistance({x:q[0],y:q[1]},start,end))<5
  })))return false
  const steps=Math.max(1,Math.ceil(distance(a,b)/4))
  for(let i=0;i<=steps;i++) {
    const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}
    if(!isOfficeWalkable(p))return false
  }
  return true
}

/** Small static floor grid with temporary coworker obstacles; diagonal corner cutting is prohibited. */
function planOfficePath(start: Point,goal: Point,occupied: readonly Point[] = []): Point[] | null {
  if(!isOfficeWalkable(start)||!isOfficeWalkable(goal))return null
  const key=(x:number,y:number)=>`${x},${y}`
  const point=(id:string):Point=>{const [x,y]=id.split(',').map(Number);return {x:x*grid,y:y*grid}}
  const valid=(p:Point)=>isOfficeWalkable(p)&&!occupied.some(q=>distance(p,q)<clearance)
  const nearby=(p:Point)=>{
    const points:Point[]=[]
    for(let x=Math.round(p.x/grid)-2;x<=Math.round(p.x/grid)+2;x++)for(let y=Math.round(p.y/grid)-2;y<=Math.round(p.y/grid)+2;y++) {
      const q={x:x*grid,y:y*grid};if(valid(q)&&clearSegment(p,q,occupied))points.push(q)
    }
    return points.sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,4)
  }
  const starts=nearby(start),ends=nearby(goal)
  if(!starts.length||!ends.length)return null
  const targets=new Set(ends.map(p=>key(p.x/grid,p.y/grid)))
  const pending=new Set<string>(),cost=new Map<string,number>(),prev=new Map<string,string>()
  for(const p of starts){const id=key(p.x/grid,p.y/grid);pending.add(id);cost.set(id,distance(start,p))}
  const closed=new Set<string>()
  while(pending.size) {
    let current='',best=Infinity
    for(const id of pending){const value=cost.get(id)!+distance(point(id),goal);if(value<best){current=id;best=value}}
    pending.delete(current)
    const p=point(current)
    if(targets.has(current)) {
      const result=[p]
      while(prev.has(current)){current=prev.get(current)!;result.unshift(point(current))}
      result.unshift({...start});result.push({...goal})
      // Keep a few corridor turns instead of exposing the grid as a zigzag walk.
      const smooth=[result[0]];let i=0
      while(i<result.length-1){let j=result.length-1;while(j>i+1&&!clearSegment(result[i],result[j],occupied))j--;smooth.push(result[j]);i=j}
      // Round only corners whose entire sampled arc retains floor and coworker clearance.
      // Tight corners keep the original safe route rather than cutting through a desk.
      const rounded:Point[]=[smooth[0]]
      for(let k=1;k<smooth.length-1;k++) {
        const a=smooth[k-1],b=smooth[k],c=smooth[k+1]
        const ab=distance(a,b),bc=distance(b,c),radius=Math.min(22,ab*0.25,bc*0.25)
        if(radius<2){rounded.push(b);continue}
        const entry={x:b.x+(a.x-b.x)*radius/ab,y:b.y+(a.y-b.y)*radius/ab}
        const exit={x:b.x+(c.x-b.x)*radius/bc,y:b.y+(c.y-b.y)*radius/bc}
        const arc=[entry]
        for(let n=1;n<=10;n++) {
          const t=n/10,u=1-t
          arc.push({x:u*u*entry.x+2*u*t*b.x+t*t*exit.x,y:u*u*entry.y+2*u*t*b.y+t*t*exit.y})
        }
        if(arc.every((point,n)=>clearSegment(n?arc[n-1]:rounded[rounded.length-1],point,occupied))&&clearSegment(exit,c,occupied))rounded.push(...arc)
        else rounded.push(b)
      }
      rounded.push(smooth[smooth.length-1])
      return rounded
    }
    closed.add(current)
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const q={x:p.x+dx*grid,y:p.y+dy*grid},id=key(q.x/grid,q.y/grid)
      if(closed.has(id)||!valid(q)||!clearSegment(p,q,occupied))continue
      const next=cost.get(current)!+distance(p,q)
      if(next<(cost.get(id)??Infinity)){cost.set(id,next);prev.set(id,current);pending.add(id)}
    }
  }
  return null
}
return {isWalkable:isOfficeWalkable,planPath:planOfficePath}
}
const officeNavigation=createRoomNavigator(officeFloor,officeFurniture)
export const isOfficeWalkable=officeNavigation.isWalkable
export const planOfficePath=officeNavigation.planPath

