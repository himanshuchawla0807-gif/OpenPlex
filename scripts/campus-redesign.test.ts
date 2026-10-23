import test from 'node:test'
import {solidArtwork,isolateArtwork} from '../src/characters/artworkSurface.ts'
import {uniqueCastSheets} from '../src/characters/uniqueCastSheets.ts'
import {uniqueCastProfiles} from '../src/data/uniqueCastProfiles.ts'

test('32 independent identities use eight registered high-detail poses and individually registered source images',()=>{
 const ids=Object.keys(uniqueCastSheets)
 if(ids.length!==32)throw Error('Expected 32 new illustrated identities')
 const sources=new Set<string>()
 for(const id of ids){
  const sheet=uniqueCastSheets[id]
  if(sheet.frames.length!==8||uniqueCastProfiles[id].image!==sheet.url)throw Error('Incomplete identity '+id)
  const urls=new Set(sheet.frames.map(f=>f.url))
  if(urls.size<3||urls.size>4)throw Error('Crowded or shared source sheet '+id)
  for(const url of urls){if(sources.has(url))throw Error('Repeated character source '+url);sources.add(url)}
  for(const f of sheet.frames)if(f.h<550||f.pixelScale<=0||f.anchorX<0||f.anchorX>f.w)throw Error('Invalid high-detail frame '+id)
  if(sheet.frames[5].url===sheet.frames[6].url&&sheet.frames[5].x===sheet.frames[6].x&&sheet.frames[5].y===sheet.frames[6].y)throw Error('Rear work view must have its own drawing '+id)
 }
})
import assert from 'node:assert/strict'
test('sprite surfaces stay opaque and discard disconnected atlas neighbors',()=>{
 const width=8,height=6,pixels=new Uint8ClampedArray(width*height*4)
 for(const p of [9,10,17,18,25,26,38])pixels.set([120,70,50,253],p*4)
 solidArtwork(pixels,1);isolateArtwork(pixels,width,height)
 for(const p of [9,10,17,18,25,26])assert.equal(pixels[p*4+3],255)
 assert.equal(pixels[38*4+3],0);assert.equal(pixels[0],0)
})
import {officeDefinitions} from '../src/procedural/officeRooms.ts'
import {campusCast,catalogOrder} from '../src/data/campusCast.ts'
import {OfficePeople,isOfficeFloorFree,walkingDuration,employeeAllocation,type Position} from '../src/procedural/OfficePeople.ts'
test('curated selection leads with Oscar, Gus, Felix and Jasper without changing saved indices',()=>{
 assert.deepEqual(catalogOrder.slice(0,4).map(i=>campusCast[i].id),['oscar','gus','felix','jasper'])
 assert.equal(new Set(catalogOrder).size,campusCast.length)
 assert.equal(campusCast[0].id,'oscar');assert.equal(campusCast[11].id,'gus')
})
test('refined walkers include passing poses and stable body scale in both office directions',()=>{
 for(const id of ['felix','jasper','theo','arthur'])for(const frames of [uniqueCastSheets[id].walkFront,uniqueCastSheets[id].walkRear]){
  assert.equal(frames?.length,4)
  const heights=frames!.map(f=>f.h*f.pixelScale)
  assert.ok(Math.max(...heights)-Math.min(...heights)<9,`${id} changes body height excessively during a stride`)
  assert.equal(new Set(frames!.map(f=>`${f.url}:${f.x}:${f.y}`)).size,4)
 }
})
import {brunoRoutine,sampleBrunoRoutine,brunoRoutineDuration} from '../src/characters/brunoRoutine.ts'

interface RecordedRoute {name:string;destination:string;kind:string;target:Position;points:Position[];outward:number;length:number;hold:number;duration:number}
/** Diagnostic read of the actual planner output; no synthetic path stands in for it. */
function planner(w:OfficePeople){return w as unknown as {routes:Map<string,RecordedRoute[]>;slots:Map<string,number>}}
const separation=(a:Position,b:Position)=>Math.hypot(a.i-b.i,a.j-b.j)

test('expanded business campus preserves forty unique preset employees and leaves added seats empty',()=>{
 const w=new OfficePeople(officeDefinitions)
 assert.equal(officeDefinitions.length,12);assert.equal(w.actors.length,40)
 assert.equal(new Set(campusCast.map(c=>c.id)).size,40)
 assert.equal(new Set(campusCast.map(c=>c.name)).size,40)
 assert.equal(new Set(w.actors.map(a=>a.id)).size,40)
 assert.equal(new Set(campusCast.map(c=>c.baseId)).size,8)
 for(const [roomIndex,def] of officeDefinitions.entries()){
  const cast=w.actors.filter(a=>a.roomId===def.id).map(a=>campusCast[a.index])
  assert.equal(cast.length,employeeAllocation[roomIndex]?.length??0)
  if(!cast.length)continue
  assert.ok(new Set(cast.map(c=>c.baseId)).size>=2,def.id+' repeats a single silhouette')
  assert.ok(new Set(cast.map(c=>c.outfit)).size>=2,def.id+' repeats one outfit')
 }
})

test('two uninterrupted single-sided four-person rows are separated by a walkable lengthwise aisle',()=>{
 const main=officeDefinitions[0],rows=main.furniture.filter(f=>f.kind==='bench').sort((a,b)=>a.i-b.i)
 assert.equal(rows.length,2)
 for(const row of rows){
  const seats=main.stations.filter(s=>s.furnitureId===row.id)
  assert.equal(row.singleSided,true);assert.equal(seats.length,4)
  assert.ok(row.d>row.w*5);assert.equal(new Set(seats.map(s=>s.i)).size,1)
  assert.ok(seats.every(s=>s.facing===(row.reverse?-1:1)&&Boolean(s.reverse)===Boolean(row.reverse)))
  assert.equal(row.j,3);assert.equal(row.d,14.4)
 }
 const center=(rows[0].i+rows[0].w+rows[1].i-.45)/2
 for(let j=3;j<17.5;j+=.1)assert.ok(isOfficeFloorFree(main,{i:center,j}),`Lengthwise aisle blocked at ${j}`)
 assert.equal(main.stations.filter(s=>s.furnitureId==='main-meeting-table').length,4)
})

test('all planned coffee, reference and review trips stop beside real objects and return to exact seat exits',()=>{
 const w=new OfficePeople(officeDefinitions),{routes,slots}=planner(w)
 for(const a of w.actors){
  const def=officeDefinitions.find(d=>d.id===a.roomId)!,choices=routes.get(a.id)!
  assert.ok(choices.length>=3,a.id+' lacks purposeful task choices')
  assert.deepEqual(new Set(choices.map(r=>r.kind)),new Set(['coffee','reference','review']))
  for(const route of choices){
   assert.ok(route.hold>=8&&route.hold<=15,a.id+' has unbounded task dwell')
   assert.ok(route.duration<180,a.id+' takes an excessive office tour')
   assert.equal(separation(route.points[0],a.exit!),0,a.id+' teleports on departure')
   assert.equal(separation(route.points.at(-1)!,a.exit!),0,a.id+' misses its return anchor')
   const f=def.furniture.find(f=>f.id===route.destination)!
   assert.ok(f,a.id+' task object is missing')
   const dx=Math.max(f.i-route.target.i,0,route.target.i-f.i-f.w),dy=Math.max(f.j-route.target.j,0,route.target.j-f.j-f.d)
   assert.ok(Math.hypot(dx,dy)<1,a.id+' cannot reach its task object')
   for(let n=1;n<route.points.length;n++)for(let k=0;k<=8;k++){
    const u=k/8,p={i:route.points[n-1].i+(route.points[n].i-route.points[n-1].i)*u,j:route.points[n-1].j+(route.points[n].j-route.points[n-1].j)*u}
    assert.ok(isOfficeFloorFree(def,p),a.id+' crosses furniture while '+route.name)
    for(const other of def.stations.filter(s=>s.id!==a.station.id))assert.ok(separation(p,other)>.5,a.id+' crosses another seated employee')
   }
  }
  if(a.index===13)continue // Bruno has his own authored, independently tested routine.
  const local=def.stations.indexOf(a.station),slot=slots.get(def.id)!,cycle=slot*def.stations.length,work=20+(officeDefinitions.indexOf(def)*7)%17
  for(let trip=0;trip<choices.length;trip++){
   const route=choices[(trip+local)%choices.length],start=trip*cycle+local*slot+work+1.2
   w.time=start+walkingDuration(route.outward)+route.hold/2;w.update(0)
   assert.equal(a.activity,'task',a.id+' never performs '+route.name);assert.equal(a.destination,route.destination)
   assert.ok(separation(a,route.target)<.01,a.id+' stops away from its task socket')
   w.time=start+route.duration+1.3;w.update(0)
   assert.equal(a.mode,'work',a.id+' does not return to work');assert.equal(separation(a,a.station),0)
  }
 }
 assert.ok(brunoRoutine.some(b=>b.activity==='brew'));assert.ok(brunoRoutine.some(b=>b.activity==='pick-book'))
 const last=sampleBrunoRoutine(brunoRoutineDuration-.05);assert.equal(last.activity,'typing');assert.equal(last.mode,'work')
})


test('main office has twelve seats, CEO one, and departments eight clear floor anchors',()=>{
 for(const [n,def] of officeDefinitions.entries()){
  assert.equal(def.stations.length,n===0?12:def.id==='ceo-office'?1:8,def.name)
  for(const station of def.stations){
   assert.ok(isOfficeFloorFree(def,station),def.name+' seat is inside furniture')
   assert.ok(station.i>1&&station.i<def.width-1&&station.j>1&&station.j<def.depth-1)
  }
  for(const other of officeDefinitions.slice(n+1)){
   const gapX=Math.max(other.origin.x-def.origin.x-def.width,def.origin.x-other.origin.x-other.width)
   const gapY=Math.max(other.origin.y-def.origin.y-def.depth,def.origin.y-other.origin.y-other.depth)
   assert.ok(gapX>=3||gapY>=3,def.name+' overlaps '+other.name)
  }
 }
 assert.ok(officeDefinitions.find(d=>d.id==='operations-hub')!.furniture.filter(f=>f.kind==='server').length>=2)
 assert.equal(officeDefinitions.find(d=>d.id==='strategy-room')!.stations.length,8)
})

test('every department and CEO seat can reach coffee, references and review furniture',()=>{
 const departments=officeDefinitions.slice(1)
 const staff=Object.fromEntries(departments.map(d=>[d.id,Array.from({length:d.stations.length},(_,n)=>n)]))
 const world=new OfficePeople(departments,staff),{routes}=planner(world)
 assert.equal(world.actors.length,departments.reduce((sum,d)=>sum+d.stations.length,0))
 for(const actor of world.actors){
  const def=departments.find(d=>d.id===actor.roomId)!,choices=routes.get(actor.id)!
  assert.deepEqual(new Set(choices.map(r=>r.kind)),new Set(['coffee','reference','review']),actor.id)
  for(const route of choices){
   assert.ok(route.duration<180,actor.id+' route is too long')
   assert.equal(separation(route.points[0],actor.exit!),0)
   assert.equal(separation(route.points.at(-1)!,actor.exit!),0)
   for(let n=1;n<route.points.length;n++)for(let k=0;k<=8;k++){
    const u=k/8,from=route.points[n-1],to=route.points[n]
    assert.ok(isOfficeFloorFree(def,{i:from.i+(to.i-from.i)*u,j:from.j+(to.j-from.j)*u}),actor.id+' crosses furniture')
   }
  }
 }
})

import {keyboardContact} from '../src/characters/seatedContacts.ts'
import {seatedSheets} from '../src/characters/seatedSheets.ts'
import {chairSheets} from '../src/characters/chairSheets.ts'
test('coherent occupied chair artwork covers featured characters and Arthur without resizing between typing frames',()=>{
 assert.deepEqual(new Set(Object.keys(chairSheets)),new Set([...catalogOrder.slice(0,12).map(i=>campusCast[i].id),'arthur']))
 for(const [id,s] of Object.entries(chairSheets)){
  assert.equal(s.frames.length,4,id)
  for(const k of [0,2]){
   const [a,b]=s.frames.slice(k,k+2)
   assert.equal(a.pixelScale,b.pixelScale)
   for(const f of [a,b]){assert.ok(f.w>350&&f.h>500,id+' lost image detail');assert.ok(Number.isFinite(f.anchorX)&&Number.isFinite(f.anchorY));assert.equal(f.mirror,1)}
  }
 }
})
test('new seated atlases cover the leading twelve identities with registered typing pairs in both directions',()=>{
 assert.deepEqual(Object.keys(seatedSheets),catalogOrder.slice(0,12).map(i=>campusCast[i].id))
 for(const [id,sheet] of Object.entries(seatedSheets)){
  assert.equal(sheet.frames.length,4,id)
  for(const n of [0,2]){
   const [a,b]=sheet.frames.slice(n,n+2)
   assert.equal(a.pixelScale,b.pixelScale,`${id} changes scale during typing`)
   assert.equal(a.mirror,b.mirror)
   for(const f of [a,b]){assert.ok(f.w>300&&f.h>400);assert.ok(f.anchorX>=0&&f.anchorX<=f.w);assert.ok(Number.isFinite(f.anchorY)&&f.anchorY>0)}
  }
 }
})
test('opposing keyboard contacts mirror at desk height and are independent of room position',()=>{
 const front=keyboardContact({i:4,j:5,reverse:false}),back=keyboardContact({i:4,j:5,reverse:true})
 assert.ok(front.x>0&&back.x<0);assert.ok(front.y< -30&&back.y< -50)
 const origin=keyboardContact({i:0,j:0,reverse:false})
 assert.ok(Math.abs(origin.x-front.x)<1e-10&&Math.abs(origin.y-front.y)<1e-10)
})


test('department equipment reflects content, campaigns and executive coordination',()=>{
 for(const [id,kind] of [['team-lounge','contentrig'],['marketing-studio','campaignboard'],['learning-room','planningboard'],['ceo-office','planningboard']]) {
  assert.ok(officeDefinitions.find(d=>d.id===id)!.furniture.some(f=>f.kind===kind),id)
 }
})
