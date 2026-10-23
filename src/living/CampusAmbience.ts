import type {AmbientSpec} from '../world/campusData'
import type {OfficeSimulation} from './OfficeSimulation'

interface EventState {next:number;started:number;duration:number;active:boolean;count:number}
export class CampusAmbience {
  private readonly events=new Map<string,EventState>()
  constructor(specs:AmbientSpec[]){for(const spec of specs)this.events.set(spec.id,{next:15+Math.random()*85,started:0,duration:3,active:false,count:0})}
  draw(ctx:CanvasRenderingContext2D,plate:CanvasImageSource,specs:AmbientSpec[],world:OfficeSimulation,reduced:boolean):void {
    if(reduced)return
    for(const spec of specs) {
      const event=this.events.get(spec.id)!,now=world.time
      if(event.active&&now>=event.started+event.duration){event.active=false;event.next=now+70+Math.random()*120}
      if(!event.active&&now>=event.next) {
        const related=world.actors.some(a=>spec.kind==='coffee'?a.spot.includes('coffee'):Math.hypot(a.foot.x-spec.x,a.foot.y-spec.y)<230||a.state==='PRESENTING')
        if(!spec.person||related){event.active=true;event.started=now;event.duration=2.5+Math.random()*2.5;event.count++}
        else event.next=now+12+Math.random()*18
      }
      if(!event.active)continue
      const strength=Math.sin((now-event.started)/event.duration*Math.PI)
      ctx.save()
      if(spec.kind==='leaf'||spec.kind==='paper') {
        ctx.translate(spec.x+spec.width/2,spec.y+spec.height/2)
        ctx.rotate(Math.sin((now-event.started)*2.1)*strength*(spec.kind==='leaf'?0.012:0.018))
        ctx.drawImage(plate,spec.x,spec.y,spec.width,spec.height,-spec.width/2,-spec.height/2,spec.width,spec.height)
      }else{
        ctx.beginPath();ctx.rect(spec.x,spec.y,spec.width,spec.height);ctx.clip()
        if(spec.kind==='screen') {
          ctx.fillStyle='rgba(123,191,181,'+(0.08*strength)+')';ctx.fillRect(spec.x,spec.y,spec.width,spec.height)
          ctx.fillStyle='rgba(224,204,143,'+(0.6*strength)+')'
          ctx.fillRect(spec.x+3,spec.y+spec.height*0.65,spec.width*0.3,1)
        }else if(spec.kind==='cursor') {
          if(Math.floor((now-event.started)*2)%2===0){ctx.fillStyle='rgba(237,219,154,'+strength+')';ctx.fillRect(spec.x+spec.width/2,spec.y+spec.height/2,3,1.5)}
        }else{
          ctx.fillStyle='rgba(230,190,103,'+(0.45*strength)+')';ctx.fillRect(spec.x+2,spec.y+2,Math.min(4,spec.width),2)
        }
      }
      ctx.restore()
    }
  }
  get stats(){return [...this.events].map(([id,e])=>({id,active:e.active,count:e.count}))}
}
