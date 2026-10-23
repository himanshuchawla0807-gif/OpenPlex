import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OfficeSimulation, officeRoute } from '../src/living/OfficeSimulation.ts'
import { officeTeam, officeSpots } from '../src/living/officeTeamData.ts'
import { isOfficeWalkable, personClearance } from '../src/living/OfficeNavigation.ts'

test('ten adult coworkers, five women and five men, mixed styles and unique assigned seats',()=>{
  assert.equal(officeTeam.length,10)
  assert.equal(officeTeam.filter(a=>a.gender==='woman').length,5)
  assert.equal(officeTeam.filter(a=>a.gender==='man').length,5)
  assert.equal(new Set(officeTeam.map(a=>a.home)).size,10)
  assert.ok(officeTeam.every(a=>a.age>=23 && a.age<=40))
  assert.equal(officeTeam.filter(a=>!a.senior).length,4)
  for(const a of officeTeam)for(const b of officeSpots)assert.ok(officeRoute(a.home,b.id).length)
  assert.throws(()=>officeRoute('missing','coffee'))
})

test('seeded twenty-minute shift: work, travel, tasks, mixed-gender chats, briefings and return to seats',()=>{
  let seed=38
  const world=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296})
  const states=new Set<string>(),sharedTasks=new Set(['coffee','books','window','whiteboard'])
  for(let i=0;i<1200*30;i++) {
    world.update(1/30)
    const reserved=world.actors.filter(a=>sharedTasks.has(a.destination)).map(a=>a.destination)
    assert.equal(new Set(reserved).size,reserved.length,'shared task reservations are exclusive')
    for(const a of world.actors) {
      states.add(a.state)
      assert.ok(Number.isFinite(a.foot.x)&&Number.isFinite(a.foot.y))
      assert.ok(a.foot.x>250&&a.foot.x<1450&&a.foot.y>250&&a.foot.y<950)
    }
  }
  for(const state of ['WORKING','WALKING','TASK','TALKING','LISTENING','PRESENTING'])assert.ok(states.has(state),state)
  assert.ok(world.briefings>=3)
  assert.ok(world.conversations>=3)
  assert.ok(world.actors.every(a=>a.trips>=4))
  const before=world.time
  world.update(NaN);world.update(-1);world.update(Infinity)
  assert.equal(world.time,before)
})

test('independent work sessions, small briefings and collision-free routes over three twenty-minute shifts',()=>{
  for(const initialSeed of [7,38,91]) {
    let seed=initialSeed
    const world=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296})
    const deskFrames=Array(10).fill(0),walkFrames=Array(10).fill(0),seenModes=new Set<string>()
    let previous=world.actors.map(a=>({state:a.state,arrivedAt:a.arrivedAt}))
    let checkedBriefing=false
    for(let frame=0;frame<1200*30;frame++) {
      world.update(1/30)
      world.actors.forEach((actor,i)=>{
        if(previous[i].state==='WORKING'&&actor.state!=='WORKING')assert.ok(world.time-previous[i].arrivedAt>=90-0.001,'complete a meaningful desk session before any departure')
        if(actor.state==='WORKING'){deskFrames[i]++;seenModes.add(actor.workMode)}
        if(actor.state==='WALKING')walkFrames[i]++
        assert.ok(isOfficeWalkable(actor.foot),'feet remain on clear floor, outside furniture')
        if(actor.blockedSince)assert.ok(world.time-actor.blockedSince<20,'yielding must recover, not deadlock')
        for(let j=0;j<i;j++)assert.ok(Math.hypot(actor.foot.x-world.actors[j].foot.x,actor.foot.y-world.actors[j].foot.y)>=personClearance-0.001,'coworkers retain personal space')
      })
      if(world.phase==='briefing') {
        checkedBriefing=true
        assert.ok(world.briefingParticipants.length>=3&&world.briefingParticipants.length<=5)
        assert.equal(world.actors.filter(a=>a.state==='PRESENTING').length,1)
        assert.ok(world.actors.find(a=>a.state==='PRESENTING')!.senior)
        assert.ok(world.actors.filter(a=>!world.briefingParticipants.includes(a.id)).some(a=>a.state==='WORKING'),'nonparticipants continue working')
      }
      previous=world.actors.map(a=>({state:a.state,arrivedAt:a.arrivedAt}))
    }
    assert.ok(checkedBriefing)
    assert.equal(seenModes.size,4)
    assert.ok(deskFrames.every(n=>n/(1200*30)>0.5),'everyone spends most of their shift at work')
    assert.ok(walkFrames.every(n=>n/(1200*30)<0.35),'travel does not dominate the shift')
    assert.ok(new Set(world.actors.map(a=>a.gestureAt)).size>=9,'gesture deadlines differ between people')
    assert.ok(world.actors.filter(a=>a.talks>0).length>=6,'conversation partners vary')
  }
})
