import type {Point} from '../types/geometry'
import type {OfficeActor} from './OfficeSimulation.ts'
import type {CharacterPose,RigLimb} from './characterPose.ts'
import {mixPoint} from './characterPose.ts'

export interface Portrait {image:HTMLCanvasElement;width:number;height:number}
interface Appearance {shirt:string;pants:string;skin:string;shoe:string;casual:boolean}
const appearances:Appearance[]=[
  {shirt:'#e8e9e4',pants:'#333943',skin:'#c39372',shoe:'#252933',casual:false},
  {shirt:'#c77961',pants:'#293b50',skin:'#ba8568',shoe:'#30333b',casual:false},
  {shirt:'#8b9c86',pants:'#c5b89e',skin:'#b88965',shoe:'#dddcd4',casual:true},
  {shirt:'#b4a5c8',pants:'#334154',skin:'#d1a183',shoe:'#d4d3cc',casual:true},
  {shirt:'#cc9d47',pants:'#4a4c4e',skin:'#a16f52',shoe:'#2a2c31',casual:false},
  {shirt:'#a9c2da',pants:'#293d53',skin:'#ba8d71',shoe:'#252c34',casual:false},
  {shirt:'#e8e7e0',pants:'#53595d',skin:'#b98a6b',shoe:'#6a4634',casual:false},
  {shirt:'#cb8068',pants:'#3d4146',skin:'#c38d65',shoe:'#d5d5cc',casual:true},
  {shirt:'#d4ab52',pants:'#7b8e78',skin:'#bd8d66',shoe:'#d7d7cf',casual:true},
  {shirt:'#869e8d',pants:'#353c41',skin:'#aa7859',shoe:'#353337',casual:false},
]
const shade=(hex:string,n:number)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')
const point=(a:Point,b:Point,t:number)=>mixPoint(a,b,t)

function segment(ctx:CanvasRenderingContext2D,a:Point,b:Point,w0:number,w1:number,color:string,outline:number):void {
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d
  const gradient=ctx.createLinearGradient(a.x+nx*w0,a.y+ny*w0,a.x-nx*w0,a.y-ny*w0)
  gradient.addColorStop(0,shade(color,14));gradient.addColorStop(0.48,color);gradient.addColorStop(1,shade(color,-27))
  ctx.fillStyle=gradient;ctx.strokeStyle=shade(color,-57);ctx.lineWidth=outline
  ctx.beginPath();ctx.moveTo(a.x+nx*w0,a.y+ny*w0);ctx.lineTo(b.x+nx*w1,b.y+ny*w1)
  ctx.quadraticCurveTo(b.x+dx/d*w1,b.y+dy/d*w1,b.x-nx*w1,b.y-ny*w1)
  ctx.lineTo(a.x-nx*w0,a.y-ny*w0);ctx.quadraticCurveTo(a.x-dx/d*w0,a.y-dy/d*w0,a.x+nx*w0,a.y+ny*w0)
  ctx.closePath();ctx.fill();ctx.stroke()
}

function seam(ctx:CanvasRenderingContext2D,a:Point,b:Point,color:string,width:number):void {
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()
}
function shoe(ctx:CanvasRenderingContext2D,foot:Point,h:number,heading:number,color:string,casual:boolean):void {
  const direction=Math.cos(heading)>=0?1:-1
  ctx.save();ctx.translate(foot.x,foot.y);ctx.rotate(Math.sin(heading)*direction*0.13)
  const grad=ctx.createLinearGradient(0,-h*0.035,0,h*0.012)
  grad.addColorStop(0,shade(color,26));grad.addColorStop(1,shade(color,-15));ctx.fillStyle=grad
  ctx.strokeStyle=shade(color,-65);ctx.lineWidth=h*0.007
  ctx.beginPath();ctx.moveTo(-direction*h*0.035,-h*0.036)
  ctx.quadraticCurveTo(direction*h*0.028,-h*0.052,direction*h*0.09,-h*0.014)
  ctx.quadraticCurveTo(direction*h*0.102,h*0.011,-direction*h*0.036,h*0.01);ctx.closePath();ctx.fill();ctx.stroke()
  seam(ctx,{x:-direction*h*0.03,y:h*0.006},{x:direction*h*0.085,y:h*0.004},casual?'#f0ede4':shade(color,-30),h*(casual?0.012:0.006))
  for(let n=0;n<3;n++)seam(ctx,{x:direction*h*(0.004+n*0.012),y:-h*0.025},{x:direction*h*(0.019+n*0.012),y:-h*0.012},shade(color,casual?-42:38),h*0.005)
  ctx.restore()
}

function leg(ctx:CanvasRenderingContext2D,limb:RigLimb,pose:CharacterPose,look:Appearance):void {
  const h=pose.height,w=look.casual?0.054:0.048
  segment(ctx,limb.root,limb.joint,h*w,h*w*0.87,look.pants,h*0.007)
  segment(ctx,limb.joint,limb.end,h*w*0.88,h*w*(look.casual?0.83:0.6),look.pants,h*0.007)
  // Knee folds and trouser creases remain attached to the bending limb.
  const crease=point(limb.root,limb.joint,0.52),end=point(limb.joint,limb.end,0.8)
  seam(ctx,{x:crease.x-h*0.008,y:crease.y},{x:limb.joint.x-h*0.011,y:limb.joint.y},shade(look.pants,15),h*0.005)
  seam(ctx,{x:limb.joint.x+h*0.018,y:limb.joint.y-h*0.01},end,shade(look.pants,-20),h*0.005)
  shoe(ctx,limb.end,h,pose.heading,look.shoe,look.casual)
}

function arm(ctx:CanvasRenderingContext2D,limb:RigLimb,pose:CharacterPose,look:Appearance):void {
  const h=pose.height
  if(look.casual) {
    const sleeve=point(limb.root,limb.joint,0.57)
    segment(ctx,limb.root,limb.joint,h*0.035,h*0.025,look.skin,h*0.006)
    segment(ctx,limb.root,sleeve,h*0.052,h*0.048,look.shirt,h*0.007)
    seam(ctx,{x:sleeve.x-h*0.034,y:sleeve.y},{x:sleeve.x+h*0.034,y:sleeve.y},shade(look.shirt,-29),h*0.006)
    segment(ctx,limb.joint,limb.end,h*0.025,h*0.018,look.skin,h*0.006)
  } else {
    segment(ctx,limb.root,limb.joint,h*0.044,h*0.034,look.shirt,h*0.007)
    const cuff=point(limb.joint,limb.end,0.87)
    segment(ctx,limb.joint,cuff,h*0.034,h*0.025,look.shirt,h*0.007)
    segment(ctx,cuff,limb.end,h*0.026,h*0.018,look.skin,h*0.006)
    const fold=point(limb.joint,cuff,0.23)
    seam(ctx,{x:fold.x-h*0.016,y:fold.y+h*0.008},{x:fold.x+h*0.018,y:fold.y-h*0.004},shade(look.shirt,-28),h*0.005)
  }
  ctx.save();ctx.translate(limb.end.x,limb.end.y);ctx.rotate(Math.atan2(limb.end.y-limb.joint.y,limb.end.x-limb.joint.x))
  ctx.fillStyle=shade(look.skin,9);ctx.strokeStyle=shade(look.skin,-42);ctx.lineWidth=h*0.0055
  ctx.beginPath();ctx.ellipse(0,0,h*0.027,h*0.012,-0.25,0,Math.PI*2);ctx.fill();ctx.stroke()
  for(let i=0;i<3;i++)seam(ctx,{x:h*(-0.005+i*0.01),y:0},{x:h*(-0.009+i*0.01),y:h*0.007},shade(look.skin,-25),h*0.0035)
  ctx.restore()
}

function backOfHead(ctx:CanvasRenderingContext2D,row:number,h:number,skin:string,direction:number):void {
  const hair=['#282624','#302a25','#282723','#563c2e','#292521','#646565','#262725','#292622','#292622','#292724'][row]
  const long=row===2||row===4,bob=row===0||row===3
  ctx.fillStyle=skin;ctx.strokeStyle=shade(skin,-40);ctx.lineWidth=h*0.005
  ctx.beginPath();ctx.ellipse(0,h*0.003,h*0.029,h*0.032,0,0,Math.PI*2);ctx.fill()
  const gradient=ctx.createLinearGradient(-h*0.09,-h*0.20,h*0.08,h*0.03)
  gradient.addColorStop(0,shade(hair,24));gradient.addColorStop(0.5,hair);gradient.addColorStop(1,shade(hair,-16))
  ctx.fillStyle=gradient;ctx.strokeStyle=shade(hair,-18);ctx.lineWidth=h*0.006
  ctx.beginPath();ctx.moveTo(-h*0.075,-h*0.025)
  ctx.bezierCurveTo(-h*0.13,-h*0.10,-h*0.095,-h*0.205,0,-h*0.205)
  ctx.bezierCurveTo(h*0.105,-h*0.207,h*0.13,-h*0.10,h*0.076,-h*0.025)
  ctx.quadraticCurveTo(h*0.065,long?h*0.11:bob?h*0.025:0,0,long?h*0.08:bob?h*0.035:-h*0.006)
  ctx.quadraticCurveTo(-h*0.07,long?h*0.11:bob?h*0.025:0,-h*0.075,-h*0.025);ctx.closePath();ctx.fill();ctx.stroke()
  if(row===1){ctx.beginPath();ctx.ellipse(direction*h*0.025,-h*0.203,h*0.041,h*0.035,0,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.strokeStyle=shade(hair,28);ctx.lineWidth=h*0.004
  for(let n=0;n<5;n++){
    const x=(n-2)*h*0.025
    ctx.beginPath();ctx.moveTo(x*0.7,-h*0.185);ctx.quadraticCurveTo(x*1.8,-h*0.12,x*0.8,-h*0.035);ctx.stroke()
  }
}

export function drawCharacterRig(ctx:CanvasRenderingContext2D,actor:OfficeActor,pose:CharacterPose,portrait:Portrait,drawHeldObject?:()=>void):void {
  const h=pose.height,look=appearances[actor.row],direction=Math.cos(pose.heading)>=0?1:-1
  const away=Math.max(0,Math.min(1,(-Math.sin(pose.heading)-0.25)/0.65))
  const armsBehind=Math.sin(pose.heading)<-0.15&&!drawHeldObject
  const limbs=[...pose.legs].sort((a,b)=>a.end.y-b.end.y)
  limbs.forEach(limb=>leg(ctx,limb,pose,look))
  const arms=[...pose.arms].sort((a,b)=>a.root.y-b.root.y)
  if(armsBehind)arms.forEach(limb=>arm(ctx,limb,pose,look))
  else arm(ctx,arms[0],pose,look)

  // The pelvis bridges both thighs and places the waist above the chair-contact joint.
  ctx.save();ctx.fillStyle=look.pants;ctx.strokeStyle=shade(look.pants,-45);ctx.lineWidth=h*0.007
  ctx.beginPath();ctx.ellipse(pose.hip.x,pose.hip.y-h*0.03,h*0.095*(0.65+0.35*Math.abs(Math.sin(pose.heading))),h*0.05,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()

  // A single opaque textured torso follows the spine; there are no pose or facing crossfades.
  ctx.save();ctx.translate(pose.chest.x,pose.chest.y)
  const lean=Math.atan2(pose.hip.x-pose.chest.x,pose.hip.y-pose.chest.y)
  ctx.rotate(-lean)
  const width=h*(look.casual?0.255:0.225)*(0.65+0.35*Math.abs(Math.sin(pose.heading))),height=Math.hypot(pose.hip.x-pose.chest.x,pose.hip.y-pose.chest.y)-h*0.055
  const grad=ctx.createLinearGradient(-width/2,0,width/2,height*0.4)
  grad.addColorStop(0,shade(look.shirt,17));grad.addColorStop(0.55,look.shirt);grad.addColorStop(1,shade(look.shirt,-26))
  ctx.fillStyle=grad;ctx.strokeStyle=shade(look.shirt,-60);ctx.lineWidth=h*0.008
  ctx.beginPath();ctx.moveTo(-width*0.32,-h*0.012)
  ctx.quadraticCurveTo(-width*0.57,h*0.01,-width*0.49,h*0.075)
  ctx.lineTo(-width*(look.casual?0.47:0.38),height)
  ctx.quadraticCurveTo(0,height+h*0.012,width*(look.casual?0.47:0.38),height)
  ctx.lineTo(width*0.49,h*0.075);ctx.quadraticCurveTo(width*0.57,h*0.01,width*0.32,-h*0.012);ctx.closePath();ctx.fill();ctx.stroke()
  // The original illustrated cloth supplies fine texture and identity without baking in arms or pose.
  ctx.save();ctx.clip();ctx.globalAlpha=1-away*0.85;ctx.globalCompositeOperation='source-over'
  ctx.scale(-direction,1)
  ctx.drawImage(portrait.image,portrait.width*0.29,portrait.height*0.28,portrait.width*0.45,portrait.height*0.205,-width*0.5,0,width,height)
  ctx.restore()
  seam(ctx,{x:-width*0.25,y:height*0.72},{x:-width*0.1,y:height*0.83},shade(look.shirt,-28),h*0.005)
  seam(ctx,{x:width*0.24,y:height*0.86},{x:width*0.35,y:height*0.77},shade(look.shirt,-25),h*0.005)
  if(!look.casual&&away<0.45) {
    seam(ctx,{x:0,y:h*0.025},{x:0,y:height*0.97},shade(look.shirt,-30),h*0.005)
    ctx.fillStyle=shade(look.shirt,-45)
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(h*0.014,h*(0.065+i*0.05),h*0.005,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle=shade(look.pants,-14);ctx.fillRect(-width*0.36,height-h*0.012,width*0.72,h*0.019)
  }
  ctx.restore()

  // Reuse the original high-detail portrait. Only the head is rigid, never the whole person.
  ctx.save();ctx.translate(pose.head.x,pose.head.y)
  ctx.rotate(-lean*0.25+pose.breath*0.005)
  const foreshorten=0.86+0.14*Math.abs(Math.cos(pose.heading))
  ctx.scale(-direction*foreshorten,1)
  if(away>0)backOfHead(ctx,actor.row,h,look.skin,direction)
  // Reveal the face spatially as the head turns; alpha crossfades produced translucent faces.
  if(away>0){ctx.beginPath();ctx.rect(-h*0.17,-h*0.23,h*0.34*(1-away),h*0.28);ctx.clip()}
  ctx.drawImage(portrait.image,0,0,portrait.width,portrait.height*0.265,-h*0.14,-h*0.20,h*0.28,h*0.21)
  ctx.restore()
  drawHeldObject?.()
  if(!armsBehind)arm(ctx,arms[1],pose,look)
}
