import {atlasColumns,atlasRows,officeOccluders} from './officeTeamData.ts'
import type {OfficeSimulation} from './OfficeSimulation'
import type {RasterOccluder} from '../world/campusData'
import {characterPose} from './characterPose.ts'
import {drawCharacterRig} from './CharacterRigRenderer.ts'
import type {Portrait} from './CharacterRigRenderer.ts'

export interface TeamArtwork {
  portraits:Portrait[]
  cuts:{image:HTMLCanvasElement;x:number;y:number;slope:number;intercept:number}[]
}
type CanvasFactory=(width:number,height:number)=>HTMLCanvasElement
const makeCanvas:CanvasFactory=(width,height)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas
}
const portraitCache=new WeakMap<CanvasImageSource,Portrait[]>()
let sharedSheet:Promise<HTMLImageElement>|undefined

/** Keep portrait/cloth texture; the original baked legs, arms and seated silhouettes are not animated. */
export function prepareTeamArtwork(sheet:CanvasImageSource,plate:CanvasImageSource,createCanvas=makeCanvas,occluders:readonly RasterOccluder[]=officeOccluders):TeamArtwork {
  let portraits=portraitCache.get(sheet)
  if(!portraits) {
    portraits=atlasRows.slice(0,-1).map((top,row)=>{
      const width=atlasColumns[1]-atlasColumns[0],height=atlasRows[row+1]-top
      const source=createCanvas(width,height),ctx=source.getContext('2d')!
      ctx.drawImage(sheet,atlasColumns[0],top,width,height,0,0,width,height)
      const pixels=ctx.getImageData(0,0,width,height).data
      let x0=width,y0=height,x1=0,y1=0
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>100){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
      if(x0>x1||y0>y1)throw new Error('Empty character portrait '+row)
      const image=createCanvas(x1-x0+1,y1-y0+1)
      image.getContext('2d')!.drawImage(source,x0,y0,image.width,image.height,0,0,image.width,image.height)
      return {image,width:image.width,height:image.height}
    })
    portraitCache.set(sheet,portraits)
  }
  const cuts=occluders.map(({polygon,slope,intercept})=>{
    const x=Math.min(...polygon.map(p=>p[0])),y=Math.min(...polygon.map(p=>p[1]))
    const image=createCanvas(Math.max(...polygon.map(p=>p[0]))-x+1,Math.max(...polygon.map(p=>p[1]))-y+1)
    const ctx=image.getContext('2d')!;ctx.translate(-x,-y);ctx.beginPath()
    polygon.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();ctx.drawImage(plate,0,0)
    return {image,x,y,slope,intercept}
  })
  return {portraits,cuts}
}

export function drawOfficeTeam(ctx:CanvasRenderingContext2D,world:OfficeSimulation,art:TeamArtwork,reduced=false):void {
  const time=world.time-(1-world.renderAlpha)*world.lastDelta
  const actors=world.actors.map(actor=>({actor,pose:characterPose(actor,world.workstations[actor.spot],time,reduced,world.renderAlpha)}))
  actors.sort((a,b)=>a.pose.ground.y-b.pose.ground.y)
  for(const {actor,pose} of actors) {
    const h=actor.height,station=world.workstations[actor.spot]
    ctx.save();ctx.fillStyle='rgba(30,39,51,0.12)';ctx.beginPath()
    const feet=pose.legs.map(leg=>leg.end),x=(feet[0].x+feet[1].x)/2,y=Math.max(feet[0].y,feet[1].y)
    ctx.ellipse(x,y+1,h*0.14,h*0.033,0,0,Math.PI*2);ctx.fill();ctx.restore()
    const drawPaper=()=>{
    if(station&&pose.seated>0.98&&(actor.workMode==='reading'||actor.workMode==='writing')) {
      const {x,y}=station.interaction
      ctx.save();ctx.fillStyle='#f7f5ef';ctx.strokeStyle='#64717b';ctx.lineWidth=0.6
      ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x+3,y-6);ctx.lineTo(x+12,y);ctx.lineTo(x-2,y+7);ctx.closePath();ctx.fill();ctx.stroke()
      ctx.strokeStyle='#a1acb6';ctx.lineWidth=0.5
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-5+i,y+i);ctx.lineTo(x+3+i,y-3+i);ctx.stroke()}
      ctx.restore()
    }
    }
    if(station?.surface!=='lap')drawPaper()
    drawCharacterRig(ctx,actor,pose,art.portraits[actor.row],station?.surface==='lap'?drawPaper:undefined)
    // Restore the painted furniture only where this person's floor anchor lies behind it.
    ctx.save();ctx.beginPath();ctx.rect(pose.ground.x-h,Math.min(pose.head.y-h*0.27,pose.hip.y-h*0.6),h*2,h*1.65);ctx.clip()
    for(const cut of art.cuts)if(pose.ground.y<cut.slope*pose.ground.x+cut.intercept)ctx.drawImage(cut.image,cut.x,cut.y)
    ctx.restore()
  }
}

export class OfficeTeamRenderer {
  artwork:TeamArtwork|null=null
  plate:HTMLImageElement|null=null
  error:string|null=null
  constructor(source='/assets/rooms/connected-office-contemporary.png',occluders:readonly RasterOccluder[]=officeOccluders) {
    const load=(source:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Cannot load '+source));image.src=source
    })
    sharedSheet??=load('/assets/living/office-team.png')
    void Promise.all([sharedSheet,load(source)]).then(([sheet,plate])=>{this.plate=plate;this.artwork=prepareTeamArtwork(sheet,plate,makeCanvas,occluders)})
      .catch((error:unknown)=>{this.error=String(error);console.error('Office population:',error)})
  }
}
