/** Preserve source files: make only the runtime sprite surface opaque and richer. */
export function solidArtwork(data:Uint8ClampedArray,saturation=1.18){
 for(let n=0;n<data.length;n+=4){
  const alpha=data[n+3];if(alpha<24){data[n+3]=0;continue}
  if(alpha>=120)data[n+3]=255
  const l=data[n]*.2126+data[n+1]*.7152+data[n+2]*.0722
  for(let c=0;c<3;c++)data[n+c]=Math.max(0,Math.min(255,l+(data[n+c]-l)*saturation))
 }
}
/** Discard disconnected neighboring atlas figures after a registered crop.
 * The original PNG stays untouched; antialiased pixels connected to the body remain. */
export function isolateArtwork(data:Uint8ClampedArray,width:number,height:number){
 const count=width*height,seen=new Uint8Array(count),queue=new Uint32Array(count)
 let largest=new Uint32Array(0)
 for(let start=0;start<count;start++){
  if(seen[start]||data[start*4+3]<24)continue
  let read=0,end=1;queue[0]=start;seen[start]=1
  while(read<end){const p=queue[read++],x=p%width,y=Math.floor(p/width)
   for(const next of [x?p-1:-1,x+1<width?p+1:-1,y?p-width:-1,y+1<height?p+width:-1]){
    if(next>=0&&!seen[next]&&data[next*4+3]>=24){seen[next]=1;queue[end++]=next}
   }
  }
  if(end>largest.length)largest=queue.slice(0,end)
 }
 const keep=new Uint8Array(count);for(const p of largest)keep[p]=1
 for(let p=0;p<count;p++)if(!keep[p])data[p*4+3]=0
}
export function printArtwork(ctx:CanvasRenderingContext2D,height:number,variant:number,_zoom:number){
 const pixels=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);solidArtwork(pixels.data);ctx.putImageData(pixels,0,0)
 ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(61,86,111,.18)'
 const pitch=height/101*3.1
 for(let y=variant*.65;y<ctx.canvas.height;y+=pitch)for(let x=variant*.4;x<ctx.canvas.width;x+=pitch){ctx.beginPath();ctx.arc(x,y,pitch*.26,0,Math.PI*2);ctx.fill()}
 ctx.globalCompositeOperation='source-over'
}
