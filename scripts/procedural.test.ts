import {illustrationContour} from '../src/procedural/illustrationGeometry.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {officeDefinitions} from '../src/procedural/officeRooms.ts'
import {OfficePeople,isOfficeFloorFree,findOfficePath,walkingDistance,walkingDuration} from '../src/procedural/OfficePeople.ts'
import {createCharacterDocument,CHARACTER_COUNT,CHARACTER_DURATION,CHARACTER_ROWS,selectCharacterModes,characterStyles,characterWardrobe,type CharacterMode} from '../src/procedural/characters.ts'
import {solveTwoBone,typingHandTarget} from '../src/procedural/characterKinematics.ts'
import {checkCoverage} from '@clayzo/webgl-player'

test('Clayzo vector rigs validate, have supported playback coverage and close all joint loops',async()=>{
  const doc=createCharacterDocument()
  assert.deepEqual(await checkCoverage(doc),{supported:true,reasons:[]})
  assert.equal(doc.timing.frameRate.numerator,60)
  assert.deepEqual(doc.assets,{})
  assert.equal(doc.compositions.main.rootNodeIds.length,CHARACTER_COUNT*CHARACTER_ROWS)
  const seatedBody=doc.compositions.main.nodes['anika-1-body'].transform.position
  assert.equal(seatedBody.kind,'constant')
  if(seatedBody.kind==='constant')assert.ok(Math.abs((118-seatedBody.value.y)*.9-.85*40)<1,'Seated hip must land on its chair cushion')
  for(const node of Object.values(doc.compositions.main.nodes)) {
    assert.ok(['rect','ellipse','path','group'].includes(node.type))
    const track=node.transform.rotation
    if(track.kind==='keyframed') {
      assert.equal(track.keyframes[0].tick,0)
      assert.equal(track.keyframes.at(-1)!.tick,CHARACTER_DURATION)
      assert.deepEqual(track.keyframes[0].value,track.keyframes.at(-1)!.value,node.id+' has a loop seam')
    }
  }
})

test('walking starts and stops with zero velocity and reaches the exact destination',()=>{
  const length=20,duration=walkingDuration(length),step=.001
  assert.equal(walkingDistance(length,0),0)
  assert.equal(walkingDistance(length,duration),length)
  assert.ok(walkingDistance(length,step)/step<.001)
  assert.ok((length-walkingDistance(length,duration-step))/step<.001)
  let previous=0
  for(let t=0;t<=duration;t+=1/120){const next=walkingDistance(length,t);assert.ok(next>=previous);assert.ok((next-previous)/(1/120)<=.70001);previous=next}
})

test('forty employees with purposeful routines keep their floor anchors outside the editable furniture',()=>{
  const world=new OfficePeople(officeDefinitions),walked=new Set<string>()
  for(let frame=0;frame<1800*60;frame++) {
    world.update(1/60)
    for(const actor of world.actors)if(actor.mode==='walk') {
      const def=officeDefinitions.find(d=>d.id===actor.roomId)!
      assert.ok(isOfficeFloorFree(def,actor),actor.id+' walked through furniture')
      walked.add(actor.id)
      for(const other of world.actors)if(other.id!==actor.id&&other.roomId===actor.roomId) {
        assert.ok(Math.hypot(actor.i-other.i,actor.j-other.j)>.5,actor.id+' walked through '+other.id)
        assert.notEqual(other.mode,'walk','Only one employee should roam per room at once')
      }
    }
  }
  assert.equal(world.actors.length,40)
  assert.equal(walked.size,39) // Bruno replaces one simulation actor and follows his own tested routine.
  assert.equal(world.actors.find(a=>a.index===13)!.mode,'work')
  assert.ok(world.actors.every(a=>a.station.surface==='desk'),'Each employee has an assigned workstation')
})

test('walking speed and positions are independent of display refresh rate, and reduced motion holds',()=>{
  const a=new OfficePeople(officeDefinitions),b=new OfficePeople(officeDefinitions)
  for(let n=0;n<50*30;n++)a.update(1/30)
  for(let n=0;n<50*120;n++)b.update(1/120)
  a.actors.forEach((actor,k)=>{
    assert.ok(Math.hypot(actor.i-b.actors[k].i,actor.j-b.actors[k].j)<1e-8)
    assert.equal(actor.mode,b.actors[k].mode)
  })
  const held=JSON.stringify(a.actors)
  a.update(.05,true)
  assert.equal(JSON.stringify(a.actors),held)
})

test('routes preserve exact chair anchors and avoid diagonal cuts across table corners',()=>{
  for(const def of officeDefinitions)for(const station of def.stations.filter(s=>s.surface==='desk')) {
    const path=findOfficePath(def,station,def.walkPath[0])
    assert.ok(path.length>1,def.id+' has no exit path')
    assert.deepEqual(path[0],station)
    for(let n=1;n<path.length;n++)for(let k=0;k<=4;k++) {
      const u=k/4,p={i:path[n-1].i+(path[n].i-path[n-1].i)*u,j:path[n-1].j+(path[n].j-path[n-1].j)*u}
      assert.ok(isOfficeFloorFree(def,p),def.id+' route cuts through an obstacle')
    }
  }
})


test('active pose documents prune hidden rigs while retaining valid detailed geometry',async()=>{
  const full=createCharacterDocument(),modes:CharacterMode[]=Array(CHARACTER_COUNT).fill('work');modes[4]='walk';modes[9]='idle'
  const active=selectCharacterModes(full,modes)
  assert.equal(active.compositions.main.rootNodeIds.length,CHARACTER_COUNT)
  assert.ok(Object.keys(active.compositions.main.nodes).length<Object.keys(full.compositions.main.nodes).length*.4)
  assert.deepEqual(await checkCoverage(active),{supported:true,reasons:[]})
  assert.ok(active.compositions.main.nodes['leah-0-cell'])
  assert.ok(!active.compositions.main.nodes['leah-1-cell'])
  assert.ok(full.compositions.main.nodes['leah-1-cell'],'The gallery must remain complete')
  for(const root of active.compositions.main.rootNodeIds)assert.ok(active.compositions.main.nodes[root])
  const culled=selectCharacterModes(full,modes.map((mode,k)=>k<8?mode:null))
  assert.equal(culled.compositions.main.rootNodeIds.length,8)
  assert.ok(!culled.compositions.main.nodes['sam-1-cell'])
})


test('expanded campus has a mega office and populated departments with unique stations',()=>{
  assert.deepEqual(officeDefinitions.map(d=>d.stations.length),[12,...Array(10).fill(8),1])
  assert.ok(officeDefinitions[0].width*officeDefinitions[0].depth>=590)
  for(const def of officeDefinitions){
    assert.ok(def.furniture.length>=(def.id==='ceo-office'?8:14))
    assert.equal(new Set(def.stations.map(s=>s.id)).size,def.stations.length)
    for(const station of def.stations.filter(s=>s.surface==='desk'))assert.ok(isOfficeFloorFree(def,station))
  }
})

test('shared desks pair occupied seats on opposite edges with their own keyboard direction',()=>{
  const main=officeDefinitions[0]
  const pods=main.furniture.filter(f=>f.kind==='bench').sort((a,b)=>a.i-b.i)
  assert.equal(pods.length,2)
  assert.ok(pods[1].i-(pods[0].i+pods[0].w)>=3,'Keep a broad aisle between joined rows')
  assert.ok(pods.every(p=>p.d===14.4),'Each row joins four adjacent workstations along one top')
  assert.equal(main.furniture.filter(f=>f.kind==='desk').length,0,'No isolated extra desks')
  assert.equal(main.stations.length,12)
  for(const def of officeDefinitions)for(const desk of def.furniture.filter(f=>f.kind==='bench')) {
    const seats=def.stations.filter(s=>s.furnitureId===desk.id)
    if(desk.singleSided){assert.equal(seats.length,4);assert.ok(seats.every(s=>Boolean(s.reverse)===Boolean(desk.reverse)&&s.facing===(desk.reverse?-1:1)));continue}
    assert.equal(seats.length,Math.round(desk.d/2.7)*2)
    for(const near of seats.filter(s=>!s.reverse)) {
      const far=seats.find(s=>s.reverse&&s.j===near.j)!
      assert.ok(far,'Every shared station needs a facing coworker')
      assert.equal(near.i,desk.i-.45);assert.equal(far.i,desk.i+desk.w+.45)
      assert.equal(near.facing,1);assert.equal(far.facing,-1)
      assert.ok(isOfficeFloorFree(def,near));assert.ok(isOfficeFloorFree(def,far))
    }
  }
})



test('authored keyboard joints reach the actual desk plane without crossed elbows',()=>{
  for(let employee=0;employee<CHARACTER_COUNT;employee++)for(const near of [false,true])for(const reverse of [false,true])for(let tick=0;tick<=960;tick+=4){
    const shoulder={x:near?9:-5,y:-23},target=typingHandTarget(near,tick,employee*.63)
    if(reverse)target.y-=28
    const solution=solveTwoBone(shoulder,target,17,18)
    assert.ok(Math.hypot(solution.wrist.x-target.x,solution.wrist.y-target.y)<1e-9)
    assert.ok(solution.elbow.y>solution.wrist.y)
    const upper=solution.upperDegrees*Math.PI/180,fore=(solution.upperDegrees+solution.lowerDegrees)*Math.PI/180
    const wrist={x:shoulder.x-Math.sin(upper)*17-Math.sin(fore)*18,y:shoulder.y+Math.cos(upper)*17+Math.cos(fore)*18}
    assert.ok(Math.hypot(wrist.x-target.x,wrist.y-target.y)<1e-9)
    // Inverse isometric projection of the palm at desk height1.35. The
    // source wrist is relative to seated hip80 / foot118 and composited at.9.
    const x=target.x*.9*(reverse?-1:1),y=(target.y-38)*.9,z=1.35
    const di=(x/40+(y+z*40)/20)/2,dj=((y+z*40)/20-x/40)/2
    assert.ok(reverse?di>=-.79&&di<=-.45:di>=.45&&di<=.79,'Both opposing poses must reach their own physical keyboard depth')
    assert.ok(dj>=-.35&&dj<=.6,'Hand must be over the physical keyboard width')
  }
})


test('tile cache releases backing stores and stays within its memory budget',async()=>{
  const {CanvasTileCache}=await import('../src/procedural/CanvasTileCache.ts')
  const cache=new CanvasTileCache(4*16*16*2)
  const tile=()=>({canvas:{width:16,height:16} as HTMLCanvasElement,x:0,y:0,w:16,h:16})
  const a=tile(),b=tile(),c=tile()
  cache.set('a',a);cache.set('b',b);cache.get('a');cache.set('c',c)
  assert.equal(b.canvas.width,0,'Eviction must free the native backing store')
  assert.ok(cache.get('a'));assert.equal(cache.get('b'),undefined)
  assert.ok(cache.bytes<=cache.budget)
  cache.clear();assert.equal(cache.bytes,0);assert.equal(a.canvas.width,0);assert.equal(c.canvas.width,0)
})

test('compact playback packs visible poses into one row without changing gallery anchors',async()=>{
  const full=createCharacterDocument(),modes:(CharacterMode|null)[]=Array(CHARACTER_COUNT).fill(null)
  modes[0]='work';modes[2]='work-reverse';modes[5]='walk'
  const compact=selectCharacterModes(full,modes,true)
  assert.equal(compact.canvas.width,3*128);assert.equal(compact.canvas.height,128)
  const composition=compact.compositions.main
  composition.rootNodeIds.forEach((id,column)=>{
    assert.deepEqual(composition.nodes[id].transform.position,{kind:'constant',value:{x:column*128,y:0,z:0}})
  })
  const original=full.compositions.main.nodes['riya-3-cell'].transform.position
  assert.deepEqual(original,{kind:'constant',value:{x:2*128,y:3*128,z:0}})
  assert.deepEqual(await checkCoverage(compact),{supported:true,reasons:[]})
})


test('wardrobe contains 25 named, distinct outfits with authored garment construction',()=>{
  assert.equal(CHARACTER_COUNT,25)
  assert.equal(characterStyles.length,25);assert.equal(characterWardrobe.length,25)
  assert.equal(new Set(characterStyles.map(s=>s.id)).size,25)
  assert.equal(new Set(characterWardrobe).size,25)
  const nodes=createCharacterDocument().compositions.main.nodes
  for(const [person,detail] of [['florence','waistcoat-left'],['felix','kangaroo-pocket'],['alice','cable-knit'],['theo','camp-collar-left']]){
    assert.ok(nodes[`${person}-2-${detail}`],`${person} needs their own authored clothing`)
  }
})


test('portrait contours preserve a smooth circular silhouette at close inspection',()=>{
  const contour=illustrationContour([[1,0],[0,1],[-1,0],[0,-1]],.2761423749,.0005)
  assert.ok(contour.length>32&&contour.length<256)
  for(const point of contour)assert.ok(Math.abs(Math.hypot(point.x,point.y)-1)<.001)
  assert.deepEqual(contour[0],{x:1,y:0})
})

test('Anika carries the reference accessories without putting a tablet on her typing hand',()=>{
  const doc=createCharacterDocument(),nodes=doc.compositions.main.nodes
  for(const mode of [0,1,2,3]){
    for(const detail of ['leather-bag','lanyard','badge-card','satin-lapel-left'])assert.ok(nodes[`anika-${mode}-${detail}`])
    assert.equal(Boolean(nodes[`anika-${mode}-neararm-tablet`]),mode===0||mode===2)
  }
})
