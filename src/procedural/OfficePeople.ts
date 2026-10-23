import {illustratedTasks} from '../characters/officeTasks.ts'
import {smooth} from '../characters/sceneMotion.ts'
import type {OfficeDefinition,Station} from './model.ts'
import {campusCast as characterStyles} from '../data/campusCast.ts'

export interface Position {i:number;j:number}
export interface EmployeeState extends Position {id:string;index:number;roomId:string;station:Station;mode:'walk'|'work'|'idle';facing:number;settle:number;distance:number;trips:number;di?:number;dj?:number;returning?:boolean;activity?:'typing'|'walking'|'task'|'rising'|'sitting';taskName?:string;destination?:string;taskProgress?:number;taskKind?:'coffee'|'reference'|'review';exit?:Position}
export const employeeAllocation=[[0,25,5,20,11,30,13,35,1,6,15,16],[7,17,21,31],[36,8,32,12],[10,22,26,2],[27,37],[28,3,23,14],[18,9,33,4],[29,34],[24,38],[19,39]]
const STEP=.25
// Plan with .29 clearance; retain .06 spare beyond the .23 foot clearance
// while simplifying and rounding corners between discrete grid samples.
const solid=new Set(['reservedlane','bench','desk','labdesk','designdesk','conference','table','server','cabinet','sofa','armchair','coffee','coffeebar','prototype','printer','counter','workbench','island','bookcase','glass','kitchenette','lockers','foosball','watercooler','mediaconsole','displaytable','flatfiles','contentrig','campaignboard','planningboard'])
const distance=(a:Position,b:Position)=>Math.hypot(a.i-b.i,a.j-b.j)
export const walkingDuration=(length:number)=>length/.7+.65
export function walkingDistance(length:number,time:number):number {
  const duration=walkingDuration(length),ramp=.65,t=Math.max(0,Math.min(duration,time))
  const ease=(s:number)=>.7*(s/2-ramp/(2*Math.PI)*Math.sin(Math.PI*s/ramp))
  if(t<ramp)return ease(t)
  if(t>duration-ramp)return length-ease(duration-t)
  return .7*(t-ramp/2)
}
function smoothOfficePath(def:OfficeDefinition,points:Position[],occupied:Position[]):Position[] {
  const allowed=(p:Position)=>isOfficeFloorFree(def,p,.29)&&occupied.every(s=>distance(s,p)>.58)
  const clear=(a:Position,b:Position)=>{
    const count=Math.ceil(distance(a,b)/.06)
    for(let k=0;k<=count;k++){const u=count?k/count:0;if(!allowed({i:a.i+(b.i-a.i)*u,j:a.j+(b.j-a.j)*u}))return false}
    return true
  }
  const simple:Position[]=[]
  for(let n=0;n<points.length;) {
    simple.push(points[n]);let next=n+1
    for(let k=points.length-1;k>n+1;k--)if(clear(points[n],points[k])){next=k;break}
    n=next
  }
  const result=[simple[0]]
  for(let n=1;n<simple.length-1;n++) {
    const a=simple[n-1],b=simple[n],c=simple[n+1],cut=Math.min(.32,distance(a,b)/3,distance(b,c)/3)
    const left={i:b.i+(a.i-b.i)*cut/distance(a,b),j:b.j+(a.j-b.j)*cut/distance(a,b)},right={i:b.i+(c.i-b.i)*cut/distance(b,c),j:b.j+(c.j-b.j)*cut/distance(b,c)}
    const arc=Array.from({length:9},(_,k)=>{const u=k/8,v=1-u;return {i:v*v*left.i+2*v*u*b.i+u*u*right.i,j:v*v*left.j+2*v*u*b.j+u*u*right.j}})
    if(arc.every(allowed))result.push(...arc)
    else result.push(b)
  }
  if(simple.length>1)result.push(simple.at(-1)!)
  return result
}
export function isOfficeFloorFree(def:OfficeDefinition,p:Position,margin=.23):boolean {
  return p.i>=.35&&p.j>=.35&&p.i<=def.width-.35&&p.j<=def.depth-.35&&!def.furniture.some(f=>solid.has(f.kind)&&p.i>f.i-margin&&p.i<f.i+f.w+margin&&p.j>f.j-margin&&p.j<f.j+f.d+margin)
}
/** Small world-coordinate A*: routes derive from the very same editable furniture. */
export function findOfficePath(def:OfficeDefinition,start:Position,end:Position,ownSeat?:Position):Position[] {
  const occupied=def.stations.filter(s=>distance(s,start)>.02&&distance(s,end)>.02&&(!ownSeat||distance(s,ownSeat)>.02))
  const cols=Math.round(def.width/STEP)+1,rows=Math.round(def.depth/STEP)+1
  const pos=(key:number):Position=>({i:key%cols*STEP,j:Math.floor(key/cols)*STEP})
  const key=(p:Position)=>Math.round(p.i/STEP)+Math.round(p.j/STEP)*cols
  const free=(k:number)=>k>=0&&k<cols*rows&&isOfficeFloorFree(def,pos(k),.29)&&occupied.every(s=>distance(s,pos(k))>.58)
  const nearest=(p:Position)=>{
    let closest=-1,d=Infinity
    for(let k=0;k<cols*rows;k++)if(free(k)){const n=distance(pos(k),p);if(n<d){closest=k;d=n}}
    return closest
  }
  const first=free(key(start))?key(start):nearest(start),last=free(key(end))?key(end):nearest(end)
  if(first<0||last<0)return []
  const open=[first],g=new Map([[first,0]]),parents=new Map<number,number>(),closed=new Set<number>()
  while(open.length) {
    let at=0,best=Infinity
    for(let i=0;i<open.length;i++){const cost=g.get(open[i])!+distance(pos(open[i]),pos(last));if(cost<best){at=i;best=cost}}
    const current=open.splice(at,1)[0]
    if(current===last){const chain=[last];while(parents.has(chain[0]))chain.unshift(parents.get(chain[0])!);return smoothOfficePath(def,[free(key(start))?start:pos(first),...chain.map(pos),free(key(end))?end:pos(last)].filter((p,k,arr)=>!k||distance(p,arr[k-1])>1e-5),occupied)}
    closed.add(current)
    const p=pos(current)
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const next=key({i:p.i+di*STEP,j:p.j+dj*STEP})
      if(!free(next)||closed.has(next)||di&&dj&&(!free(key({i:p.i+di*STEP,j:p.j}))||!free(key({i:p.i,j:p.j+dj*STEP}))))continue
      const cost=g.get(current)!+Math.hypot(di,dj)*STEP
      if(cost<(g.get(next)??Infinity)){parents.set(next,current);g.set(next,cost);if(!open.includes(next))open.push(next)}
    }
  }
  return []
}

interface TaskRoute {name:string;destination:string;kind:'coffee'|'reference'|'review';target:Position;points:Position[];lengths:number[];outward:number;length:number;hold:number;duration:number;facing:number}
const TRANSITION=1.2
export class OfficePeople {
 time=0
 private readonly routes=new Map<string,TaskRoute[]>()
 private readonly slots=new Map<string,number>()
 actors:EmployeeState[]=[]
 readonly definitions:OfficeDefinition[]
 constructor(definitions:OfficeDefinition[],staff?:Record<string,number[]>){
  this.definitions=definitions
  definitions.forEach((def,r)=>def.stations.forEach((station,k)=>{
   const index=staff?staff[def.id]?.[k]:employeeAllocation[r]?.[k];if(index===undefined)return
   const style=characterStyles[index],reverse=Boolean(station.reverse),clearance=def.id==='connected-office'&&station.i<4.5&&station.j>9?.4:.65
   const exit={i:station.i+(reverse?clearance:-clearance),j:station.j}
   const options:Array<{name:string;destination:string;kind:TaskRoute['kind'];target:Position;hold:number}>=[]
   if((def.templateId??def.id)==='connected-office'){
    const original=illustratedTasks[index]
    if(original)options.push({name:original.name,destination:original.destination,kind:'reference',target:{i:original.i,j:original.j},hold:original.hold})
    options.push({name:'Take a coffee break',destination:'main-team-coffee',kind:'coffee',target:{i:25.5,j:19},hold:10},{name:'Consult project reference',destination:'main-front-library',kind:'reference',target:{i:19.8,j:21.2},hold:12},{name:'Review material samples',destination:'main-sample-display',kind:'review',target:{i:4.4,j:19.8},hold:11})
   }else{
    options.push({name:'Consult reference notes',destination:`${def.templateId??def.id}-library`,kind:'reference',target:{i:1.7,j:4.9},hold:12},{name:'Make a fresh coffee',destination:`${def.templateId??def.id}-coffee`,kind:'coffee',target:{i:1.8,j:13.6},hold:10},{name:`Review ${def.name.toLowerCase()} work`,destination:`${def.templateId??def.id}-task-island`,kind:'review',target:{i:11.3,j:8.3},hold:13})
   }
   const built:TaskRoute[]=[]
   for(const option of options){
    if(!def.furniture.some(f=>f.id===option.destination))continue
    const outward=findOfficePath(def,exit,option.target,station),back=findOfficePath(def,option.target,exit,station)
    if(outward.length<2||back.length<2)continue
    const points=[...outward,...back.slice(1)],lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+distance(points[n-1],points[n]))
    let out=0;for(let n=1;n<outward.length;n++)out+=distance(outward[n-1],outward[n])
    const length=lengths.at(-1)!,object=def.furniture.find(f=>f.id===option.destination)!
    built.push({...option,points,lengths,outward:out,length,duration:walkingDuration(out)+option.hold+walkingDuration(length-out),facing:option.target.i>object.i+object.w?-1:1})
   }
   this.routes.set(staff?`${def.id}:${style.id}`:style.id,built)
   this.actors.push({id:staff?`${def.id}:${style.id}`:style.id,index,roomId:def.id,station,i:station.i,j:station.j,mode:'work',facing:station.facing,settle:1,distance:0,trips:0,exit})
  }))
  for(const def of definitions){const routes=this.actors.filter(a=>a.roomId===def.id).flatMap(a=>this.routes.get(a.id)??[]);this.slots.set(def.id,Math.max(24,...routes.map(r=>r.duration))+((def.templateId??def.id)==='connected-office'?24:40)+TRANSITION*2)}
 }
 update(delta:number,reduced=false){
  if(reduced)return
  this.time+=Math.max(0,Math.min(.05,delta))
  for(const a of this.actors){
   if(a.roomId==='connected-office'&&a.index===13){a.mode='work';continue}
   const def=this.definitions.find(d=>d.id===a.roomId)!,routes=this.routes.get(a.id)!,local=def.stations.indexOf(a.station),slot=this.slots.get(def.id)!,cycle=slot*def.stations.length,work=20+(this.definitions.indexOf(def)*7)%17,elapsed=this.time-local*slot,phase=((elapsed%cycle)+cycle)%cycle,trip=elapsed<0?0:Math.floor(elapsed/cycle)
   a.mode='work';a.activity='typing';a.taskName=a.station.role==='Meeting'?'Discuss the project plan':`Work on ${a.station.role??'assigned project'}`;a.destination=a.station.furnitureId;a.taskProgress=0;a.facing=a.station.facing;a.i=a.station.i;a.j=a.station.j;a.settle=1;a.distance=0;a.trips=trip
   if(elapsed<0||!routes.length)continue
   const route=routes[(trip+local)%routes.length],travelStart=work+TRANSITION,arrival=travelStart+route.duration
   if(phase>work&&phase<=travelStart){a.mode='idle';a.activity='rising';a.settle=(phase-work)/TRANSITION;a.returning=false;const u=smooth(a.settle/.3);a.i=a.station.i+(a.exit!.i-a.station.i)*u;continue}
   if(phase>=arrival&&phase<arrival+TRANSITION){a.mode='idle';a.activity='sitting';a.settle=1-(phase-arrival)/TRANSITION;a.returning=true;const u=smooth(a.settle/.3);a.i=a.station.i+(a.exit!.i-a.station.i)*u;continue}
   if(phase<=travelStart||phase>=arrival)continue
   const t=phase-travelStart,outTime=walkingDuration(route.outward),at=t>=outTime&&t<outTime+route.hold
   const travelled=t<outTime?walkingDistance(route.outward,t):at?route.outward:route.outward+walkingDistance(route.length-route.outward,t-outTime-route.hold)
   let edge=1;while(edge<route.lengths.length-1&&route.lengths[edge]<travelled)edge++
   const p=route.points[edge-1],q=route.points[edge],u=(travelled-route.lengths[edge-1])/Math.max(.00001,route.lengths[edge]-route.lengths[edge-1])
   a.i=p.i+(q.i-p.i)*u;a.j=p.j+(q.j-p.j)*u;a.di=q.i-p.i;a.dj=q.j-p.j;a.distance=travelled;a.mode=at?'idle':'walk';a.activity=at?'task':'walking';a.taskKind=route.kind;a.taskName=route.name;a.destination=route.destination;a.taskProgress=at?(t-outTime)/route.hold:0;a.facing=at?route.facing:((a.di-a.dj)>=0?1:-1);a.settle=at?1:0;a.returning=t>=outTime+route.hold
  }
 }
}
