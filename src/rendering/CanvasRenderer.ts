import type { Camera } from '../camera/Camera'
import type { AnimationState } from '../engine/animation'
import { sortByDepth } from '../engine/depth'
import type { Size } from '../types/geometry'
import type { Room } from '../types/world'
import type { WorkerEntity } from '../types/worker'
import { renderRoom } from './roomRenderer'
import { RoomArtworkRenderer } from './rooms/RoomArtworkRenderer'
import { ImageCache } from './sprites/ImageCache'
import { SpriteRenderer } from './sprites/SpriteRenderer'
import { LivingRenderer } from '../living/LivingRenderer'
import type { LivingWorld } from '../living/LivingWorld'
import { OfficeTeamRenderer, drawOfficeTeam } from '../living/OfficeTeamRenderer'
import type { CampusWorld } from '../living/CampusWorld'
import {campusProfiles} from '../world/campusData'
import {CampusAmbience} from '../living/CampusAmbience'
import { getRoomArtwork } from '../assets/rooms/manifest'
import { worldToIso } from '../engine/isometric'

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly pixelRatio: number
  private readonly imageCache = new ImageCache()
  private readonly spriteRenderer = new SpriteRenderer(this.imageCache)
  private readonly roomArtworkRenderer = new RoomArtworkRenderer(this.imageCache)
  private livingRenderer: LivingRenderer | null = null
  private background:HTMLCanvasElement|null=null
  private backgroundKey=''
  backgroundRebuilds=0
  private readonly teamRenderers=new Map(campusProfiles.map(profile=>[profile.id,new OfficeTeamRenderer('/assets/rooms/'+profile.id+'-contemporary.png',profile.occluders)]))
  private readonly ambience=new Map(campusProfiles.map(profile=>[profile.id,new CampusAmbience(profile.ambient)]))
  get teamReady() { return [...this.teamRenderers.values()].every(renderer=>Boolean(renderer.artwork)) }
  get teamError() { return [...this.teamRenderers.values()].find(renderer=>renderer.error)?.error??null }
  artworkReady(rooms: Room[]) { return rooms.every(room => this.roomArtworkRenderer.isReady(room)) }

  get livingStats() { return this.livingRenderer?.stats }
  get livingReady() { return this.livingRenderer?.ready ?? false }

  constructor(
    context: CanvasRenderingContext2D,
    pixelRatio: number,
  ) {
    this.context = context
    this.pixelRatio = pixelRatio
  }

  render(
    viewport: Size,
    camera: Camera,
    rooms: Room[],
    animation: AnimationState,
    hoveredRoomId: string | null,
    selectedRoomId: string | null,
    workers: WorkerEntity[],
    livingWorld?: LivingWorld,
    reducedMotion = false,
    campus?: CampusWorld,
  ): void {
    if (livingWorld) {
      this.livingRenderer ??= new LivingRenderer(this.context, this.pixelRatio, rooms, livingWorld.rooms)
      if (this.livingRenderer.ready) {
        this.livingRenderer.render(viewport, camera, rooms, livingWorld, hoveredRoomId, selectedRoomId, reducedMotion)
        return
      }
    }
    const ctx=this.context,dpr=this.pixelRatio
    const ordered=sortByDepth(rooms,room=>({anchor:{x:room.origin.x+room.width,y:room.origin.y+room.depth,z:0}}))
    const cacheable=workers.length===0&&rooms.every(room=>campus?.simulations.has(room.id))
    if(cacheable) {
      const key=JSON.stringify([viewport.width,viewport.height,camera.value,hoveredRoomId,selectedRoomId,rooms.map(room=>this.roomArtworkRenderer.isReady(room))])
      this.background??=document.createElement('canvas')
      if(key!==this.backgroundKey) {
        this.background.width=Math.max(1,Math.round(viewport.width*dpr))
        this.background.height=Math.max(1,Math.round(viewport.height*dpr))
        this.drawStatic(this.background.getContext('2d')!,viewport,camera,ordered,animation,hoveredRoomId,selectedRoomId,workers)
        this.backgroundKey=key;this.backgroundRebuilds++
      }
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.background,0,0)
    } else this.drawStatic(ctx,viewport,camera,ordered,animation,hoveredRoomId,selectedRoomId,workers)
    this.setWorldTransform(ctx,viewport,camera)
    for(const room of ordered) {
      const simulation=campus?.simulations.get(room.id),teamRenderer=this.teamRenderers.get(room.id)
      const profile=campusProfiles.find(p=>p.id===room.id)
      if(!room.artwork||!simulation||!profile||!teamRenderer?.artwork)continue
      const origin=worldToIso(room.origin),art=getRoomArtwork(room.artwork.assetId),scale=art.base.scale??1
      const x=origin.x+art.base.offset.x,y=origin.y+art.base.offset.y,state=camera.value
      // Don't animate rooms that are completely outside the current viewport.
      const left=(x*state.zoom+viewport.width/2+state.x),top=y*state.zoom+viewport.height/2+state.y
      if(left>viewport.width||top>viewport.height||left+1536*scale*state.zoom<0||top+1024*scale*state.zoom<0)continue
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale)
      ctx.beginPath();art.base.clipPolygon?.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip()
      drawOfficeTeam(ctx,simulation,teamRenderer.artwork,reducedMotion)
      if(teamRenderer.plate)this.ambience.get(room.id)!.draw(ctx,teamRenderer.plate,profile.ambient,simulation,reducedMotion)
      ctx.restore()
    }
  }

  private setWorldTransform(ctx:CanvasRenderingContext2D,viewport:Size,camera:Camera):void {
    const dpr=this.pixelRatio,state=camera.value
    ctx.setTransform(dpr*state.zoom,0,0,dpr*state.zoom,dpr*(viewport.width/2+state.x),dpr*(viewport.height/2+state.y))
    ctx.lineJoin='round';ctx.lineCap='round';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'
  }

  private drawStatic(ctx:CanvasRenderingContext2D,viewport:Size,camera:Camera,ordered:Room[],animation:AnimationState,hoveredRoomId:string|null,selectedRoomId:string|null,workers:WorkerEntity[]):void {
    const dpr=this.pixelRatio
    ctx.setTransform(dpr,0,0,dpr,0,0);this.drawBackdrop(ctx,viewport)
    this.setWorldTransform(ctx,viewport,camera)
    ordered.forEach(room=>{
      renderRoom(ctx,room,animation,hoveredRoomId===room.id,selectedRoomId===room.id,this.spriteRenderer,this.roomArtworkRenderer,workers)
    })
  }

  private drawBackdrop(ctx:CanvasRenderingContext2D,viewport: Size): void {
    ctx.fillStyle = '#f3eddf'
    ctx.fillRect(0, 0, viewport.width, viewport.height)

    ctx.fillStyle = 'rgba(92, 78, 63, 0.09)'
    const offset = 0
    for (let y = 8 + offset; y < viewport.height; y += 17) {
      for (let x = 10 + ((y / 17) % 2) * 9; x < viewport.width; x += 21) {
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}
