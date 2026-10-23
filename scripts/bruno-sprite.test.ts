import test from 'node:test'
import assert from 'node:assert/strict'
import {brunoOfficeState,sampleBrunoSprite,walkFrames,walkAtlas} from '../src/characters/brunoSprite.ts'
import {brunoRoutine,brunoRoutineDuration} from '../src/characters/brunoRoutine.ts'
test('all four distinct walk frames stay inside the source atlas',()=>{
 assert.equal(walkFrames.length,4)
 for(const f of walkFrames)assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=walkAtlas.width&&f.y+f.h<=walkAtlas.height)
 assert.equal(new Set(Array.from({length:4},(_,i)=>sampleBrunoSprite(i*.17+.001,'walk').walkFrame)).size,4)
})
test('routine has continuous positions, fixed floor and purposeful destinations',()=>{
 let last=brunoOfficeState(0)
 for(let t=.01;t<brunoRoutineDuration*2;t+=.01){const s=brunoOfficeState(t);assert.ok(s.i>=1.59&&s.i<=4.06);assert.ok(s.j>=9.49&&s.j<=20.01);assert.ok(Math.hypot(s.i-last.i,s.j-last.j)<.06);last=s}
 assert.deepEqual(brunoOfficeState(0),brunoOfficeState(brunoRoutineDuration))
 assert.ok(brunoRoutine.some(b=>b.activity==='brew'));assert.ok(brunoRoutine.some(b=>b.activity==='read'));assert.ok(brunoRoutine.some(b=>b.activity==='return-book'))
})
test('coffee and book are carried on return trips, desk props change at contact',()=>{
 let start=0
 for(const beat of brunoRoutine){
  const before=brunoOfficeState(start+beat.duration*.2),after=brunoOfficeState(start+beat.duration*.8)
  if(beat.activity==='walk'&&beat.carry)assert.equal(before.carry,beat.carry)
  if(beat.activity==='pick-book'){assert.equal(before.bookOnShelf,true);assert.equal(after.bookOnShelf,false);assert.equal(after.carry,'book')}
  if(beat.activity==='place-book'){assert.equal(before.bookOnDesk,false);assert.equal(after.bookOnDesk,true)}
  if(beat.activity==='return-book'){assert.equal(before.bookOnShelf,false);assert.equal(after.bookOnShelf,true)}
  start+=beat.duration
 }
})
test('reduced motion keeps Bruno at his workstation',()=>{
 for(const t of [0,9,20,100])assert.deepEqual(brunoOfficeState(t,true),brunoOfficeState(0,true))
 assert.equal(brunoOfficeState(50,true).activity,'typing')
})

test('coworkers route around Bruno throughout a thirty-minute shift',async()=>{
 const {OfficePeople,isOfficeFloorFree}=await import('../src/procedural/OfficePeople.ts')
 const {officeDefinitions}=await import('../src/procedural/officeRooms.ts')
 const world=new OfficePeople(officeDefinitions),def=officeDefinitions[0]
 let min=Infinity
 for(let k=0;k<1800*30;k++){
  world.update(1/30);const b=brunoOfficeState(world.time)
  for(const a of world.actors.filter(a=>a.roomId===def.id&&a.index!==13)){
   const distance=Math.hypot(a.i-b.i,a.j-b.j);min=Math.min(min,distance)
   assert.ok(distance>.85,`${a.id} crossed Bruno at ${world.time}: ${distance}`)
   if(a.mode==='walk')assert.ok(isOfficeFloorFree(def,a),'coworker entered a blocked footprint')
  }
 }
 assert.ok(min>.85)
 assert.ok(!def.furniture.some(f=>f.id==='bruno-workstation'))
 assert.equal(def.stations[6].i,brunoOfficeState(0).i);assert.equal(def.stations[6].j,brunoOfficeState(0).j)
})

test('carry mesh moves the free hand and legs while keeping torso and holding arm fixed',async()=>{
 const {carryVertex}=await import('../src/characters/carryDeformation.ts')
 assert.deepEqual(carryVertex(.4,.4,.25),carryVertex(.4,.4,.75))
 assert.deepEqual(carryVertex(.5,.2,.25),carryVertex(.5,.2,.75))
 assert.ok(Math.abs(carryVertex(.9,.5,.25).x-carryVertex(.9,.5,.75).x)>.08)
 assert.ok(Math.abs(carryVertex(.7,.95,.25).x-carryVertex(.7,.95,.75).x)>.04)
})

 test('runtime artwork is opaque at interior pixels and preserves source color',async()=>{
 const {solidArtwork}=await import('../src/characters/artworkSurface.ts')
 const pixels=new Uint8ClampedArray([210,150,85,253,5,5,5,0]);solidArtwork(pixels)
 assert.equal(pixels[3],255);assert.equal(pixels[7],0);assert.ok(pixels[0]>=210);assert.ok(pixels[2]<85)
})

 test('direction follows floor travel and rise frames cover six connected stages',async()=>{
 const {travelView,riseFrame,walkingFrame}=await import('../src/characters/sceneMotion.ts')
 assert.deepEqual(travelView(1,0),{rear:false,mirror:1});assert.deepEqual(travelView(0,1),{rear:false,mirror:-1})
 assert.deepEqual(travelView(-1,0),{rear:true,mirror:-1});assert.deepEqual(travelView(0,-1),{rear:true,mirror:1})
 assert.equal(new Set(Array.from({length:101},(_,i)=>riseFrame(i/100))).size,6)
 assert.equal(walkingFrame(0,8),walkingFrame(1.05,8));assert.equal(new Set(Array.from({length:8},(_,i)=>walkingFrame(i*1.05/8+.001,8))).size,8)
})
 test('desk interactions happen seated and chair transitions preserve floor contact',()=>{
 let start=0
 for(const beat of brunoRoutine){
  if(['place-book','collect-book','place-cup'].includes(beat.activity)){
   for(const phase of [.05,.5,.95]){const s=brunoOfficeState(start+beat.duration*phase);assert.equal(s.mode,'work');assert.equal(s.i,4.05);assert.equal(s.j,16)}
  }
  if(beat.activity==='stand'){const first=brunoOfficeState(start+.01),last=brunoOfficeState(start+beat.duration-.01);assert.ok(first.rise<.01);assert.ok(last.rise>.99);assert.ok(last.i<first.i)}
  start+=beat.duration
 }
})

test('registered directional and rise crops stay inside their actual PNG sources',async()=>{
 const {readFile}=await import('node:fs/promises')
 const {motionSheets,gusSheet,rearSheet,brunoRise,teamRiseFrames}=await import('../src/characters/motionSheets.ts')
 const {registeredSheets}=await import('../src/characters/registeredSheets.ts')
 const {additionalSheets,rearWorkSheets,coffeeSheets}=await import('../src/characters/campusSheets.ts')
 const sheets=[...Object.values(additionalSheets),...Object.values(rearWorkSheets),...Object.values(coffeeSheets),...Object.values(registeredSheets),...Object.values(motionSheets),{url:gusSheet.url,frames:[...gusSheet.front,...gusSheet.back,...gusSheet.seated]},rearSheet,brunoRise,{url:motionSheets['team-rise'].url,frames:teamRiseFrames}]
 for(const sheet of sheets){
  const png=await readFile(new URL(`../public${sheet.url}`,import.meta.url)),w=png.readUInt32BE(16),h=png.readUInt32BE(20)
  for(const f of sheet.frames)assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=w&&f.y+f.h<=h,`${sheet.url}: crop exceeds ${w}x${h}`)
 }
})


test('book and cup sockets lie on the actual shared worktop, including the book corners',async()=>{
 const {brunoDeskSockets}=await import('../src/characters/brunoRoutine.ts')
 const {officeDefinitions}=await import('../src/procedural/officeRooms.ts')
 const top=officeDefinitions[0].furniture.find(f=>f.id===officeDefinitions[0].stations[6].furnitureId)!
 for(const [name,p] of Object.entries(brunoDeskSockets)){
  for(const [di,dj] of name==='book'?[[0,0],[.38,.27]]:[[0,0]])assert.ok(p.i+di>top.i&&p.i+di<top.i+top.w&&p.j+dj>top.j&&p.j+dj<top.j+top.d)
  assert.ok(p.z>=1.3&&p.z<1.55)
 }
})

test('registered seated and standing poses preserve scale without giant transition bodies',async()=>{
 const {registeredSheets}=await import('../src/characters/registeredSheets.ts')
 for(const [id,s] of Object.entries(registeredSheets)){
  const seated=s.frames[0].h*s.pixelScale,standing=s.frames[6].h*s.pixelScale
  assert.ok(seated>standing*.7&&seated<standing,id+' has invalid seated proportions')
  for(const f of s.frames.slice(2,7))assert.ok(f.h*s.pixelScale<=standing*1.06,id+' grows while rising')
 }
})
