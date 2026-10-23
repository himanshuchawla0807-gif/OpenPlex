import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync,existsSync } from 'node:fs'
import { LivingWorld } from '../src/living/LivingWorld.ts'
import { livingRooms } from '../src/living/roomActivities.ts'
import { findRoute, distance } from '../src/living/routes.ts'
import { activityChoices, ACTIVITY_COOLDOWN, walkingProgress } from '../src/living/scheduling.ts'

function seeded(seed:number) { return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296} }

test('archived plates, character art, repair assets, camera and visual styles retain their approved SHA256',
  {skip:!existsSync('public/assets/rooms/technology-office.png')},()=>{
  const files:Record<string,string>={
    'public/assets/rooms/technology-office.png':'4498B90DAA5A5F396B3C62755ADB445406E8C7842A0855571B9AA2D9E299AC02',
    'public/assets/living/office-characters.png':'421762E297BC4363D493B45446519C97C647014E8A8DD569C7682B8723C5F807',
    'public/assets/rooms/illustrated-workshop-refined.png':'A82F8510EFEB58BCD6B39E5ED98EA4BE7B903E2227C550777488B14B12C4D9D1',
    'public/assets/rooms/botanists-conservatory.png':'6F47F2CAA7CF10EA6F14A2E5788710E7C90CB6D49041113446A0B79DFDB00EEE',
    'public/assets/rooms/printmakers-atelier.png':'E484084E0A8442EF4251AAC6FB268AEBA51C9DDE21270435608B30E879E43D03',
    'src/camera/Camera.ts':'9B5EDADE3DDD64667BD92E6A34D1684331DBC3BF00CA77EAB0468BCF55A77DF1',
    'public/assets/living/atelier-characters.png':'015895C75A3BA8F87B23DAE889EA196E8275950CC2F452C801452E9B969E6D7A',
    'public/assets/living/conservatory-characters.png':'B82417D525782A0C71F577DB2B036FC30A36CB6AA93E8DD5B78A5CBCF2F29B5F',
    'public/assets/living/workshop-characters.png':'9EBF7BC991E81B1B92870522EE52D4CFD4C5DF2F7C602938C953BFE32D7C2DCF',
    'public/assets/living/gardener-repair-source.png':'FC7D7341CEAE5157073BFD49F5C5B349D5A8BBD330669763830F9B23E168CCB4',
    'public/assets/living/printmaker-repair-source.png':'9EC7E6EBD4E6C4DF78E064C5D88B30DA31E794DD2FB44CC4C808687B8A5CD802',
    'src/index.css':'21A58F4907C974AC4D416928DD2D68529394CD886567B8864467A102049FD162',
    'src/living/LivingWorld.ts':'39173E5009A6B20CDB65A22054FCA130A1A203082EB01CF3E92DD7B91FAA4436',
    'src/living/AmbientSchedule.ts':'218DC037C6DF65434DEBC37AD7837C6DF2056245D671BE0CC610CAD5940A030D',
    'src/living/scheduling.ts':'B6E0589A9DE12E97A289F5C588395BAA4DBA5301D3AE4A11F9AF91A0524DA068',
  }
  for(const [path,hash]of Object.entries(files))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase(),hash,path)
  // The active composition was replaced by request; the archived layout must remain intact.
  const worldSource=readFileSync('src/world/roomData.ts','utf8')
    .replace(/export const rooms: Room\[\] = \[\{[\s\S]*?export const archivedRooms/, 'export const rooms')
    .replace("name: 'The technology office'","name: 'The quiet workshop'")
  assert.equal(createHash('sha256').update(worldSource).digest('hex').toUpperCase(),'9061EF55E709E0189B25C892F8E56F76581722F805270322081D5E0512BD82B7','Only workshop display name may change; layout is locked')
  for(const [id,hash]of Object.entries({
    'botanists-conservatory':'eadb95415753aa8f57c2e31403be4692d8cf7ea186f59817cc32fe9ed440107f',
    'printmakers-atelier':'43de322c02457bf21a61400412737c736a891355947bbb666d7b40425742d2bd',
  }))assert.equal(createHash('sha256').update(JSON.stringify(livingRooms.find(r=>r.roomId===id))).digest('hex'),hash,'Neighbour room behavior, layers, and characters unchanged')
})

test('exactly one man and woman per approved room; all authored routes connected',()=>{
  assert.equal(livingRooms.length,3)
  for(const room of livingRooms){
    assert.deepEqual(room.characters.map(c=>c.gender).sort(),['man','woman'])
    assert.ok(room.ambient.length>=4&&room.ambient.length<=(room.roomId==='illustrated-workshop'?7:5))
    for(const from of room.points)for(const to of room.points){
      const path=findRoute(room,from.id,to.id)
      assert.deepEqual(path[0],from.foot);assert.deepEqual(path.at(-1),to.foot)
    }
  }
})

test('one-hour seeded sessions: long dwell, independent travel, rare varied conversations and finite positions',()=>{
  let overlappingTravel = false
  for(const seed of [9,18,27]){
    const world=new LivingWorld(livingRooms,seeded(seed))
    assert.ok(new Set(world.characters.map(a=>a.dwellUntil)).size===6)
    for(let step=0;step<36000;step++){
      const previous=world.characters.map(a=>({...a.foot}))
      world.update(0.1)
      for(const room of livingRooms){
        const pair=world.characters.filter(a=>a.roomId===room.roomId)
        if(pair.every(a=>a.journey))overlappingTravel=true
        if(pair.every(a=>a.journey))assert.notEqual(pair[0].journey!.destination,pair[1].journey!.destination,'Reserve destinations')
        assert.ok(world.ambient.get(room.roomId)!.filter(e=>e.active).length<=2,'No ambient chorus')
      }
      world.characters.forEach((actor,i)=>{
        assert.ok(Number.isFinite(actor.foot.x)&&Number.isFinite(actor.foot.y))
        assert.ok(distance(previous[i],actor.foot)<8,'Calm speed, no teleports')
        if(step<600)assert.equal(actor.trips,0,'First full minute stays at the workstation')
      })
    }
    for(const actor of world.characters){
      assert.ok(actor.walkingSeconds/world.time<0.2,'At least 80% of time stationary')
      assert.ok(actor.trips>3&&actor.trips<60)
      assert.ok(actor.talks>0,'Rare conversations occur')
      assert.ok(actor.talks<=6,'Not a conversation loop')
    }
    for(const memory of world.conversationMemory.values())assert.equal(new Set(memory.recentLocations).size,memory.recentLocations.length,'Recent meeting sites must differ')
  }
  assert.ok(overlappingTravel,'Independent lives may overlap: no imposed turn taking')
})

test('activity memory explicitly blocks quick A-B-A and reserves the other person\'s destination',()=>{
  const world=new LivingWorld(livingRooms,seeded(99))
  const pair=world.characters.slice(0,2),actor=pair[0]
  actor.pointId='central-table'
  actor.recentActivities=[{id:'left-workstation',at:100},{id:'central-table',at:200}]
  assert.ok(!activityChoices(actor,pair,250).includes('left-workstation'))
  assert.ok(!activityChoices(actor,pair,250).includes('right-workstation'))
  assert.ok(activityChoices(actor,pair,100+ACTIVITY_COOLDOWN+1).includes('left-workstation'))
  actor.recentTransitions=[{from:'central-table',to:'whiteboard',at:220}]
  assert.ok(!activityChoices(actor,pair,300).includes('whiteboard'),'Do not repeat the same directed route within ten minutes')
  assert.ok(activityChoices(actor,pair,821).includes('whiteboard'))
})

test('walking easing is monotonic with soft start and arrival',()=>{
  assert.equal(walkingProgress(0),0);assert.equal(walkingProgress(1),1)
  for(let i=1;i<=100;i++)assert.ok(walkingProgress(i/100)>=walkingProgress((i-1)/100))
  assert.ok(walkingProgress(0.01)<0.001)
  assert.ok(1-walkingProgress(0.99)<0.001)
})

test('full ten-minute simulations: actual minimum dwell, activity cooldowns, sparse object events and work-only machinery',()=>{
  for(const seed of [41,42,43,44,45]){
    const world=new LivingWorld(livingRooms,seeded(seed))
    const ambientSeconds=new Map<string,number>()
    for(let step=0;step<6000;step++){
      const before=world.characters.map(a=>({trips:a.trips,arrivedAt:a.arrivedAt,history:[...a.recentActivities]}))
      world.update(0.1)
      world.characters.forEach((a,i)=>{
        if(a.trips>before[i].trips && a.journey?.purpose==='activity'){
          assert.ok(world.time-before[i].arrivedAt>=90,'Arrival always buys a long task stay')
          assert.ok(!before[i].history.slice(-2).some(v=>v.id===a.journey!.destination&&world.time-v.at<300),'No quick reverse')
        }
      })
      for(const [roomId,events]of world.ambient)for(const e of events){
        if(e.active){
          const key=roomId+e.definition.id
          ambientSeconds.set(key,(ambientSeconds.get(key)??0)+0.1)
          if(e.definition.activity)assert.ok(world.characters.some(a=>a.roomId===roomId&&a.pointId===e.definition.activity&&!a.journey&&world.time<a.actionUntil),'No unattended moving tool')
        }else assert.equal(e.value,0,'Fully still between events')
      }
    }
    for(const a of world.characters)assert.ok(a.walkingSeconds/world.time<0.2,'Walking cannot dominate')
    for(const seconds of ambientSeconds.values())assert.ok(seconds<120,'Individual objects remain still >80% of the time')
    for(const events of world.ambient.values())assert.ok(events.filter(e=>!e.definition.activity).every(e=>e.starts>0),'Independent room life continues')
  }
})

test('separate sessions vary; invalid time never advances the world',()=>{
  const a=new LivingWorld(livingRooms,seeded(1)),b=new LivingWorld(livingRooms,seeded(2))
  assert.notEqual(a.characters[0].dwellUntil,b.characters[0].dwellUntil)
  a.update(NaN);a.update(-1);a.update(0);assert.equal(a.time,0)
})

test('office has seven restrained events and all required work destinations are used',()=>{
  const office=livingRooms[0]
  assert.equal(office.ambient.length,7)
  assert.equal(office.sheet,'/assets/living/office-characters.png')
  for(const id of ['left-workstation','right-workstation','central-table','whiteboard','printer','coffee','lounge']){
    assert.ok(office.points.some(p=>p.id===id&&p.activity))
    assert.ok(office.characters.some(a=>a.preferences.includes(id)))
  }
  const world=new LivingWorld(livingRooms,seeded(2909)),visited=new Set<string>()
  for(let step=0;step<36000;step++){
    world.update(0.1)
    world.characters.filter(a=>a.roomId===office.roomId&&!a.journey).forEach(a=>visited.add(a.pointId))
  }
  for(const id of ['whiteboard','printer','coffee','central-table'])assert.ok(visited.has(id),id)
  for(const event of world.ambient.get(office.roomId)!)assert.ok(event.starts>0,event.definition.id)
})

test('office task stations cannot become through-routes across an occupied colleague',()=>{
  const office=livingRooms[0]
  for(const point of office.points.filter(p=>p.activity)){
    assert.equal(office.edges.filter(edge=>edge.includes(point.id)).length,1,`${point.id} is a side branch`)
  }
  const cases=[['coffee','central-table','right-workstation'],['central-table','whiteboard','left-workstation']]
  for(const [from,to,occupied]of cases){
    const route=findRoute(office,from,to),station=office.points.find(p=>p.id===occupied)!.foot
    for(let i=1;i<route.length;i++)for(let step=0;step<=100;step++){
      const t=step/100,a=route[i-1],b=route[i]
      assert.ok(distance({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},station)>55,`${from} → ${to} clears ${occupied}`)
    }
  }
})
