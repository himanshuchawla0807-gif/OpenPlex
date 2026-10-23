import type {Point} from '../types/geometry'
import type {OfficeActor} from './OfficeSimulation.ts'
import type {WorkstationAlignment} from './workstations.ts'
import {smoothstep} from './workstations.ts'

export const mix=(a:number,b:number,t:number)=>a+(b-a)*t
export const mixPoint=(a:Point,b:Point,t:number):Point=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)})
const add=(a:Point,x:number,y:number):Point=>({x:a.x+x,y:a.y+y})
export const angleDifference=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a))

/** Analytic two-bone IK: the wrist/ankle is a constraint, never a frame-specific estimate. */
export function solveJoint(root:Point,end:Point,upper:number,lower:number,bend=1):Point {
  const dx=end.x-root.x,dy=end.y-root.y,d=Math.max(0.0001,Math.hypot(dx,dy))
  // A very small authored reach correction is preferable to a hand floating off its desk.
  const reach=Math.max(1,d/(upper+lower-0.001));upper*=reach;lower*=reach
  const along=(upper*upper-lower*lower+d*d)/(2*d)
  const height=Math.sqrt(Math.max(0,upper*upper-along*along))*bend
  return {x:root.x+dx/d*along-dy/d*height,y:root.y+dy/d*along+dx/d*height}
}

export interface RigLimb {root:Point;joint:Point;end:Point;side:number}
export interface CharacterPose {
  hip:Point;chest:Point;head:Point;ground:Point;heading:number;seated:number;height:number
  legs:RigLimb[];arms:RigLimb[];breath:number;handActivity:number
}

/** One stride contains a planted stance and a smooth swing with matching endpoint velocity. */
export function strideOffset(phase:number,length:number):{along:number;lift:number;planted:boolean} {
  const p=((phase%1)+1)%1,stance=0.62
  if(p<stance)return {along:length*(stance/2-p),lift:0,planted:true}
  const t=(p-stance)/(1-stance),t2=t*t,t3=t2*t
  const a=-stance/2,b=stance/2,m=-(1-stance)
  const along=((2*t3-3*t2+1)*a+(t3-2*t2+t)*m+(-2*t3+3*t2)*b+(t3-t2)*m)*length
  return {along,lift:Math.sin(Math.PI*t)**2,planted:false}
}

export function characterPose(actor:OfficeActor,station:WorkstationAlignment|undefined,time:number,reduced=false,alpha=1):CharacterPose {
  const h=actor.height,ground=mixPoint(actor.previousFoot,actor.foot,alpha)
  const heading=actor.previousHeading+angleDifference(actor.previousHeading,actor.heading)*alpha
  const forward={x:Math.cos(heading),y:Math.sin(heading)}
  const side={x:-forward.y,y:forward.x*0.38}
  const transition=smoothstep((time-actor.transitionAt)/1.1)
  const seated=station?(actor.state==='WORKING'?1:actor.state==='RISING'?1-transition:actor.state==='SETTLING'?transition:0):0
  const motion=reduced?0:mix(actor.previousMotion,actor.motion,alpha)
  const distance=mix(actor.previousDistance,actor.distance,alpha),stride=h*0.42
  const phase=distance/stride+actor.row*0.137
  const breath=reduced?0:Math.sin(time*1.65+actor.gesturePhase)
  const hipStanding=add(ground,0,-h*0.455-Math.sin(phase*Math.PI*4)**2*h*0.009*motion)
  const hip=station?mixPoint(hipStanding,station.chairSeat,seated):hipStanding
  const lean=seated*0.055+motion*0.018
  const chest=add(hip,forward.x*h*lean, -h*(0.31+0.03*seated)+forward.y*h*lean*0.23-breath*h*0.002)
  const head=add(chest,forward.x*h*0.013,-h*0.014)
  const active=reduced?0:smoothstep((actor.gestureUntil-time)/0.3)
  const handActivity=active*(0.5+0.5*Math.sin(time*5+actor.gesturePhase))
  const legs:RigLimb[]=[],arms:RigLimb[]=[]
  for(const sign of [-1,1]) {
    const offset=strideOffset(phase+(sign===1?0.5:0),stride)
    const root=add(hip,side.x*h*0.047*sign,side.y*h*0.047*sign)
    const walkingEnd=add(ground,side.x*h*0.057*sign+forward.x*offset.along*motion,
      side.y*h*0.057*sign+forward.y*offset.along*motion-offset.lift*h*0.07*motion)
    const seatEnd=add(hip,forward.x*h*0.205+side.x*h*0.045*sign,
      h*0.315+forward.y*h*0.02+side.y*h*0.045*sign)
    const end=mixPoint(walkingEnd,seatEnd,seated)
    const walkKnee=solveJoint(root,end,h*0.24,h*0.235,forward.x>=0?-1:1)
    const seatKnee=add(hip,forward.x*h*0.19+side.x*h*0.045*sign,
      h*0.085+side.y*h*0.045*sign)
    legs.push({root,joint:mixPoint(walkKnee,seatKnee,seated),end,side:sign})

    const shoulder=add(chest,side.x*h*0.105*sign,side.y*h*0.105*sign)
    const swing=Math.sin((phase+(sign===1?0.5:0))*Math.PI*2)*motion
    let wrist=add(hip,side.x*h*0.13*sign+forward.x*swing*h*0.12,
      h*0.025+side.y*h*0.13*sign-forward.y*swing*h*0.07)
    if((actor.state==='PRESENTING'||actor.state==='TALKING')&&sign===1) {
      wrist=add(wrist,forward.x*h*0.045*handActivity,-h*0.06*handActivity)
    }
    if(station&&seated>0) {
      const tap=reduced?0:Math.sin(time*(actor.workMode==='typing'?11:4)+sign*1.8+actor.gesturePhase)*(actor.workMode==='typing'?0.28:0.12)*active
      const deskHand=add(station.interaction,side.x*h*0.048*sign,side.y*h*0.048*sign+tap)
      wrist=mixPoint(wrist,deskHand,seated)
    }
    let elbow=solveJoint(shoulder,wrist,h*0.215,h*0.205,wrist.x>=shoulder.x?1:-1)
    if(station&&station.surface!=='lap'&&seated>0) {
      // In this elevated isometric camera an upper arm is foreshortened. Its elbow rests
      // near the desk edge; solving a flat, full-length arm curled the wrist toward the face.
      const supported={x:shoulder.x+(wrist.x-shoulder.x)*0.3,y:Math.max(shoulder.y+h*0.10,wrist.y+h*0.026)}
      elbow=mixPoint(elbow,supported,seated)
    }
    arms.push({root:shoulder,joint:elbow,end:wrist,side:sign})
  }
  return {hip,chest,head,ground,heading,seated,height:h,legs,arms,breath,handActivity}
}
