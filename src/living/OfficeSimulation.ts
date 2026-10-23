import { officeSpots, officeTeam } from './officeTeamData.ts'
import type { TeamMember, OfficeSpot } from './officeTeamData.ts'
import { personClearance, planOfficePath } from './OfficeNavigation.ts'
import type { Point } from '../types/geometry'
import {walkingSpeed} from './workstations.ts'
import {angleDifference} from './characterPose.ts'
import type {WorkstationAlignment} from './workstations.ts'

export type OfficeActivity = 'WORKING' | 'WALKING' | 'TASK' | 'WAITING' | 'TALKING' | 'LISTENING' | 'PRESENTING' | 'RISING' | 'SETTLING'
export type WorkMode = 'typing' | 'reading' | 'writing' | 'inspecting'
export interface OfficeActor extends TeamMember {
  foot: Point; spot: string; destination: string; state: OfficeActivity; facing: number
  route: Point[]; segment: number; until: number; distance: number; trips: number; talks: number
  arrivedAt: number; workMode: WorkMode; gestureAt: number; gestureUntil: number
  gesturePeriod: number; gesturePhase: number; modeUntil: number; speed: number
  blockedSince: number; replanAt: number; lastTask: string; lastSocial: number; lastBriefing: number
  velocity:number; transitionAt:number; previousFacing:number; turnAt:number
  previousFoot:Point;previousDistance:number;heading:number;previousHeading:number;motion:number;previousMotion:number
}
const lookup = new Map(officeSpots.map(p => [p.id,p]))
const dist = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y)
const modes: WorkMode[] = ['typing','reading','writing','inspecting']
export function officeRoute(from: string,to: string): Point[] {
  const a=lookup.get(from),b=lookup.get(to)
  if(!a||!b)throw new Error('Unknown office spot '+from+'/'+to)
  const route=planOfficePath(a,b)
  if(!route)throw new Error('No clear floor route '+from+'/'+to)
  return route
}
interface Gathering { ids: string[]; targets: Map<string,string>; leader: string; until: number; deadline: number }
export interface OfficeSimulationConfig {
  members: TeamMember[]; spots: OfficeSpot[]
  navigate: (start:Point,goal:Point,occupied?:readonly Point[])=>Point[]|null
  workstations?:Record<string,WorkstationAlignment>
  staggerStart?:boolean
  workDuration?:readonly [number,number]
  minimumWorkDuration?:number
  maxAway?:number
  speedScale?:number
  clearance?:number
}

/** Decisions, gestures and social events have independent deadlines; travel is constrained by the floor. */
export class OfficeSimulation {
  readonly actors: OfficeActor[]
  time=0
  renderAlpha=1
  lastDelta=1/60
  briefings=0
  conversations=0
  phase: 'work' | 'gathering' | 'briefing' = 'work'
  lastBriefingSize=0
  private meetingAt: number
  private chatAt: number
  private gathering: Gathering | null=null
  private chat: Gathering | null=null
  private readonly random: () => number
  private readonly spots: OfficeSpot[]
  private readonly lookup: Map<string,OfficeSpot>
  private readonly navigate: OfficeSimulationConfig['navigate']
  readonly workstations:Record<string,WorkstationAlignment>
  readonly clearance:number
  private readonly workDuration:readonly [number,number]
  private readonly minimumWorkDuration:number
  private readonly maxAway:number
  get briefingParticipants(): readonly string[] { return this.gathering?.ids??[] }

  constructor(random: () => number=Math.random, config?: OfficeSimulationConfig) {
    this.random=random
    this.workDuration=config?.workDuration??[90,210]
    this.minimumWorkDuration=config?.minimumWorkDuration??90
    this.maxAway=config?.maxAway??4
    this.spots=config?.spots??officeSpots
    this.lookup=new Map(this.spots.map(p=>[p.id,p]))
    this.navigate=config?.navigate??planOfficePath
    this.workstations=config?.workstations??{}
    this.clearance=config?.clearance??personClearance
    this.meetingAt=this.range(170,250);this.chatAt=this.range(105,155)
    this.actors=(config?.members??officeTeam).map(member=>({...member,foot:{...this.lookup.get(member.home)!},
      spot:member.home,destination:member.home,state:'WORKING',facing:this.lookup.get(member.home)!.facing??1,
      route:[],segment:0,until:this.range(...this.workDuration),distance:0,trips:0,talks:0,arrivedAt:0,
      workMode:this.pick(modes),gestureAt:this.range(0,12),gestureUntil:0,gesturePeriod:this.range(0.27,0.58),
      gesturePhase:this.random()*5,modeUntil:this.range(14,32),speed:this.range(36,45)*(config?.speedScale??1),
      blockedSince:0,replanAt:0,lastTask:'',lastSocial:-Infinity,lastBriefing:-Infinity,
      previousFoot:{...this.lookup.get(member.home)!},previousDistance:0,heading:0,previousHeading:0,motion:0,previousMotion:0,
      velocity:0,transitionAt:0,previousFacing:this.lookup.get(member.home)!.facing??1,turnAt:-Infinity}))
    for(const actor of this.actors){actor.facing=this.workstations[actor.home]?.facing??actor.facing;actor.previousFacing=actor.facing
      const station=this.workstations[actor.home]
      actor.heading=station?Math.atan2(station.interaction.y-station.chairSeat.y,station.interaction.x-station.chairSeat.x):Math.atan2(-0.5,-actor.facing)
      actor.previousHeading=actor.heading
    }
    for(const actor of this.actors){const choices=this.workstations[actor.home]?.modes;if(choices)actor.workMode=this.pick(choices)}
    // Opening the page joins an ongoing shift, rather than resetting ten synchronized work sessions.
    if(config?.staggerStart)for(const actor of this.actors){
      const elapsed=this.range(this.minimumWorkDuration,this.workDuration[1]);actor.arrivedAt=-elapsed
      actor.until=4+actor.row*1.9+this.range(0,6)
    }
  }
  private range(a:number,b:number):number{return a+this.random()*(b-a)}
  private pick<T>(items:readonly T[]):T{return items[Math.floor(this.random()*items.length)]}
  private shuffled<T>(items:readonly T[]):T[]{
    const result=[...items]
    for(let i=result.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
    return result
  }
  private reserved(id:string):boolean{return Boolean(this.gathering?.ids.includes(id)||this.chat?.ids.includes(id))}
  private eligible(a:OfficeActor):boolean {
    return !a.route.length&&a.spot===a.home&&this.time-a.arrivedAt>=this.minimumWorkDuration&&!this.reserved(a.id)
  }

  update(delta:number):void {
    if(!Number.isFinite(delta)||delta<=0)return
    const dt=Math.min(delta,0.1);this.time+=dt;this.lastDelta=dt
    for(const actor of this.actors) {
      actor.previousFoot={...actor.foot};actor.previousDistance=actor.distance;actor.previousHeading=actor.heading;actor.previousMotion=actor.motion
      if(actor.state==='RISING') {
        if(this.time-actor.transitionAt>=1.1)actor.state='WALKING'
      } else if(actor.state==='SETTLING') {
        if(this.time-actor.transitionAt>=1.1){actor.state='WORKING';actor.arrivedAt=this.time;actor.until=this.time+this.range(...this.workDuration)}
      } else if(actor.route.length)this.walk(actor,dt)
      this.updateHeading(actor,dt)
      actor.motion+=(actor.velocity/actor.speed-actor.motion)*(1-Math.exp(-dt*12))
      this.updateGesture(actor)
    }
    this.updateBriefing()
    this.updateChat()
    for(const actor of this.actors) {
      if(actor.route.length||actor.state==='SETTLING'||this.reserved(actor.id)||this.time<actor.until)continue
      if(actor.spot!==actor.home){this.tryTravel(actor,actor.home);continue}
      if(this.actors.filter(a=>a.route.length||a.spot!==a.home).length>=this.maxAway){actor.until=this.time+this.range(3,7);continue}
      const choices=this.spots.filter(p=>p.kind==='task'&&p.id!==actor.lastTask&&!this.actors.some(a=>a.destination===p.id))
      if(choices.length) {
        const destination=this.pick(choices).id
        if(this.tryTravel(actor,destination))actor.lastTask=destination
      }else actor.until=this.time+this.range(15,30)
    }
  }

  private updateGesture(actor:OfficeActor):void {
    if(actor.state==='WORKING'&&this.time>=actor.modeUntil) {
      const choices=this.workstations[actor.home]?.modes??modes
      actor.workMode=this.pick(choices.filter(mode=>mode!==actor.workMode));actor.modeUntil=this.time+this.range(14,35)
    }
    if(this.time>=actor.gestureAt) {
      actor.gestureUntil=this.time+this.range(2,3.5)
      actor.gestureAt=actor.gestureUntil+this.range(5,17)
      actor.gesturePeriod=this.range(0.27,0.58);actor.gesturePhase=this.random()*5
    }
  }

  private updateBriefing():void {
    if(!this.gathering&&this.time>=this.meetingAt&&!this.chat) {
      const available=this.shuffled(this.actors.filter(a=>this.eligible(a)))
        .sort((a,b)=>a.lastBriefing-b.lastBriefing)
      const leader=available.find(a=>a.senior)
      if(!leader||this.actors.length<3){this.meetingAt=this.time+this.range(12,25);return}
      const candidates=available.length>=3?available:[...available,...this.shuffled(this.actors.filter(a=>!available.includes(a)&&!this.reserved(a.id)))]
      const members=[leader,...candidates.filter(a=>a!==leader).slice(0,Math.min(candidates.length-1,2+Math.floor(this.random()*3)))]
      const targets=new Map(members.map((a,i)=>[a.id,i===0?'leader':'line-'+(i-1)]))
      this.gathering={ids:members.map(a=>a.id),targets,leader:leader.id,until:Infinity,deadline:this.time+240}
      this.phase='gathering'
      members.forEach(a=>{a.until=this.time+this.range(1,9)})
    }
    const group=this.gathering
    if(!group)return
    const members=this.actors.filter(a=>group.ids.includes(a.id))
    if(this.time>group.deadline){this.finishGroup(group);this.gathering=null;this.phase='work';this.meetingAt=this.time+this.range(160,250);return}
    if(this.phase==='gathering') {
      for(const actor of members) {
        if(actor.route.length||actor.spot===group.targets.get(actor.id)||this.time<actor.until)continue
        // Invitations wait for a complete work session; an off-site task returns home first.
        if(actor.spot!==actor.home)this.tryTravel(actor,actor.home)
        else if(this.time-actor.arrivedAt>=this.minimumWorkDuration&&actor.state==='WORKING')this.tryTravel(actor,group.targets.get(actor.id)!)
      }
      if(members.every(a=>!a.route.length&&a.spot===group.targets.get(a.id))) {
        this.phase='briefing';group.until=this.time+this.range(18,28);this.briefings++;this.lastBriefingSize=members.length
        members.forEach(a=>{a.state=a.id===group.leader?'PRESENTING':'LISTENING';a.lastBriefing=this.time;this.face(a,this.lookup.get(a.spot)?.facing??1)})
      }
    }else if(this.time>=group.until) {
      this.finishGroup(group);this.gathering=null;this.phase='work';this.meetingAt=this.time+this.range(170,280)
    }
  }

  private updateChat():void {
    if(this.chat) {
      const group=this.chat,members=this.actors.filter(a=>group.ids.includes(a.id))
      for(const a of members)if(!a.route.length&&a.spot!==group.targets.get(a.id)&&this.time>=a.until)this.tryTravel(a,group.targets.get(a.id)!)
      if(members.every(a=>!a.route.length&&a.spot===group.targets.get(a.id))&&group.until===Infinity) {
        group.until=this.time+this.range(10,18);this.conversations++
        const center=members.reduce((sum,a)=>sum+a.foot.x,0)/members.length
        members.forEach(a=>{a.state='TALKING';a.talks++;a.lastSocial=this.time;this.face(a,a.foot.x<center?-1:1)})
      }
      if(this.time>=group.until||this.time>group.deadline) {
        this.finishGroup(group);this.chat=null;this.chatAt=this.time+this.range(95,165)
      }
      return
    }
    if(this.gathering||this.time<this.chatAt)return
    const available=this.shuffled(this.actors.filter(a=>this.eligible(a)&&this.time-a.lastSocial>150))
    if(available.length<2){this.chatAt=this.time+this.range(12,26);return}
    const count=Math.min(available.length,this.random()<0.3?3:2),members=available.slice(0,count)
    this.chat={ids:members.map(a=>a.id),targets:new Map(members.map((a,i)=>[a.id,'chat-'+['a','b','c'][i]])),leader:'',until:Infinity,deadline:this.time+130}
    members.forEach(a=>{a.until=this.time+this.range(1,7)})
  }
  private finishGroup(group:Gathering):void {
    for(const a of this.actors.filter(a=>group.ids.includes(a.id))) {
      if(a.route.length)continue
      a.state='WAITING';a.until=this.time+this.range(1,10)
    }
  }

  private tryTravel(actor:OfficeActor,destination:string):boolean {
    if(this.actors.some(a=>a!==actor&&a.destination===destination)){actor.until=this.time+this.range(3,8);return false}
    const occupied=this.actors.filter(a=>a!==actor).map(a=>a.foot)
    const path=this.navigate(actor.foot,this.lookup.get(destination)!,occupied)
    if(!path){actor.until=this.time+this.range(3,8);return false}
    const seated=actor.state==='WORKING'
    actor.route=path;actor.destination=destination;actor.segment=1;actor.state=seated?'RISING':'WALKING';actor.trips++
    actor.transitionAt=this.time;actor.velocity=0
    actor.blockedSince=0;actor.replanAt=this.time+this.range(2,4)
    return true
  }

  private walk(actor:OfficeActor,dt:number):void {
    let target=actor.route[actor.segment]
    if(!target){this.arrive(actor);return}
    let total=dist(actor.foot,target)
    for(let i=actor.segment;i<actor.route.length-1;i++)total+=dist(actor.route[i],actor.route[i+1])
    actor.velocity=walkingSpeed(actor.velocity,actor.speed,total,dt)
    let budget=actor.velocity*dt
    // Consume the entire distance budget across short curve samples. Discarding the remainder
    // at every waypoint produced the visible stop/start cadence around furniture.
    while(budget>1e-8&&actor.route.length) {
      target=actor.route[actor.segment]
      if(!target){this.arrive(actor);return}
      const remaining=dist(actor.foot,target)
      if(remaining<1e-8){actor.segment++;continue}
      const step=Math.min(remaining,budget)
      const next={x:actor.foot.x+(target.x-actor.foot.x)/remaining*step,y:actor.foot.y+(target.y-actor.foot.y)/remaining*step}
      const blocker=this.actors.find(a=>a!==actor&&dist(a.foot,next)<this.clearance)
    if(blocker) {
      actor.blockedSince ||= this.time
      actor.velocity=0
      if(this.time>=actor.replanAt) {
        const path=this.navigate(actor.foot,this.lookup.get(actor.destination)!,this.actors.filter(a=>a!==actor).map(a=>a.foot))
        if(path){actor.route=path;actor.segment=1}
        else if(blocker.route.length&&actor.id>blocker.id&&this.time-actor.blockedSince>1.5) {
          // One participant steps into clear floor; never reset their destination or teleport.
          const occupied=this.actors.filter(a=>a!==actor).map(a=>a.foot)
          const stationary=this.actors.filter(a=>a!==actor&&!a.route.length).map(a=>a.foot)
          const dx=target.x-actor.foot.x,dy=target.y-actor.foot.y,length=Math.hypot(dx,dy)||1
          for(const side of [1,-1]) {
            const radius=this.clearance*2.1
            const refuge={x:actor.foot.x-dy/length*radius*side-dx/length*20,y:actor.foot.y+dx/length*radius*side-dy/length*20}
            const out=this.navigate(actor.foot,refuge,occupied)
            const back=out&&this.navigate(refuge,this.lookup.get(actor.destination)!,stationary)
            if(out&&back){actor.route=[...out,...back.slice(1)];actor.segment=1;break}
          }
        }
        actor.replanAt=this.time+this.range(2,5)
      }
      return
    }
      actor.blockedSince=0
      if(Math.abs(target.x-actor.foot.x)>2)this.face(actor,target.x<actor.foot.x?1:-1)
      actor.foot=next;actor.distance+=step;budget-=step
      if(remaining<=step+1e-8){actor.segment++;if(actor.segment>=actor.route.length){this.arrive(actor);return}}
    }
  }

  private updateHeading(actor:OfficeActor,dt:number):void {
    let angle=actor.heading
    const station=this.workstations[actor.spot]
    if(actor.state==='WORKING'||actor.state==='SETTLING'||actor.state==='RISING') {
      if(station)angle=Math.atan2(station.interaction.y-station.chairSeat.y,station.interaction.x-station.chairSeat.x)
    } else if(actor.route.length) {
      // Look ahead by a fraction of a stride, not at each tiny navigation sample.
      let from=actor.foot,remaining=actor.height*0.16,goal=actor.route[actor.segment]??from
      for(let n=actor.segment;n<actor.route.length;n++) {
        const next=actor.route[n],length=dist(from,next)
        if(length>=remaining){goal={x:from.x+(next.x-from.x)*remaining/(length||1),y:from.y+(next.y-from.y)*remaining/(length||1)};break}
        remaining-=length;from=next;goal=next
      }
      if(dist(actor.foot,goal)>0.1)angle=Math.atan2(goal.y-actor.foot.y,goal.x-actor.foot.x)
    } else angle=Math.atan2(-0.5,-actor.facing)
    actor.heading+=angleDifference(actor.heading,angle)*(1-Math.exp(-dt*10))
  }
  private arrive(actor:OfficeActor):void {
    actor.spot=actor.destination;actor.route=[];actor.segment=0;actor.arrivedAt=this.time
    const spot=this.lookup.get(actor.spot)!
    actor.foot={x:spot.x,y:spot.y};this.face(actor,this.workstations[spot.id]?.facing??spot.facing??1)
    actor.velocity=0;actor.transitionAt=this.time
    actor.state=spot.kind==='seat'?'SETTLING':spot.kind==='task'?'TASK':'WAITING'
    actor.until=this.time+(spot.kind==='seat'?this.range(...this.workDuration):this.range(6,15))
  }
  private face(actor:OfficeActor,facing:number):void {
    if(facing!==actor.facing){actor.previousFacing=actor.facing;actor.facing=facing;actor.turnAt=this.time}
  }
}
