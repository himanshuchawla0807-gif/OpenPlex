import {CampusPeople} from './CampusPeople'
import {brunoStops} from '../characters/brunoRoutine'
import {IllustratedBruno} from './IllustratedBruno'
import type {Camera} from '../camera/Camera'
import type {Size} from '../types/geometry'
import {OfficeArchitecture} from './OfficeArchitecture.ts'
import {officeDefinitions} from './officeRooms.ts'
import {project,type OfficeDefinition,type Furniture} from './model.ts'
import {OfficePeople} from './OfficePeople.ts'

import {CanvasTileCache,type CanvasTile as Tile} from './CanvasTileCache.ts'
export class ProceduralRenderer {
  readonly bruno=new IllustratedBruno()
  private readonly team=new CampusPeople()
  readonly people:OfficePeople
  private definitions:OfficeDefinition[]
  private preset:boolean
  private worldReview=(()=>{const p=new URLSearchParams(window.location.search),v=Number(p.get('worldTime'));return p.has('worldTime')&&Number.isFinite(v)&&v>=0?v:null})()
  private reviewTime=(()=>{const p=new URLSearchParams(window.location.search);const t=Number(p.get('brunoTime'));return p.has('brunoTime')&&Number.isFinite(t)&&t>=0?t:null})()
  hoverCharacter(id:string|null){this.team.hovered=id}
  hitCharacter(point:{x:number;y:number}){return this.bruno.hit(point)?'bruno':this.team.hit(point)}
  seekReview(world:number,bruno:number){if(!new URLSearchParams(location.search).has('review'))return;if(!Number.isFinite(world)||!Number.isFinite(bruno)||world<0||bruno<0)return;this.worldReview=world;this.reviewTime=bruno;this.people.time=world;for(const a of this.people.actors){a.i=a.station.i;a.j=a.station.j;a.mode='work';a.facing=a.station.facing;a.settle=1;a.distance=0}this.people.update(0)}
  resumeReview(){if(new URLSearchParams(location.search).has('review')){this.worldReview=null;this.reviewTime=null}}
  get brunoTime(){return this.reviewTime??this.people.time}
  private readonly architecture=new OfficeArchitecture()
  private readonly tiles=new CanvasTileCache()
  private cacheLevel=-1
  private printLevel=0
  // Recording cameras reuse one inspection-quality set of room tiles. Rebuilding
  // every room at each texture/LOD boundary made a smooth tween hitch for 300ms.
  private readonly recordingCamera=import.meta.env?.DEV&&new URLSearchParams(location.search).has('recording')
  private dark=false
  get cacheBytes(){return this.tiles.bytes}
  resetSurfaces(){this.tiles.clear();this.backdrop=null;this.cacheLevel=-1}
  private backdrop:CanvasPattern|null=null
  backgroundRebuilds=0
  private readonly ctx:CanvasRenderingContext2D
  private readonly pixelRatio:number
  private readonly transparentBackground:boolean
  constructor(ctx:CanvasRenderingContext2D,pixelRatio:number,definitions=officeDefinitions,staff?:Record<string,number[]>,transparentBackground=false){this.transparentBackground=transparentBackground;this.ctx=ctx;this.pixelRatio=pixelRatio;this.definitions=definitions;this.preset=staff===undefined;this.people=new OfficePeople(definitions,staff);if(this.worldReview!==null){this.people.time=this.worldReview;this.people.update(0)}}
  get ready(){return this.team.ready&&this.bruno.ready}
  get error(){return this.team.error}
  update(delta:number,reduced:boolean){if(this.ready)this.people.update(this.worldReview===null?delta:0,reduced)}
  private tile(def:OfficeDefinition,item:Furniture|null,variant:number,nativeScale=0):Tile {
    const key=def.id+':'+(item?.id??'base')+':'+variant+':'+this.cacheLevel+':'+nativeScale
    let tile=this.tiles.get(key)
    // WebKit has contextlost events but may omit the isContextLost method.
    if(tile){const context=tile.canvas.getContext('2d');if(context&&(typeof context.isContextLost!=='function'||!context.isContextLost()))return tile}
    if(tile)this.tiles.delete(key)
    const i=item?.i??0,j=item?.j??0,w=item?.w??def.width,d=item?.d??def.depth
    const points=[project(i,j),project(i+w,j),project(i,j+d),project(i+w,j+d)]
    const x=Math.floor(Math.min(...points.map(p=>p.x))-35),y=Math.floor(Math.min(...points.map(p=>p.y))-(item?Math.max(2.4,item.height??3)*40:def.wallHeight*40)-45)
    const width=Math.ceil(Math.max(...points.map(p=>p.x))-x+35),height=Math.ceil(Math.max(...points.map(p=>p.y))-y+45)
    const canvas=document.createElement('canvas'),level=this.cacheLevel
    const scale=nativeScale|| (item?(level===0?.5:level===1?.7:.83):(level===0?.5:level===1?.65:.68))
    canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale)
    const ctx=canvas.getContext('2d')!;ctx.scale(scale,scale);ctx.translate(-x,-y)
    if(item)this.architecture.drawFurniture(ctx,def,item,variant)
    else this.architecture.drawBase(ctx,def,variant)
    tile={canvas,x,y,w:width,h:height};
    canvas.addEventListener('contextlost',()=>{if(this.tiles.get(key)?.canvas===canvas)this.tiles.delete(key)},{once:true});
    this.tiles.set(key,tile);this.backgroundRebuilds++
    return tile
  }
  private drawTile(tile:Tile){this.ctx.drawImage(tile.canvas,tile.x,tile.y,tile.w,tile.h)}
  render(viewport:Size,camera:Camera,reduced:boolean,hover:string|null,selected:string|null) {
    const ctx=this.ctx,dpr=this.pixelRatio,state=camera.value
    const dark=document.documentElement.dataset.appearance==='dark'
    if(dark!==this.dark){this.dark=dark;this.architecture.setAppearance(dark);this.resetSurfaces()}
    this.architecture.setScreenScale(this.recordingCamera ? .38 : state.zoom)
    // Both raster density and the screen-sized print belong to the cache key.
    const rasterLevel=this.recordingCamera?1:state.zoom<.4?0:state.zoom<.7?1:2
    if(this.cacheLevel!==rasterLevel||this.printLevel!==this.architecture.screenLevel){this.tiles.clear();this.cacheLevel=rasterLevel;this.printLevel=this.architecture.screenLevel}
    this.team.beginFrame();this.drawBackdrop(viewport)
    ctx.setTransform(dpr*state.zoom,0,0,dpr*state.zoom,dpr*(viewport.width/2+state.x),dpr*(viewport.height/2+state.y))
    // Bilinear sampling stays filtered without the costly per-frame high-quality
    // downsampling pass across hundreds of Retina room tiles.
    ctx.lineCap='round';ctx.lineJoin='round';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=this.recordingCamera?'low':'high'
    const variant=0
    // Keep the floor vector-sharp at close inspection. Cache static furniture at
    // display density; repeatedly drawing every book spine made gait playback stutter.
    const vectorDetail=!this.recordingCamera&&state.zoom>1.05
    const ordered=[...this.definitions].sort((a,b)=>a.origin.x+a.origin.y-b.origin.x-b.origin.y)
    for(const def of ordered) {
      const origin=project(def.origin.x,def.origin.y)
      const screenX=(origin.x*state.zoom+viewport.width/2+state.x),screenY=origin.y*state.zoom+viewport.height/2+state.y
      if(screenX-def.depth*40*state.zoom>viewport.width||screenX+def.width*40*state.zoom<0||screenY-def.wallHeight*40*state.zoom>viewport.height||screenY+(def.width+def.depth)*20*state.zoom<0)continue
      this.team.setOrigin(origin.x,origin.y)
      ctx.save();ctx.translate(origin.x,origin.y)
      if(vectorDetail)this.architecture.drawBase(ctx,def,variant)
      else this.drawTile(this.tile(def,null,variant))
      this.architecture.drawLivingGrain(ctx,def,this.people.time,reduced)
      const chairPosition=(f:Furniture):Furniture=>{
        if(f.kind!=='chair')return f
        const b=this.bruno.state(this.brunoTime,reduced),seat=def.stations[6]
        if(this.preset&&def.id==='connected-office'&&f.id===`${seat.id}-chair`){const i=b.mode==='work'?seat.i:b.activity==='stand'||b.activity==='sit'?b.i:brunoStops.exit.i;return {...f,i:f.i+i-seat.i}}
        const a=this.people.actors.find(a=>a.roomId===def.id&&this.team.has(a.index)&&f.id===`${a.station.id}-chair`)
        if(!a||a.mode==='work')return f
        const i=a.mode==='idle'&&a.activity!=='task'?a.i:(a.exit?.i??a.station.i)
        return {...f,i:f.i+i-a.station.i}
      }
      const occupiedArtwork=(f:Furniture)=>f.kind==='chair'&&this.people.actors.some(a=>a.roomId===def.id&&f.id===`${a.station.id}-chair`&&this.team.hasOccupiedChair(a)&&(!this.preset||a.index!==13))
      const drawFurniture=(f:Furniture)=>{if(occupiedArtwork(f))return;const positioned=chairPosition(f);if(positioned!==f||(!this.recordingCamera&&state.zoom>1.6))return this.architecture.drawFurniture(ctx,def,positioned,variant);const density=vectorDetail?Math.min(2.5,Math.ceil(state.zoom*dpr*2)/2):0;return this.drawTile(this.tile(def,f,variant,density))}
      const chairDepth=(f:Furniture)=>{
        const depth=this.architecture.depth(chairPosition(f))
        if(f.kind!=='chair')return depth
        const b=this.bruno.state(this.brunoTime,reduced)
        // The occupied chair is behind its own rising torso; unrelated furniture
        // and the bench keep their normal floor depth.
        if(this.preset&&def.id==='connected-office'&&f.id===`${def.stations[6].id}-chair`&&b.mode==='idle'&&Math.hypot(b.i-brunoStops.desk.i,b.j-brunoStops.desk.j)<1)return Math.min(depth,b.i+b.j-.03)
        const occupant=this.people.actors.find(a=>a.roomId===def.id&&this.team.has(a.index)&&f.id===`${a.station.id}-chair`&&(a.mode==='idle'||a.mode==='work')&&Math.hypot(a.i-a.station.i,a.j-a.station.j)<1)
        return occupant?Math.min(depth,occupant.i+occupant.j-.03):depth
      }
      const items=def.furniture.filter(f=>f.kind!=='rug'&&f.kind!=='reservedlane').map(f=>({depth:chairDepth(f),draw:()=>{
        drawFurniture(f)
        if(this.preset&&def.id==='connected-office'&&f.id===def.stations[6].furnitureId&&this.bruno.state(this.brunoTime,reduced).mode==='work'&&this.bruno.state(this.brunoTime,reduced).activity!=='read'){
          ctx.save();ctx.beginPath();[project(f.i,f.j,1.35),project(f.i+f.w,f.j,1.35),project(f.i+f.w,f.j+f.d,1.35),project(f.i,f.j+f.d,1.35)].forEach((v,k)=>k?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.clip()
          this.bruno.drawWorkSurface(ctx,this.brunoTime,reduced,state.zoom);ctx.restore()
        }
        if(['bench','desk','labdesk','designdesk','conference'].includes(f.kind))for(const actor of this.people.actors.filter(a=>(!this.preset||a.index!==13)&&a.roomId===def.id&&a.mode==='work'&&(a.station.furnitureId===f.id||!a.station.furnitureId&&Math.abs(f.i-a.station.i-.45)<.12&&a.station.j>=f.j&&a.station.j<=f.j+f.d))){
          ctx.save();ctx.beginPath()
          ;[project(f.i,f.j,1.35),project(f.i+f.w,f.j,1.35),project(f.i+f.w,f.j+f.d,1.35),project(f.i,f.j+f.d,1.35)].forEach((v,k)=>k?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.clip()
          this.team.draw(ctx,actor,this.people.time,reduced,state.zoom,true);ctx.restore()
        }
      }}))
      // Rugs are already painted in drawBase. Do not allocate transparent tiles
      // for them: their large footprints needlessly exhaust the canvas budget.
      for(const actor of this.people.actors.filter(a=>a.roomId===def.id&&!(this.preset&&def.id==='connected-office'&&a.index===13))) {
        items.push({depth:actor.i+actor.j,draw:()=>{
          const p=project(actor.i,actor.j)
          ctx.save();ctx.fillStyle='rgba(28,42,56,.14)';ctx.beginPath();ctx.ellipse(p.x+2,p.y,13,4.2,0,0,Math.PI*2);ctx.fill();ctx.restore()
          ctx.save();if(actor.mode==='work'||this.team.hasOccupiedChair(actor))this.clipBelowTop(def,actor.station.furnitureId,actor.i,actor.j);this.team.draw(ctx,actor,this.people.time,reduced,state.zoom);ctx.restore()
        }})
      }
      if(this.preset&&def.id==='connected-office'){
        const b=this.bruno.state(this.brunoTime,reduced)
        items.push({depth:11.2,draw:()=>this.bruno.drawLibraryProp(ctx,this.brunoTime,reduced)})
        items.push({depth:brunoStops.desk.i+brunoStops.desk.j+2.4,draw:()=>this.bruno.drawStation(ctx,this.brunoTime,reduced)})
        items.push({depth:brunoStops.coffee.i+brunoStops.coffee.j-.4,draw:()=>this.bruno.drawCoffee(ctx,this.brunoTime,reduced)})
        items.push({depth:b.i+b.j,draw:()=>{ctx.save();if(b.mode==='work')this.clipBelowTop(def,def.stations[6].furnitureId,b.i,b.j);this.bruno.draw(ctx,this.brunoTime,reduced,state.zoom);ctx.restore()}})
      }
      items.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw())
      for(const a of this.people.actors.filter(a=>a.roomId===def.id&&a.mode==='work'&&(!this.preset||a.index!==13))){ctx.save();this.clipBelowTop(def,a.station.furnitureId,a.i,a.j);this.team.draw(ctx,a,this.people.time,reduced,state.zoom);ctx.restore();this.team.draw(ctx,a,this.people.time,reduced,state.zoom,true)}
      for(const actor of this.people.actors.filter(a=>a.roomId===def.id&&a.mode==='work'&&a.station.reverse&&!this.team.hasOccupiedChair(a)&&(!this.preset||a.index!==13))){
        const chair=def.furniture.find(f=>f.kind==='chair'&&f.id===`${actor.station.id}-chair`)
        if(chair){ctx.save();const f=def.furniture.find(f=>f.id===actor.station.furnitureId);if(f){ctx.beginPath();ctx.rect(-10000,-10000,20000,20000);[project(f.i,f.j,1.35),project(f.i+f.w,f.j,1.35),project(f.i+f.w,f.j+f.d,1.35),project(f.i,f.j+f.d,1.35)].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip('evenodd')}this.architecture.drawChairForeground(ctx,chair);ctx.restore()}
      }
      if(this.preset&&def.id==='connected-office'&&this.bruno.state(this.brunoTime,reduced).mode==='work'){const b=this.bruno.state(this.brunoTime,reduced);ctx.save();this.clipBelowTop(def,def.stations[6].furnitureId,b.i,b.j);this.bruno.draw(ctx,this.brunoTime,reduced,state.zoom);ctx.restore();this.bruno.drawWorkSurface(ctx,this.brunoTime,reduced,state.zoom)}
      if(this.preset&&def.id==='connected-office')this.bruno.drawCoffeeFront(ctx,this.brunoTime,reduced)
      if(hover===def.id||selected===def.id) {
        ctx.beginPath();[project(0,0),project(def.width,0),project(def.width,def.depth),project(0,def.depth)].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()
        ctx.strokeStyle=selected===def.id?def.accent:'rgba(61,100,130,.35)';ctx.lineWidth=1.3;ctx.stroke()
      }
      ctx.restore()
    }
  }
  private clipBelowTop(def:OfficeDefinition,id:string|undefined,i:number,j:number){
    const f=def.furniture.find(f=>f.id===id);if(!f)return
    // Occlude only the lower body. A long desktop can project behind another
    // colleague's head, so subtracting its whole polygon would cut off faces.
    const c=this.ctx,p=project(i,j),cut=p.y-38,points=[project(f.i,f.j,1.35),project(f.i+f.w,f.j,1.35),project(f.i+f.w,f.j+f.d,1.35),project(f.i,f.j+f.d,1.35)]
    const lower:typeof points=[];for(let n=0;n<points.length;n++){const a=points[n],b=points[(n+1)%points.length],inside=a.y>=cut,next=b.y>=cut;if(inside)lower.push(a);if(inside!==next){const u=(cut-a.y)/(b.y-a.y);lower.push({x:a.x+(b.x-a.x)*u,y:cut})}}
    if(!lower.length)return;c.beginPath();c.rect(-10000,-10000,20000,20000);lower.forEach((v,k)=>k?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.clip('evenodd')
  }
  private drawBackdrop(viewport:Size) {
    const ctx=this.ctx,dpr=this.pixelRatio
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'
    if(this.transparentBackground){ctx.clearRect(0,0,viewport.width,viewport.height);return}
    // Paint the paper directly, so a large cached canvas cannot become a black
    // backdrop during scene/pose changes.
    ctx.fillStyle=this.dark?'#1c1b22':'#f3eddf';ctx.fillRect(0,0,viewport.width,viewport.height)
    if(!this.backdrop){
      const tile=document.createElement('canvas');tile.width=128;tile.height=128
      const c=tile.getContext('2d')!
      for(let n=0;n<126;n++){
        const x=(Math.sin(n*127.1)*43758.5453%1+1)%1*128,y=(Math.sin(n*311.7)*25291.31%1+1)%1*128
        c.fillStyle=n%3?'rgba(100,87,68,.035)':'rgba(255,255,255,.3)';c.fillRect(x,y,n%4===0?1.5:.6,.6)
      }
      this.backdrop=ctx.createPattern(tile,'repeat')
    }
    ctx.fillStyle=this.backdrop!;ctx.fillRect(0,0,viewport.width,viewport.height)
  }
  dispose(){this.team.dispose();this.bruno.dispose();this.tiles.clear()}
}
