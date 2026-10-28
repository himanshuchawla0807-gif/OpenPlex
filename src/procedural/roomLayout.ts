/** Dense, deterministic shelves become a filled diamond in isometric view. */
export function arrangeFootprints<T extends {id:string;templateId:string;origin:{x:number;y:number}}>(rooms:T[],catalog:ReadonlyArray<{id:string;width:number;depth:number}>):T[]{
  if(!rooms.length)return []
  const gap=3
  const size=(room:T)=>catalog.find(d=>d.id===room.templateId)??{width:18,depth:17}
  const rank=(room:T)=>{const n=catalog.findIndex(d=>d.id===room.templateId);return n<0?catalog.length:n}
  // Stable identities, rather than insertion order, determine each room's slot.
  const ordered=[...rooms].sort((a,b)=>Number(b.templateId==='connected-office')-Number(a.templateId==='connected-office')||rank(a)-rank(b)||a.id.localeCompare(b.id))
  const area=ordered.reduce((sum,room)=>sum+(size(room).width+gap)*(size(room).depth+gap),0)
  const averageDepth=ordered.reduce((sum,room)=>sum+size(room).depth+gap,0)/rooms.length
  const rowCount=Math.max(1,Math.min(rooms.length,Math.round(Math.sqrt(area)/averageDepth)))
  const center=(rowCount-1)/2,counts=Array.from({length:rowCount},()=>Math.floor(rooms.length/rowCount))
  const rowsByCenter=Array.from({length:rowCount},(_,i)=>i).sort((a,b)=>Math.abs(a-center)-Math.abs(b-center)||a-b)
  for(let n=0;n<rooms.length%rowCount;n++)counts[rowsByCenter[n]]++
  const slots=counts.flatMap((count,row)=>Array.from({length:count},(_,column)=>({row,column,distance:Math.hypot(row-center,column-(count-1)/2)})))
    .sort((a,b)=>a.distance-b.distance||a.row-b.row||a.column-b.column)
  const shelves:T[][]=Array.from({length:rowCount},()=>[])
  ordered.forEach((room,n)=>{const slot=slots[n];shelves[slot.row][slot.column]=room})
  const heights=shelves.map(row=>Math.max(...row.map(room=>size(room).depth)))
  const totalDepth=heights.reduce((a,b)=>a+b,0)+gap*(rowCount-1)
  const positions=new Map<string,{x:number;y:number}>()
  let y=-totalDepth/2
  shelves.forEach((row,n)=>{
    const width=row.reduce((sum,room)=>sum+size(room).width,0)+gap*(row.length-1)
    let x=-width/2
    for(const room of row){const d=size(room);positions.set(room.id,{x,y:y+(heights[n]-d.depth)/2});x+=d.width+gap}
    y+=heights[n]+gap
  })
  return rooms.map(room=>({...room,origin:positions.get(room.id)!}))
}
