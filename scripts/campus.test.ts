import {test} from 'node:test'
import assert from 'node:assert/strict'
import {campusProfiles,makeCampusConfig} from '../src/world/campusData.ts'
import {OfficeSimulation} from '../src/living/OfficeSimulation.ts'
import {personClearance} from '../src/living/OfficeNavigation.ts'
import {workstations,walkingSpeed} from '../src/living/workstations.ts'

test('every occupied chair has an explicit cushion, approach, facing and reachable interaction point',()=>{
  for(const profile of campusProfiles){
    const config=makeCampusConfig(profile)
    for(const home of profile.homes){
      const anchor=workstations[profile.id][home],spot=config.spots.find(s=>s.id===home)!
      assert.deepEqual(anchor.approach,{x:spot.x,y:spot.y})
      assert.ok(anchor.chairSeat.y<anchor.approach.y,'cushion sits above its floor approach')
      assert.ok(Math.hypot(anchor.interaction.x-anchor.chairSeat.x,anchor.interaction.y-anchor.chairSeat.y)<90,'hands stay within reach')
      assert.ok([-1,1].includes(anchor.facing))
    }
  }
})

test('walking accelerates and brakes without exceeding cruise speed',()=>{
  let speed=0
  for(let i=0;i<60;i++){
    const next=walkingSpeed(speed,40,200,1/60)
    assert.ok(next>=speed&&next<=40);assert.ok(next-speed<=95/60+1e-8);speed=next
  }
  assert.equal(speed,40)
  assert.ok(walkingSpeed(speed,40,1,0.1)<speed)
  assert.ok(walkingSpeed(speed,40,100,0.1,0.55)<speed)
})

test('chair transitions stay still and travel remains continuous across starts, turns, stops and yields',()=>{
  const seen=new Set<string>()
  for(const profile of campusProfiles){
    let seed=17
    const world=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},makeCampusConfig(profile))
    for(let i=0;i<600*30;i++){
      const previous=world.actors.map(a=>({...a.foot}))
      world.update(1/30)
      world.actors.forEach((actor,j)=>{
        seen.add(actor.state)
        const moved=Math.hypot(actor.foot.x-previous[j].x,actor.foot.y-previous[j].y)
        assert.ok(moved<=actor.speed/30+0.02,'no position jumps or over-speed movement')
        if((actor.state==='RISING'||actor.state==='SETTLING')&&world.time>actor.transitionAt+1e-6)assert.ok(moved<0.02,'stand/settle before travelling')
      })
    }
  }
  for(const state of ['WORKING','RISING','WALKING','SETTLING','TASK'])assert.ok(seen.has(state),state)
})

test('five distinct profiles distribute the ten approved adults once, with valid home/task routes and six ambient events each',()=>{
  assert.equal(campusProfiles.length,5)
  const ids=campusProfiles.flatMap(p=>p.members)
  assert.equal(ids.length,10);assert.equal(new Set(ids).size,10)
  for(const profile of campusProfiles){
    assert.equal(profile.ambient.length,6)
    const config=makeCampusConfig(profile)
    for(const spot of config.spots)assert.ok(config.isWalkable(spot),profile.id+'/'+spot.id)
    for(const member of config.members)for(const target of config.spots.filter(p=>p.kind==='task'))
      assert.ok(config.navigate(config.spots.find(p=>p.id===member.home)!,target),profile.id+'/'+target.id)
  }
})

test('three-person teams hold finite senior-led briefings without cutting work sessions short',()=>{
  for(const profile of campusProfiles.filter(p=>p.members.length>=3)){
    let seed=17
    const simulation=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},makeCampusConfig(profile))
    let observed=false
    const returned=new Set<string>()
    for(let i=0;i<1200*30;i++){
      const previous=simulation.actors.map(a=>({state:a.state,arrivedAt:a.arrivedAt}))
      simulation.update(1/30)
      simulation.actors.forEach((a,j)=>{
        if(previous[j].state==='WORKING'&&a.state==='RISING')assert.ok(simulation.time-previous[j].arrivedAt>=makeCampusConfig(profile).minimumWorkDuration-0.001)
        if(observed&&a.state==='WORKING')returned.add(a.id)
      })
      if(simulation.phase==='briefing'){
        observed=true
        const speakers=simulation.actors.filter(a=>a.state==='PRESENTING')
        assert.equal(speakers.length,1);assert.ok(speakers[0].senior)
        assert.ok(simulation.briefingParticipants.length>=3&&simulation.briefingParticipants.length<=5)
      }
    }
    assert.ok(observed,profile.id+' briefing must actually occur')
    assert.equal(returned.size,profile.members.length,'participants return to individual work')
  }
})

test('each environment supports independent work and task trips without feet entering furniture or another coworker',()=>{
  for(const profile of campusProfiles){
    let seed=6
    const config=makeCampusConfig(profile)
    const simulation=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},config)
    const modes=new Set<string>()
    for(let i=0;i<600*30;i++){
      simulation.update(1/30)
      simulation.actors.forEach((a,index)=>{
        modes.add(a.workMode)
        assert.ok(config.isWalkable(a.foot),profile.id+'/'+a.id)
        for(const b of simulation.actors.slice(0,index))assert.ok(Math.hypot(a.foot.x-b.foot.x,a.foot.y-b.foot.y)>=personClearance*profile.heightScale-0.001)
      })
    }
    assert.ok(simulation.actors.every(a=>a.trips>=2),profile.id+' supports task transitions')
    const expected=new Set(config.members.flatMap(member=>config.workstations[member.home]?.modes??['typing','reading','writing','inspecting']))
    assert.deepEqual([...modes].sort(),[...expected].sort(),'activities match the actual workstation equipment')
  }
})


test('campus opens seated, begins task motion within thirty seconds and retains coworkers at their desks',()=>{
  for(const profile of campusProfiles){
    let seed=71
    const world=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},makeCampusConfig(profile))
    assert.ok(world.actors.every(a=>a.state==='WORKING'&&a.spot===a.home))
    const deadlines=world.actors.map(a=>a.until)
    assert.equal(new Set(deadlines).size,deadlines.length)
    for(let i=0;i<30*60;i++){
      world.update(1/60)
      assert.ok(world.actors.filter(a=>a.route.length||a.spot!==a.home).length<=1,'ordinary tasks keep the rest of the room seated')
    }
    assert.ok(world.actors.some(a=>a.trips>=1),profile.id+' must be visibly alive without waiting minutes')
  }
})
