import { getRoomArtwork } from '../assets/rooms/manifest'
import { ImageCache } from '../rendering/sprites/ImageCache'
import type { Room } from '../types/world'
import type { LivingRoomDefinition, Polygon } from './types'

export interface RasterCut { image: HTMLCanvasElement; x: number; y: number }
export interface CharacterFrame extends RasterCut { height: number; footX: number; footY: number }
export interface RoomLayers {
  plate: HTMLCanvasElement
  cuts: Map<string, RasterCut>
  frames: CharacterFrame[][]
}
export function polygonPath(ctx: CanvasRenderingContext2D, points: Polygon): void {
  ctx.beginPath()
  points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y))
  ctx.closePath()
}
export function bounds(points: Polygon) {
  const xs = points.map(([x]) => x), ys = points.map(([,y]) => y)
  return {x:Math.floor(Math.min(...xs)),y:Math.floor(Math.min(...ys)),
    width:Math.ceil(Math.max(...xs)-Math.min(...xs)),height:Math.ceil(Math.max(...ys)-Math.min(...ys))}
}
function canvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas'); result.width=width; result.height=height; return result
}
function cutout(source: CanvasImageSource, polygon: Polygon): RasterCut {
  const box=bounds(polygon), image=canvas(box.width+2,box.height+2), ctx=image.getContext('2d')!
  ctx.translate(1-box.x,1-box.y); polygonPath(ctx,polygon); ctx.clip(); ctx.drawImage(source,0,0)
  return {image,x:box.x-1,y:box.y-1}
}

/** One-time raster extraction. No changed files, color-keying, recoloring or per-frame pixel scans. */
export class LivingAssets {
  readonly layers = new Map<string,RoomLayers>()
  ready = false
  error: string | null = null
  constructor(rooms: Room[], definitions: LivingRoomDefinition[]) {
    const cache = new ImageCache()
    void Promise.all(definitions.map(async definition => {
      const room=rooms.find(r=>r.id===definition.roomId)!
      const art=getRoomArtwork(room.artwork!.assetId)
      const [original,sheet,repair] = await Promise.all([
        cache.load(art.base.source),cache.load(definition.sheet),
        definition.repair ? cache.load(definition.repair.source) : Promise.resolve(null),
      ])
      const plate=canvas(1536,1024),ctx=plate.getContext('2d')!
      ctx.drawImage(original,0,0)
      if (repair && definition.repair) for (const mask of definition.repair.masks) {
        ctx.save();polygonPath(ctx,mask);ctx.clip();ctx.drawImage(repair,0,0,1536,1024);ctx.restore()
      }
      const cuts = new Map<string,RasterCut>()
      for (const item of definition.foreground) cuts.set(item.id,cutout(plate,item.polygon))
      for (const item of definition.ambient) cuts.set(item.id,cutout(plate,item.sourcePolygon ?? item.polygon))
      const frames: CharacterFrame[][] = []
      const cellWidth=sheet.width/6,cellHeight=sheet.height/2
      for (let row=0;row<2;row++) {
        frames[row]=[]
        for(let col=0;col<6;col++) {
          const image=canvas(cellWidth,cellHeight),frameCtx=image.getContext('2d')!
          frameCtx.drawImage(sheet,col*cellWidth,row*cellHeight,cellWidth,cellHeight,0,0,cellWidth,cellHeight)
          const pixels=frameCtx.getImageData(0,0,cellWidth,cellHeight).data
          let top=cellHeight,bottom=0,feetMin=cellWidth,feetMax=0
          for(let y=0;y<cellHeight;y++) for(let x=0;x<cellWidth;x++) if(pixels[(y*cellWidth+x)*4+3]>100) {top=Math.min(top,y);bottom=Math.max(bottom,y)}
          for(let y=Math.max(top,bottom-20);y<=bottom;y++) for(let x=0;x<cellWidth;x++) if(pixels[(y*cellWidth+x)*4+3]>100) {feetMin=Math.min(feetMin,x);feetMax=Math.max(feetMax,x)}
          frames[row].push({image,x:0,y:0,height:bottom-top,footX:(feetMin+feetMax)/2,footY:bottom})
        }
      }
      this.layers.set(room.id,{plate,cuts,frames})
    })).then(()=>{this.ready=true}).catch((error:unknown)=>{
      this.error=String(error);console.error('Living artwork could not load:',error)
    })
  }
}
