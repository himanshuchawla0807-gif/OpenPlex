/** Shared, deterministic campus spacing for the catalog and saved projects. */
export function arrangeFootprints<T extends {id:string;templateId:string;origin:{x:number;y:number}}>(rooms:T[],catalog:ReadonlyArray<{id:string;width:number;depth:number}>):T[]{
  if(!rooms.length)return []
  const gap=3
  const size=(room:T)=>catalog.find(d=>d.id===room.templateId)??{width:18,depth:17}
  const anchor=rooms.find(room=>room.templateId==='connected-office')??rooms[0]
  const main=size(anchor),positions=new Map<string,{x:number;y:number}>()
  positions.set(anchor.id,{x:-main.width/2,y:-main.depth/2})
  let halfWidth=main.width/2,halfDepth=main.depth/2
  const departments=rooms.filter(room=>room!==anchor).sort((a,b)=>catalog.findIndex(d=>d.id===a.templateId)-catalog.findIndex(d=>d.id===b.templateId)||a.id.localeCompare(b.id))
  // Center opposing rows and columns around the main office. Up to three rooms
  // per side keeps each shell compact; larger campuses get another outer shell.
  for(let start=0;start<departments.length;start+=12){
    const sides:T[][]=[[],[],[],[]] // north, south, east, west
    const batch=departments.slice(start,start+12),wing=Math.floor(batch.length/4)
    sides[2]=batch.slice(0,wing);sides[3]=batch.slice(wing,wing*2)
    const rows=batch.slice(wing*2),north=Math.ceil(rows.length/2)
    sides[0]=rows.slice(0,north);sides[1]=rows.slice(north)
    const columnDepth=(side:T[])=>side.reduce((sum,r)=>sum+size(r).depth,0)+Math.max(0,side.length-1)*gap
    const bandDepth=Math.max(halfDepth*2,columnDepth(sides[2]),columnDepth(sides[3]))
    sides.forEach((side,index)=>{
      if(index<2){
        const width=side.reduce((sum,r)=>sum+size(r).width,0)+(side.length-1)*gap
        let x=-width/2
        for(const room of side){const d=size(room);positions.set(room.id,{x,y:index===0?-bandDepth/2-gap-d.depth:bandDepth/2+gap});x+=d.width+gap}
      }else{
        let y=-columnDepth(side)/2
        for(const room of side){const d=size(room);positions.set(room.id,{x:index===2?halfWidth+gap:-halfWidth-gap-d.width,y});y+=d.depth+gap}
      }
    })
    for(const room of departments.slice(start,start+12)){
      const p=positions.get(room.id)!,d=size(room)
      halfWidth=Math.max(halfWidth,Math.abs(p.x),Math.abs(p.x+d.width))
      halfDepth=Math.max(halfDepth,Math.abs(p.y),Math.abs(p.y+d.depth))
    }
  }
  return rooms.map(room=>({...room,origin:positions.get(room.id)!}))
}
