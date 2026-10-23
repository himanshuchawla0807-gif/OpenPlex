import {carryVertex} from '../characters/carryDeformation'
export function drawCarryMesh(ctx:CanvasRenderingContext2D,image:HTMLImageElement,rect:{x:number;y:number;w:number;h:number},phase:number,pad:number,freeSide=1){
 const cols=6,rows=10
 const points=Array.from({length:(cols+1)*(rows+1)},(_,k)=>{
  const u=k%(cols+1)/cols,v=Math.floor(k/(cols+1))/rows,p=carryVertex(u,v,phase,freeSide)
  return {sx:u*rect.w,sy:v*rect.h,x:p.x*rect.w+pad,y:p.y*rect.h+pad}
 })
 const triangle=(ids:number[])=>{
  const [a,b,c]=ids.map(i=>points[i]),det=(b.sx-a.sx)*(c.sy-a.sy)-(c.sx-a.sx)*(b.sy-a.sy)
  const A=((b.x-a.x)*(c.sy-a.sy)-(c.x-a.x)*(b.sy-a.sy))/det
  const C=((c.x-a.x)*(b.sx-a.sx)-(b.x-a.x)*(c.sx-a.sx))/det
  const B=((b.y-a.y)*(c.sy-a.sy)-(c.y-a.y)*(b.sy-a.sy))/det
  const D=((c.y-a.y)*(b.sx-a.sx)-(b.y-a.y)*(c.sx-a.sx))/det
  ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip()
  ctx.transform(A,B,C,D,a.x-A*a.sx-C*a.sy,a.y-B*a.sx-D*a.sy)
  ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);ctx.restore()
 }
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;triangle([a,b,d]);triangle([a,d,c])}
}
