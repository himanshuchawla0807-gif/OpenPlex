import {keyboardContact} from '../characters/seatedContacts'
import {seatedSheets} from '../characters/seatedSheets'
import {chairSheets} from '../characters/chairSheets'
import {uniqueCastSheets} from '../characters/uniqueCastSheets'
import {campusCast,type CampusBaseId} from '../data/campusCast'
import {registeredSheets,registeredRiseFrame,type IllustratedId} from '../characters/registeredSheets'
import {additionalSheets,rearWorkSheets,coffeeSheets} from '../characters/campusSheets'
import {motionSheets,gusSheet,rearSheet,type SpriteRect} from '../characters/motionSheets'
import {walkFrames,walkAtlas} from '../characters/brunoSprite'
import {travelView,walkingFrame,chairExit} from '../characters/sceneMotion'
import {printArtwork,solidArtwork,isolateArtwork} from '../characters/artworkSurface'
import {project} from './model'
import type {EmployeeState} from './OfficePeople'
interface Art {url:string;f:SpriteRect&{isolate?:boolean};scale:number;mirror:number;anchorX?:number;anchorY?:number;registeredSeat?:boolean}
const rect=(x:number,y:number,w:number,h:number)=>({x,y,w,h})
const originalIds=new Set(['oscar','bruno','cleo','gus'])
/** All live staff use registered illustration poses. No procedural stick figures. */
export class CampusPeople {
 private images=new Map<string,HTMLImageElement>()
 private cache=new Map<string,HTMLCanvasElement>()
 private bytes=0
 private bounds=new Map<string,{x:number;y:number;w:number;h:number;tile:HTMLCanvasElement;mirror:number}>()
 private origin={x:0,y:0}
 private outlines=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>()
 hovered:string|null=null
 beginFrame(){this.bounds.clear()}
 setOrigin(x:number,y:number){this.origin={x,y}}
 error:string|null=null
 constructor(){
  const urls=new Set([...Object.values(registeredSheets).map(s=>s.url),...Object.values(additionalSheets).map(s=>s.url),...Object.values(coffeeSheets).map(s=>s.url),'/characters/bruno-prototype/carry-v1.png',...Object.values(rearWorkSheets).map(s=>s.url),...Object.values(motionSheets).map(s=>s.url),gusSheet.url,rearSheet.url,walkAtlas.url,...Object.values(uniqueCastSheets).flatMap(s=>[...s.frames,...(s.walkFront??[]),...(s.walkRear??[])].map(f=>f.url??s.url)),...campusCast.map(c=>c.image)])
  for(const s of [...Object.values(seatedSheets),...Object.values(chairSheets)])urls.add(s.url)
  for(const url of urls){const im=new Image();im.onload=()=>{};im.onerror=()=>{this.error=`Could not load ${url}`};im.src=url;this.images.set(url,im)}
 }
 get ready(){return [...this.images.values()].every(im=>im.complete&&im.naturalWidth>0)}
 get cacheBytes(){return this.bytes}
 has(index:number){return Boolean(campusCast[index])}
 hasOccupiedChair(a:EmployeeState){return Boolean(chairSheets[campusCast[a.index]?.id])&&(a.mode==='work'||a.mode==='idle'&&a.activity!=='task'&&chairExit(a.settle).rise<.6)}
 hit(p:{x:number;y:number}){return [...this.bounds].reverse().find(([,b])=>{
  if(p.x<b.x||p.x>b.x+b.w||p.y<b.y||p.y>b.y+b.h)return false
  const u=(p.x-b.x)/b.w,v=(p.y-b.y)/b.h,x=Math.max(0,Math.min(b.tile.width-1,Math.floor((b.mirror<0?1-u:u)*b.tile.width))),y=Math.max(0,Math.min(b.tile.height-1,Math.floor(v*b.tile.height)))
  return (b.tile.getContext('2d')?.getImageData(x,y,1,1).data[3]??0)>64
 })?.[0]??null}
 private outline(ctx:CanvasRenderingContext2D,tile:HTMLCanvasElement,x:number,y:number,w:number,h:number){
  let mask=this.outlines.get(tile)
  if(!mask){mask=document.createElement('canvas');mask.width=tile.width;mask.height=tile.height;const g=mask.getContext('2d')!;g.drawImage(tile,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff4d9';g.fillRect(0,0,mask.width,mask.height);this.outlines.set(tile,mask)}
  ctx.save();ctx.shadowColor='#62485e';ctx.shadowBlur=2
  for(let n=0;n<8;n++){const a=n*Math.PI/4;ctx.drawImage(mask,x+Math.cos(a)*1.8,y+Math.sin(a)*1.8,w,h)}ctx.restore()
 }
 private art(base:CampusBaseId,pose:string,time:number,distance:number,rear=false,rise=1,mirror=1,taskProgress=0,characterId?:string):Art {
  const seated=characterId?(chairSheets[characterId]??seatedSheets[characterId]):undefined
  if(seated&&(pose==='work'||pose==='rise'&&rise<.6)){
   const f=seated.frames[(rear?2:0)+Math.floor(time/.22)%2]
   return {url:seated.url,f:{...f,isolate:true},scale:f.pixelScale,mirror:f.mirror,anchorX:f.anchorX,anchorY:f.anchorY,registeredSeat:true}
  }
  const unique=characterId?uniqueCastSheets[characterId]:undefined
  if(unique){
   const walking=rear?unique.walkRear:unique.walkFront
   const stride=walkingFrame(distance,walking?.length??2),column=pose==='walk'?(rear?3:1)+stride:pose==='work'||pose==='rise'?(pose==='rise'&&rise>.55?0:rear?6:5):pose==='coffee'?7:0
   const f=pose==='walk'?(walking?.[stride]??unique.frames[column]):unique.frames[column]
   return {url:f.url??unique.url,f,scale:f.pixelScale??unique.pixelScale,mirror:pose==='walk'?mirror:1,anchorX:f.anchorX}
  }
  const extra=additionalSheets[base],workBack=rearWorkSheets[base],core=originalIds.has(base)?registeredSheets[base as IllustratedId]:null
  const phase=Math.floor(time/.22)%2
  if(rear&&workBack&&(pose==='work'||pose==='rise')){const n=pose==='work'?phase:rise<.6?2:3;return {url:workBack.url,f:workBack.frames[n],scale:workBack.pixelScale,mirror:1}}
  if(pose==='walk'){
   if(extra){const n=(rear?8:4)+walkingFrame(distance,4);return {url:extra.url,f:extra.frames[n],scale:extra.pixelScale,mirror}}
   const list=base==='gus'?(rear?gusSheet.back:gusSheet.front):rear?rearSheet.frames.slice(base==='oscar'?0:base==='cleo'?4:8,base==='oscar'?4:base==='cleo'?8:12):base==='bruno'?walkFrames:motionSheets[base==='oscar'?'oscar-walk':'cleo-walk'].frames
   const f=list[walkingFrame(distance,list.length)],height=base==='gus'?99:base==='bruno'?101:105
   return {url:base==='gus'?gusSheet.url:rear?rearSheet.url:base==='bruno'?walkAtlas.url:motionSheets[base==='oscar'?'oscar-walk':'cleo-walk'].url,f,scale:height/f.h,mirror}
  }
  if(pose==='coffee'&&coffeeSheets[base]){const s=coffeeSheets[base]!,n=taskProgress<.35?(phase?1:0):phase?3:2;return {url:s.url,f:s.frames[n],scale:s.pixelScale,mirror}}
  if(pose==='task'&&base==='bruno')return {url:'/characters/bruno-prototype/carry-v1.png',f:rect(81,515,321,479),scale:101/479,mirror}
  if(extra){const n=pose==='work'?phase:pose==='rise'?(rise<.45?2:rise<.85?3:12):pose==='task'?13:pose==='coffee'?14:12;return {url:extra.url,f:extra.frames[n],scale:extra.pixelScale,mirror}}
  if(core){const n=pose==='work'?phase:pose==='rise'?registeredRiseFrame(rise):pose==='task'&&base!=='bruno'?7:6;return {url:core.url,f:core.frames[n],scale:core.pixelScale,mirror}}
  const im=this.images.get(`/characters/cast-v1/${base}.png`),f=rect(0,0,im?.naturalWidth||1024,im?.naturalHeight||1536)
  return {url:`/characters/cast-v1/${base}.png`,f,scale:104/f.h,mirror}
 }
 private tile(a:Art,index:number,_time:number,_reduced:boolean,zoom:number){
  const c=campusCast[index],im=this.images.get(a.url);if(!c||!im?.complete||!im.naturalWidth)return null
  const isUnique=Boolean(uniqueCastSheets[c.id]),phase=0,level=zoom<.65?256:zoom<1.5?512:1024,key=`${a.url}:${a.f.x}:${a.f.y}:${c.id}:${c.variant}:${phase}:${level}`
  let tile=this.cache.get(key);if(tile){this.cache.delete(key);this.cache.set(key,tile);return tile}
  tile=document.createElement('canvas');const density=Math.min(1,level/a.f.h);tile.width=Math.max(1,Math.ceil(a.f.w*density));tile.height=Math.max(1,Math.ceil(a.f.h*density));const g=tile.getContext('2d',{willReadFrequently:true})!;g.drawImage(im,a.f.x,a.f.y,a.f.w,a.f.h,0,0,tile.width,tile.height)
  if(c.variant){const p=g.getImageData(0,0,tile.width,tile.height);shiftGarments(p.data,tile.width,tile.height,c.hue);g.putImageData(p,0,0)}
  if(isUnique||a.registeredSeat){const pixels=g.getImageData(0,0,tile.width,tile.height);solidArtwork(pixels.data,1);if(a.f.isolate)isolateArtwork(pixels.data,tile.width,tile.height);g.putImageData(pixels,0,0)}else printArtwork(g,tile.height,phase,zoom)
  const bytes=tile.width*tile.height*4;while(this.cache.size&&this.bytes+bytes>64*1048576){const [key,old]=this.cache.entries().next().value!;this.bytes-=old.width*old.height*4;old.width=old.height=1;this.cache.delete(key)}this.bytes+=bytes;this.cache.set(key,tile);return tile
 }
 draw(ctx:CanvasRenderingContext2D,a:EmployeeState,time:number,reduced:boolean,zoom:number,hands=false){
  const c=campusCast[a.index];if(!c)return
  const moving=a.mode==='walk',task=a.activity==='task',transition=a.mode==='idle'&&!task,back=Boolean(a.station?.reverse)
  const view=travelView(a.di??1,a.dj??0),rise=transition?chairExit(a.settle).rise:1
  const pose=moving?'walk':task?(a.taskKind==='coffee'?'coffee':'task'):transition?'rise':'work'
  // Only the keyboard contact patch changes frames; body, head and chair stay registered.
  const frameTime=reduced||(!hands&&(pose==='work'||pose==='rise'))?0:time
  const art=this.art(c.baseId,pose,frameTime,a.distance??time*.7,moving?view.rear:!task&&back,rise,moving?view.mirror:task?(a.facing<0?-1:1):back?-1:1,a.taskProgress??0,c.id)
  const tile=this.tile(art,a.index,pose==='work'?0:time,reduced,zoom);if(!tile)return
  const p=project(a.i,a.j),w=art.f.w*art.scale,h=art.f.h*art.scale,offset=moving||task||art.registeredSeat?0:(back?-13:13)*(transition?1-rise:1),top=-(art.anchorY??art.f.h)*art.scale
  ctx.save();if(hands){ctx.beginPath();const target=keyboardContact({i:a.i,j:a.j,reverse:back});ctx.ellipse(p.x+target.x,p.y+target.y,17,7,-.46,0,Math.PI*2);ctx.clip()}
  // Older single-pose sheets get a subpixel wrist tap inside the same clip,
  // never a translated body or a warped sprite. New chair atlases use real hand poses.
  if(hands&&!chairSheets[c.id]&&!reduced)ctx.translate(Math.sin(time*13+a.index)*.35,Math.cos(time*17+a.index)*.3)
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(p.x+offset,p.y);ctx.scale(art.mirror,1)
  const left=-(art.anchorX??art.f.w/2)*art.scale
  if(!hands&&this.hovered===a.id)this.outline(ctx,tile,left,top,w,h)
  ctx.drawImage(tile,left,top,w,h)
  ctx.restore()
  if(!hands)this.bounds.set(a.id,{x:this.origin.x+p.x+offset-(art.mirror<0?art.f.w-(art.anchorX??art.f.w/2):(art.anchorX??art.f.w/2))*art.scale,y:this.origin.y+p.y+top,w,h,tile,mirror:art.mirror})
 }
 drawPreview(ctx:CanvasRenderingContext2D,index:number,pose:'standing'|'walking'|'seated'|'desk',time:number,reduced:boolean,zoom:number){
  const c=campusCast[index];if(!c)return
  if(pose==='walking'&&uniqueCastSheets[c.id]){this.draw(ctx,{index,i:0,j:0,mode:'walk',facing:1,settle:1,distance:time*.7,di:1,dj:0} as EmployeeState,time,reduced,zoom);return}
  if(pose==='desk'||pose==='seated'){this.draw(ctx,{index,i:0,j:0,station:{reverse:false},mode:'work',facing:1,settle:1,distance:0} as EmployeeState,time,reduced,zoom);return}
  const art=this.art(c.baseId,pose==='walking'?'walk':'stand',time,time*.7,false,1,1,0,c.id),tile=this.tile(art,index,time,reduced,zoom);if(!tile)return;ctx.drawImage(tile,-(art.anchorX??art.f.w/2)*art.scale,-art.f.h*art.scale,art.f.w*art.scale,art.f.h*art.scale)
 }
 dispose(){for(const im of this.images.values())im.src='';this.images.clear();for(const t of this.cache.values())t.width=t.height=1;this.cache.clear();this.bytes=0;this.bounds.clear()}
}
/** Restrict palette changes to fabric; preserve faces, hands, hair and ink outlines. */
export function shiftGarments(data:Uint8ClampedArray,width:number,height:number,degrees:number){
 const angle=degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle)
 for(let n=0;n<data.length;n+=4){const y=Math.floor(n/4/width)/height;if(y<.26||data[n+3]<100)continue
  const r=data[n],g=data[n+1],b=data[n+2],max=Math.max(r,g,b),min=Math.min(r,g,b),skin=r>g*1.08&&g>b*1.08&&r-g>14&&r-b>24
  if(skin||max-min<24||max<55)continue
  const l=.299*r+.587*g+.114*b,u=-.147*r-.289*g+.436*b,v=.615*r-.515*g-.100*b,nu=u*cos-v*sin,nv=u*sin+v*cos
  data[n]=Math.max(0,Math.min(255,l+1.14*nv));data[n+1]=Math.max(0,Math.min(255,l-.395*nu-.581*nv));data[n+2]=Math.max(0,Math.min(255,l+2.032*nu))
 }
}
