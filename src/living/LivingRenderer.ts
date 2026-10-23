import type { Camera } from '../camera/Camera'
import { getRoomArtwork } from '../assets/rooms/manifest'
import { sortByDepth } from '../engine/depth'
import { worldToIso } from '../engine/isometric'
import type { Size } from '../types/geometry'
import type { Room } from '../types/world'
import { bounds, LivingAssets, polygonPath } from './LivingAssets'
import type { LivingWorld } from './LivingWorld'
import type { AmbientEvent, LivingCharacter, LivingRoomDefinition } from './types'
import { drawOfficeMotion } from './officeMotion'

interface Rect {x:number;y:number;width:number;height:number}
const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y

export class LivingRenderer {
  private readonly assets: LivingAssets
  private readonly base=document.createElement('canvas')
  private baseKey=''
  private dynamicKey=''
  private previous=new Map<string,{key:string;rect:Rect}>()
  readonly stats={staticBuilds:0,dirtyFrames:0,skippedFrames:0}
  private readonly ctx: CanvasRenderingContext2D
  private readonly dpr: number

  constructor(ctx:CanvasRenderingContext2D,dpr:number,rooms:Room[],definitions:LivingRoomDefinition[]) {
    this.ctx=ctx;this.dpr=dpr
    this.assets=new LivingAssets(rooms,definitions)
  }
  get ready():boolean{return this.assets.ready}

  render(viewport:Size,camera:Camera,rooms:Room[],world:LivingWorld,hovered:string|null,selected:string|null,reducedMotion:boolean):void {
    if(!this.ready)return
    const ordered=sortByDepth(rooms,r=>({anchor:{x:r.origin.x+r.width,y:r.origin.y+r.depth}}))
    const state=camera.value
    const key=[viewport.width,viewport.height,state.x,state.y,state.zoom,hovered,selected].join('|')
    const full=key!==this.baseKey
    if(full) {this.cacheBase(viewport,camera,ordered,hovered,selected);this.baseKey=key}
    const chars=world.characters
    const signature=chars.map(a=>`${a.id}:${Math.round(a.foot.x*2)}:${Math.round(a.foot.y*2)}:${this.frame(a,world.time,reducedMotion)}:${a.facing}`).join('|')+
      [...world.ambient.values()].flat().map(e=>`${e.definition.id}:${Math.round(e.value*1000)}`).join('|')
    if(!full && signature===this.dynamicKey){this.stats.skippedFrames++;return}
    this.dynamicKey=signature
    const project=(room:Room,r:Rect):Rect=>{
      const origin=worldToIso(room.origin),offset=getRoomArtwork(room.artwork!.assetId).base.offset
      return {x:viewport.width/2+state.x+(origin.x+offset.x+r.x)*state.zoom-3,
        y:viewport.height/2+state.y+(origin.y+offset.y+r.y)*state.zoom-3,
        width:r.width*state.zoom+6,height:r.height*state.zoom+6}
    }
    const current=new Map<string,{key:string;rect:Rect}>()
    for(const room of ordered){
      for(const actor of chars.filter(a=>a.roomId===room.id)) current.set(actor.id,{
        key:[actor.foot.x.toFixed(1),actor.foot.y.toFixed(1),this.frame(actor,world.time,reducedMotion),actor.facing].join(':'),
        rect:project(room,{x:actor.foot.x-145,y:actor.foot.y-actor.height-16,width:290,height:actor.height+28}),
      })
      for(const event of world.ambient.get(room.id)??[]) if(event.active) {
        const r=bounds(event.definition.polygon);current.set(room.id+event.definition.id,{
          key:String(Math.round(event.value*1000)),rect:project(room,{x:r.x-10,y:r.y-10,width:r.width+20,height:r.height+20}),
        })
      }
    }
    const changed:Rect[]=[]
    for(const [id,item]of current)if(item.key!==this.previous.get(id)?.key){
      changed.push(item.rect);const old=this.previous.get(id);if(old)changed.push(old.rect)
    }
    for(const [id,item]of this.previous)if(!current.has(id))changed.push(item.rect)
    const dirty=full?[{x:0,y:0,...viewport}]:changed.filter(r=>intersects(r,{x:0,y:0,...viewport}))
    this.previous=current
    if(!dirty.length)return
    const ctx=this.ctx,dpr=this.dpr
    ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath()
    for(const r of dirty)ctx.rect(Math.floor(r.x),Math.floor(r.y),Math.ceil(r.width)+1,Math.ceil(r.height)+1)
    ctx.clip();ctx.drawImage(this.base,0,0,this.base.width,this.base.height,0,0,viewport.width,viewport.height)
    this.cameraTransform(ctx,viewport,camera)
    for(let index=0;index<ordered.length;index++) {
      const room=ordered[index],definition=world.rooms.find(r=>r.roomId===room.id)
      if(!definition)continue
      ctx.save()
      // Subtract rooms in front, so local animated layers cannot paint through their walls.
      for(const front of ordered.slice(index+1)) {
        const art=getRoomArtwork(front.artwork!.assetId),origin=worldToIso(front.origin)
        ctx.beginPath();ctx.rect(-100000,-100000,200000,200000)
        art.base.clipPolygon!.forEach((p,i)=>{const x=origin.x+art.base.offset.x+p.x,y=origin.y+art.base.offset.y+p.y;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)})
        ctx.closePath();ctx.clip('evenodd')
      }
      const origin=worldToIso(room.origin),art=getRoomArtwork(room.artwork!.assetId)
      ctx.translate(origin.x+art.base.offset.x,origin.y+art.base.offset.y)
      polygonPath(ctx,art.base.clipPolygon!.map(p=>[p.x,p.y]));ctx.clip()
      this.drawRoom(room,definition,world,reducedMotion)
      ctx.restore()
    }
    ctx.restore();this.stats.dirtyFrames++
  }

  private cameraTransform(ctx:CanvasRenderingContext2D,viewport:Size,camera:Camera):void {
    const s=camera.value,d=this.dpr
    ctx.setTransform(d*s.zoom,0,0,d*s.zoom,d*(viewport.width/2+s.x),d*(viewport.height/2+s.y))
    ctx.imageSmoothingEnabled=false
  }

  private cacheBase(viewport:Size,camera:Camera,rooms:Room[],hovered:string|null,selected:string|null):void {
    this.base.width=Math.round(viewport.width*this.dpr);this.base.height=Math.round(viewport.height*this.dpr)
    const ctx=this.base.getContext('2d')!
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle='#f3eddf';ctx.fillRect(0,0,viewport.width,viewport.height)
    ctx.fillStyle='rgba(92,78,63,0.09)'
    for(let y=8;y<viewport.height;y+=17)for(let x=10+((y/17)%2)*9;x<viewport.width;x+=21)ctx.fillRect(x,y,1,1)
    this.cameraTransform(ctx,viewport,camera)
    for(const room of rooms){
      const art=getRoomArtwork(room.artwork!.assetId),origin=worldToIso(room.origin)
      ctx.save();ctx.translate(origin.x+art.base.offset.x,origin.y+art.base.offset.y)
      polygonPath(ctx,art.base.clipPolygon!.map(p=>[p.x,p.y]));ctx.clip()
      ctx.drawImage(this.assets.layers.get(room.id)!.plate,0,0)
      if(hovered===room.id||selected===room.id){
        ctx.beginPath();art.frontEdge!.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y))
        ctx.strokeStyle=selected===room.id?'#bd6548':'#467b79';ctx.lineWidth=selected===room.id?3:2;ctx.stroke()
      }
      ctx.restore()
    }
    this.stats.staticBuilds++
  }

  private frame(actor:LivingCharacter,time:number,reduced:boolean):number {
    if(reduced)return 0
    if(actor.journey)return (actor.back?4:2)+actor.gait
    if(actor.state==='TALKING') {
      const elapsed=time-actor.actionStartedAt
      return elapsed>1.5 && elapsed<6.5 ? 1 : 0
    }
    if(time<actor.actionUntil)return actor.pose
    if(actor.state==='READING')return 1
    return 0
  }

  private drawRoom(room:Room,definition:LivingRoomDefinition,world:LivingWorld,reduced:boolean):void {
    const layers=this.assets.layers.get(room.id)!,ctx=this.ctx
    const items:[number,()=>void][]=[]
    for(const actor of world.characters.filter(a=>a.roomId===room.id)) items.push([actor.foot.y,()=>{
      const row=actor.gender==='man'?0:1,frame=layers.frames[row][this.frame(actor,world.time,reduced)]
      const scale=actor.height/layers.frames[row][0].height
      ctx.save();ctx.translate(actor.foot.x,actor.foot.y)
      ctx.fillStyle='rgba(49,57,51,0.10)';ctx.beginPath();ctx.ellipse(0,-2,25,8,0,0,Math.PI*2);ctx.fill()
      ctx.scale(scale*actor.facing,scale)
      ctx.drawImage(frame.image,-frame.footX,-frame.footY);ctx.restore()
    }])
    for(const foreground of definition.foreground)items.push([foreground.depth,()=>{const cut=layers.cuts.get(foreground.id)!;ctx.drawImage(cut.image,cut.x,cut.y)}])
    if(!reduced)for(const event of world.ambient.get(room.id)??[])if(event.active)items.push([event.definition.depth,()=>this.drawAmbient(room.id,event,world.time)])
    items.sort((a,b)=>a[0]-b[0]).forEach(([,draw])=>draw())
  }

  private drawAmbient(roomId:string,event:AmbientEvent,time:number):void {
    const ctx=this.ctx,def=event.definition,cut=this.assets.layers.get(roomId)!.cuts.get(def.id)!
    if(drawOfficeMotion(ctx,event,cut,time))return
    ctx.save()
    if(def.kind==='cursor') {
      ctx.fillStyle=`rgba(234,211,147,${Math.abs(event.value)})`;ctx.fillRect(364,430,5,2)
    }else{
      ctx.translate(def.pivot.x,def.pivot.y)
      // Wheel rotation occurs in its oblique plane, not as a rotating circular sticker.
      if(def.kind==='wheel')ctx.scale(0.62,1)
      ctx.rotate(event.value)
      if(def.kind==='wheel')ctx.scale(1/0.62,1)
      ctx.drawImage(cut.image,cut.x-def.pivot.x,cut.y-def.pivot.y)
    }
    ctx.restore()
  }
}
