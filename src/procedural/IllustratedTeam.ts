import {registeredSheets,registeredRiseFrame} from '../characters/registeredSheets'
import {motionSheets,gusSheet,rearSheet,type SpriteRect} from '../characters/motionSheets'
import {travelView,walkingFrame,chairExit} from '../characters/sceneMotion'
import {printArtwork} from '../characters/artworkSurface'
import {project} from './model'
import type {EmployeeState} from './OfficePeople'
export const teamCast=[{id:'oscar',index:0},{id:'cleo',index:5},{id:'gus',index:11}] as const
export class IllustratedTeam{
 private images=new Map<string,HTMLImageElement>()
 private cache=new Map<string,HTMLCanvasElement>()
 private cacheBytes=0
 private bounds=new Map<string,{x:number;y:number;w:number;h:number}>()
 constructor(){for(const [id,url] of Object.entries({oscarWalk:motionSheets['oscar-walk'].url,cleoWalk:motionSheets['cleo-walk'].url,gusDirection:gusSheet.url,rear:rearSheet.url,oscarRegistered:registeredSheets.oscar.url,cleoRegistered:registeredSheets.cleo.url,gusRegistered:registeredSheets.gus.url})){const im=new Image();im.src=url;this.images.set(id,im)}}
 get ready(){return [...this.images.values()].every(im=>im.complete&&im.naturalWidth>0)}
 hit(p:{x:number;y:number}){return [...this.bounds].reverse().find(([,b])=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)?.[0]??null}
 has(index:number){return teamCast.some(c=>c.index===index)}
 draw(ctx:CanvasRenderingContext2D,actor:EmployeeState,time:number,reduced:boolean,zoom:number,hands=false){
  const c=teamCast.find(c=>c.index===actor.index);if(!c)return
  const moving=actor.mode==='walk',task=actor.activity==='task',transition=actor.mode==='idle'&&!task,phase=reduced?0:Math.floor(time/.22+actor.index)%2
  const view=travelView(actor.di??1,actor.dj??0)
  const registered=registeredSheets[c.id]
  let keyId=c.id+'Registered',f:SpriteRect=registered.frames[hands?phase:0],mirror=1
  let height=f.h*registered.pixelScale
  if(task){f=registered.frames[7];height=f.h*registered.pixelScale;mirror=c.id==='gus'?1:-1}
  if(moving){
   height=c.id==='gus'?99:105;mirror=view.mirror
   if(c.id==='gus'){keyId='gusDirection';const list=view.rear?gusSheet.back:gusSheet.front;f=list[walkingFrame(actor.distance??time*.7,list.length)]}
   else if(view.rear){keyId='rear';const offset=c.id==='oscar'?0:4;f=rearSheet.frames[offset+walkingFrame(actor.distance??time*.7,4)]}
   else {keyId=c.id==='oscar'?'oscarWalk':'cleoWalk';const list=motionSheets[c.id==='oscar'?'oscar-walk':'cleo-walk'].frames;f=list[walkingFrame(actor.distance??time*.7,list.length)]}
  }else if(transition){
   const p=reduced?0:actor.settle
   f=registered.frames[registeredRiseFrame(chairExit(p).rise)];mirror=1
   height=f.h*registered.pixelScale
  }
  const image=this.images.get(keyId)
  if(!image?.complete||!image.naturalWidth)return
  const variant=reduced?0:Math.floor(time*3)%3,level=zoom<.4?0:zoom<.7?1:2,key=`${keyId}:${f.x}:${f.y}:${variant}:${level}`
  let tile=this.cache.get(key)
  if(!tile){tile=document.createElement('canvas');tile.width=f.w;tile.height=f.h;const g=tile.getContext('2d')!;g.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);printArtwork(g,f.h,variant,zoom);const bytes=tile.width*tile.height*4;while(this.cache.size&&this.cacheBytes+bytes>32*1048576){const [id,old]=this.cache.entries().next().value!;this.cacheBytes-=old.width*old.height*4;old.width=old.height=1;this.cache.delete(id)}this.cacheBytes+=bytes;this.cache.set(key,tile)}
  const p=project(actor.i,actor.j),h=height,w=f.w/f.h*h
  // Chair hip anchor is behind the ankles. Worktop hands are repainted only in a narrow band.
  ctx.save();if(hands){ctx.beginPath();ctx.rect(p.x+9,p.y-51,43,14);ctx.clip()}
  ctx.translate(p.x+(moving||task?0:transition?13*(1-chairExit(actor.settle).rise):13),p.y);ctx.scale(moving||task?mirror:(actor.facing>=0?1:-1)*mirror,1);ctx.drawImage(tile,-w/2,-h,w,h);ctx.restore()
  if(!hands)this.bounds.set(c.id,{x:p.x+(moving||task?0:13)-w/2,y:p.y-h,w,h})
 }
 dispose(){for(const im of this.images.values())im.src='';this.images.clear();this.cache.clear();this.cacheBytes=0;this.bounds.clear()}
}
