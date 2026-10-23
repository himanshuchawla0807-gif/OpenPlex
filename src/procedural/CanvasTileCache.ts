/** Bound retained backing stores across zoom levels and texture impressions.
 * Safari may silently drop canvases when a page retains hundreds of MB. */
export interface CanvasTile {canvas:HTMLCanvasElement;x:number;y:number;w:number;h:number}
export class CanvasTileCache {
  private readonly entries=new Map<string,CanvasTile>()
  bytes=0
  readonly budget:number
  constructor(budget=96*1024*1024){this.budget=budget}
  get size(){return this.entries.size}
  get(key:string){
    const tile=this.entries.get(key)
    if(tile){this.entries.delete(key);this.entries.set(key,tile)}
    return tile
  }
  delete(key:string){
    const tile=this.entries.get(key)
    if(!tile)return
    this.entries.delete(key);this.bytes-=tile.canvas.width*tile.canvas.height*4
    // Explicitly release the backing store; waiting for GC retains GPU memory.
    tile.canvas.width=0;tile.canvas.height=0
  }
  set(key:string,tile:CanvasTile){
    this.delete(key)
    const bytes=tile.canvas.width*tile.canvas.height*4
    while(this.bytes+bytes>this.budget&&this.entries.size)this.delete(this.entries.keys().next().value!)
    this.entries.set(key,tile);this.bytes+=bytes
  }
  clear(){for(const key of this.entries.keys())this.delete(key)}
}
