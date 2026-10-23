import {registeredSheets,registeredRiseFrame} from '../characters/registeredSheets'
import {rearSheet} from '../characters/motionSheets'
import {travelView,walkingFrame} from '../characters/sceneMotion'
import {printArtwork} from '../characters/artworkSurface'
import {drawCarryMesh} from './deformCarry'
import {brunoOfficeState,walkAtlas,walkFrames} from '../characters/brunoSprite'
import {brunoStops,brunoDeskSockets} from '../characters/brunoRoutine'
import {project} from './model'
import type {Point} from '../types/geometry'
type Rect={x:number;y:number;w:number;h:number}
const actionFrames:Rect[]=[{x:148,y:11,w:378,h:501},{x:630,y:11,w:274,h:501},{x:1106,y:11,w:379,h:501},{x:145,y:544,w:336,h:464},{x:666,y:526,w:327,h:483},{x:1170,y:521,w:314,h:485}]
const carryFrames:Rect[]=[{x:82,y:11,w:316,h:477},{x:470,y:12,w:298,h:476},{x:840,y:11,w:306,h:480},{x:1237,y:12,w:290,h:470},{x:81,y:515,w:321,h:479},{x:470,y:514,w:298,h:476},{x:840,y:515,w:308,h:481},{x:1237,y:514,w:297,h:467}]
/** Registered full poses with an alpha-clipped print layer; props travel in the authored hands. */
export class IllustratedBruno {
 private images=new Map<string,HTMLImageElement>()
 private cache=new Map<string,HTMLCanvasElement>()
 private cacheBytes=0
 private alive=true
 bounds={x:0,y:0,w:0,h:0}
 constructor(){for(const [key,url] of Object.entries({registered:registeredSheets.bruno.url,rear:rearSheet.url,walk:walkAtlas.url,actions:'/characters/bruno-prototype/actions-v1.png',carry:'/characters/bruno-prototype/carry-v1.png',coffeeCarry:'/characters/bruno-prototype/carry-v2-study.png'})){const im=new Image();im.src=url;this.images.set(key,im)}}
 state(time:number,reduced:boolean){return brunoOfficeState(time,reduced)}
 get ready(){return [...this.images.values()].every(im=>im.complete&&im.naturalWidth>0)}
 hit(p:Point){const b=this.bounds;return b.w>0&&p.x>=b.x-8&&p.x<=b.x+b.w+8&&p.y>=b.y&&p.y<=b.y+b.h}
 private tile(key:string,rect:Rect,variant:number,zoom:number,phase=0){
  const im=this.images.get(key);if(!im?.complete||!im.naturalWidth)return null
  const level=zoom<.4?0:zoom<.7?1:2,cacheKey=`${key}:${rect.x}:${rect.y}:${variant}:${level}:${phase}`
  const cached=this.cache.get(cacheKey);if(cached){this.cache.delete(cacheKey);this.cache.set(cacheKey,cached);return cached}
  const deform=key==='carry'||key==='coffeeCarry',pad=deform?Math.ceil(rect.h*.09):0
  const c=document.createElement('canvas');c.width=Math.ceil(rect.w)+pad*2;c.height=Math.ceil(rect.h)+pad*2
  const ctx=c.getContext('2d',{willReadFrequently:true})!
  if(deform)drawCarryMesh(ctx,im,rect,phase/8,pad,key==='coffeeCarry'?-1:1)
  else ctx.drawImage(im,rect.x,rect.y,rect.w,rect.h,0,0,c.width,c.height)
  printArtwork(ctx,rect.h,variant,zoom)
  const bytes=c.width*c.height*4
  while(this.cache.size&&this.cacheBytes+bytes>32*1024*1024){const oldest=this.cache.entries().next().value!;this.cacheBytes-=oldest[1].width*oldest[1].height*4;oldest[1].width=1;oldest[1].height=1;this.cache.delete(oldest[0])}
  this.cache.set(cacheKey,c);this.cacheBytes+=bytes;return c
 }
 private sprite(ctx:CanvasRenderingContext2D,key:string,f:Rect,x:number,y:number,height:number,facing:number,variant:number,zoom:number,phase=0){
  const tile=this.tile(key,f,variant,zoom,phase);if(!tile)return
  const w=f.w/f.h*height;ctx.save();ctx.translate(x,y);ctx.scale(facing,1);const pad=key==='carry'||key==='coffeeCarry'?Math.ceil(f.h*.09):0,scale=height/f.h;ctx.drawImage(tile,-w/2-pad*scale,-height-pad*scale,tile.width*scale,tile.height*scale);ctx.restore()
  this.bounds={x:x-w/2,y:y-height,w,h:height}
 }
 private cup(ctx:CanvasRenderingContext2D,x:number,y:number,time:number){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#51424d';ctx.lineWidth=.8;ctx.fillStyle='#f2e9d7';ctx.fillRect(-3,-6,6,7);ctx.strokeRect(-3,-6,6,7);ctx.beginPath();ctx.arc(4,-3,2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#70503d';ctx.fillRect(-2,-5,4,1.5)
  ctx.strokeStyle='rgba(245,241,229,.6)';for(let k=0;k<2;k++){const rise=(time*.4+k*.5)%1;ctx.beginPath();ctx.moveTo(k*3-2,-9-rise*6);ctx.quadraticCurveTo(k*3-4,-13-rise*6,k*3,-16-rise*6);ctx.stroke()}ctx.restore()
 }

 /** Desk/chair remain at their registered location while Bruno visits the room. */
 drawStation(ctx:CanvasRenderingContext2D,time:number,reduced:boolean){
  const s=this.state(time,reduced),cup=brunoDeskSockets.cup,book=brunoDeskSockets.book,p=project(cup.i,cup.j,cup.z)
  if(s.coffeeOnDesk)this.cup(ctx,p.x,p.y,time)
  if(s.bookOnDesk){const pts=[[book.i,book.j],[book.i+.38,book.j],[book.i+.38,book.j+.27],[book.i,book.j+.27]].map(([i,j])=>project(i,j,book.z));ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#ae5038';ctx.fill();ctx.strokeStyle='#503d48';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.moveTo(pts[1].x,pts[1].y+2);ctx.lineTo(pts[2].x,pts[2].y+2);ctx.strokeStyle='#eee1c9';ctx.stroke()}
 }
 drawWorkSurface(ctx:CanvasRenderingContext2D,time:number,reduced:boolean,zoom:number){
  const state=this.state(time,reduced),p=project(brunoStops.desk.i,brunoStops.desk.j),sheet=registeredSheets.bruno,f=sheet.frames[state.carry==='book'?7:0],variant=reduced?0:Math.floor(time*3)%3
  const tile=this.tile('registered',f,variant,zoom);if(!tile)return
  const h=f.h*sheet.pixelScale,w=f.w*sheet.pixelScale
  ctx.save();ctx.beginPath();ctx.rect(p.x+9,p.y-51,43,14);ctx.clip();ctx.drawImage(tile,p.x+13-w/2,p.y-h+(reduced?0:Math.sin(time*7)*.45),w,h);ctx.restore()
  if(state.carry==='coffee'){const cup=brunoDeskSockets.cup,v=project(cup.i,cup.j,cup.z);this.cup(ctx,v.x,v.y,time)}
 }
 drawLibraryProp(ctx:CanvasRenderingContext2D,time:number,reduced:boolean){
  if(!this.state(time,reduced).bookOnShelf)return
  const p=project(.95,9.5,1.5);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#a8553f';ctx.strokeStyle='#503d48';ctx.lineWidth=.8;ctx.fillRect(-2,-10,5,13);ctx.strokeRect(-2,-10,5,13);ctx.fillStyle='#e4cdab';ctx.fillRect(-1,-7,3,1);ctx.restore()
 }
 drawCoffee(ctx:CanvasRenderingContext2D,time:number,reduced:boolean){
  const s=this.state(time,reduced),p=project(brunoStops.coffee.i-.025,brunoStops.coffee.j-.625)
  ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#5d6c76';ctx.strokeStyle='#37424d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-15,-34);ctx.lineTo(21,-20);ctx.lineTo(21,10);ctx.lineTo(-15,-4);ctx.closePath();ctx.fill();ctx.stroke()
  ctx.fillStyle='#ded9cb';ctx.beginPath();ctx.moveTo(-19,-37);ctx.lineTo(1,-46);ctx.lineTo(25,-28);ctx.lineTo(5,-19);ctx.closePath();ctx.fill();ctx.stroke()
  ctx.fillStyle='#353e47';ctx.fillRect(-7,-66,22,29);ctx.strokeRect(-7,-66,22,29);ctx.fillStyle='#adbfc0';ctx.fillRect(-4,-61,15,7);ctx.fillStyle=s.activity==='brew'?'#deac71':'#8b9f91';ctx.beginPath();ctx.arc(9,-62,1.6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1c242b';ctx.fillRect(-2,-48,7,10)
  if(s.activity==='brew'){this.cup(ctx,1,-35,time);ctx.strokeStyle='#9d734e';ctx.beginPath();ctx.moveTo(1,-43);ctx.lineTo(1,-39);ctx.stroke()}
  ctx.restore()
 }
 drawCoffeeFront(ctx:CanvasRenderingContext2D,time:number,reduced:boolean){
  if(this.state(time,reduced).activity!=='brew')return
  const p=project(brunoStops.coffee.i-.025,brunoStops.coffee.j-.625)
  ctx.save();ctx.beginPath();ctx.rect(p.x-8,p.y-67,25,31);ctx.clip();this.drawCoffee(ctx,time,reduced);ctx.restore()
 }
 draw(ctx:CanvasRenderingContext2D,time:number,reduced:boolean,zoom=1){
  if(!this.alive)return
  const s=this.state(time,reduced),p=project(s.i,s.j),variant=reduced?0:Math.floor(time*3)%3
  ctx.save();ctx.fillStyle='rgba(37,36,46,.17)';ctx.beginPath();ctx.ellipse(p.x+(s.mode==='work'?30:0),p.y,21,5,0,0,Math.PI*2);ctx.fill();ctx.restore()
  if(s.mode==='work'){
   const sheet=registeredSheets.bruno,f=sheet.frames[s.activity==='read'||s.carry==='book'?7:0]
   this.sprite(ctx,'registered',f,p.x+13,p.y,f.h*sheet.pixelScale,1,variant,zoom)
  }else if(s.mode==='walk'){
   if(s.carry!=='none'){
    const phase=Math.floor(time/.09)%8
    if(s.carry==='coffee'){const frame=Math.floor(time/.36)%2;this.sprite(ctx,'coffeeCarry',frame?{x:728,y:10,w:390,h:614}:{x:177,y:10,w:398,h:614},p.x,p.y,101,s.facing,0,zoom,phase)}
    else {const frame=Math.floor(time/.17)%4+4;this.sprite(ctx,'carry',carryFrames[frame],p.x,p.y,101,s.facing,0,zoom,phase)}
   }
   else {const view=travelView(s.di,s.dj),frames=view.rear?rearSheet.frames.slice(8):walkFrames
    this.sprite(ctx,view.rear?'rear':'walk',frames[walkingFrame(s.distance,frames.length)],p.x,p.y,101,view.mirror,variant,zoom)}
  }else if(s.activity==='stand'||s.activity==='sit'){const sheet=registeredSheets.bruno,f=sheet.frames[registeredRiseFrame(s.rise)];this.sprite(ctx,'registered',f,p.x+(1-s.rise)*13,p.y,f.h*sheet.pixelScale,1,variant,zoom)
   if(s.carry!=='none'){
    // Measured wrist positions in each registered source pose (no free limb rotations).
    const wrists=[[199,300],[236,279],[224,283],[244,342],[254,366]],v=wrists[registeredRiseFrame(s.rise)-2],x=p.x+(1-s.rise)*13+(v[0]-f.w/2)*sheet.pixelScale,y=p.y+(v[1]-f.h)*sheet.pixelScale
    if(s.carry==='coffee')this.cup(ctx,x,y+4,time)
    else {ctx.fillStyle='#a74e39';ctx.strokeStyle='#503d48';ctx.lineWidth=.8;ctx.fillRect(x-5,y-4,10,8);ctx.strokeRect(x-5,y-4,10,8);ctx.fillStyle='#eee1c9';ctx.fillRect(x-4,y+1,8,1)}
   }
  }else if(s.activity==='return-book'&&s.progress>.65||s.activity==='pick-book'&&s.progress<.55){const sheet=registeredSheets.bruno,f=sheet.frames[6];this.sprite(ctx,'registered',f,p.x,p.y,f.h*sheet.pixelScale,s.facing,variant,zoom)}
  else {
   const frame=s.activity==='brew'?0:s.activity==='place-cup'?1:s.activity==='pick-book'?2:s.activity==='return-book'?5:4
   const f=actionFrames[frame]
   this.sprite(ctx,'actions',f,p.x,p.y,101,s.facing,variant,zoom)
   // Subtle finger motion on the extended hand. Feet and the full pose stay registered.
   const art=this.tile('actions',f,variant,zoom)
   if(art&&s.activity==='brew'){
    const scale=101/f.h,w=f.w*scale;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s.facing,1)
    ctx.beginPath();ctx.rect(w*.30,-80,w*.20,15);ctx.clip();ctx.drawImage(art,-w/2+Math.sin(time*3)*.25,-101,w,101);ctx.restore()
   }
  }
 }
 dispose(){this.alive=false;this.cache.clear();this.cacheBytes=0;for(const im of this.images.values())im.src='';this.images.clear()}
}
