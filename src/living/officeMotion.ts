import { polygonPath } from './LivingAssets'
import type { RasterCut } from './LivingAssets'
import type { AmbientEvent } from './types'

/** Tiny screen/status marks and a raster paper feed; the room remains a painted PNG. */
export function drawOfficeMotion(ctx:CanvasRenderingContext2D,event:AmbientEvent,cut:RasterCut,time:number):boolean {
  const def=event.definition
  if(!['screen','printer','whiteboard','coffee'].includes(def.kind))return false
  const phase=Math.min(1,Math.max(0,(time-event.startedAt)/def.duration))
  const envelope=Math.sin(Math.PI*phase)**2
  ctx.save();polygonPath(ctx,def.polygon);ctx.clip()
  if(def.kind==='printer') {
    // Reuse the plate's printed paper texture. It emerges from the slot, holds, then is collected.
    const feed=Math.min(1,Math.max(0,(phase-0.12)/0.56))
    ctx.globalAlpha=phase>0.84?(1-phase)/0.16:Math.min(1,phase/0.12)
    ctx.save();ctx.beginPath();ctx.rect(731,775,60,43);ctx.clip()
    ctx.drawImage(cut.image,cut.x+33+feed*7,cut.y-68+feed*20)
    ctx.restore()
    ctx.fillStyle=`rgba(111,153,124,${envelope*0.6})`;ctx.fillRect(716,774,3,4)
  } else if(def.kind==='screen') {
    ctx.globalAlpha=envelope*0.4;ctx.strokeStyle='#a1b9b8';ctx.lineWidth=1
    const [x,y]=def.polygon[0]
    for(let i=0;i<3;i++){
      ctx.beginPath();ctx.moveTo(x+8,y+12+i*7);ctx.lineTo(x+20+i*5,y+7+i*7);ctx.stroke()
    }
    ctx.fillStyle='#d4c69b';ctx.fillRect(x+12+Math.floor(phase*3)*3,y+33,2,3)
  } else if(def.kind==='whiteboard') {
    ctx.globalAlpha=envelope*0.65;ctx.strokeStyle='#405c6b';ctx.lineWidth=0.8
    const [x,y]=def.polygon[0]
    ctx.beginPath();ctx.moveTo(x+3,y+6);ctx.lineTo(x+4+phase*8,y+9-phase*3);ctx.stroke()
  } else {
    ctx.fillStyle=`rgba(190,158,77,${envelope*0.55})`;ctx.fillRect(def.pivot.x+3,def.pivot.y+4,2,2)
  }
  ctx.restore();return true
}
