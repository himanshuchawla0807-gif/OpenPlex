import {test} from 'node:test'
import assert from 'node:assert/strict'
import {OfficeSimulation} from '../src/living/OfficeSimulation.ts'
import {officeTeam} from '../src/living/officeTeamData.ts'
import {campusProfiles,makeCampusConfig} from '../src/world/campusData.ts'
import {characterPose,strideOffset,angleDifference} from '../src/living/characterPose.ts'
import {CampusWorld,CAMPUS_STEP} from '../src/living/CampusWorld.ts'
import {wheelGesture,pinchFactor,clampZoom} from '../src/camera/gestures.ts'
import {Camera} from '../src/camera/Camera.ts'
const seeded=()=>{let seed=17;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y)

test('walking consumes the full distance budget through densely sampled corners',()=>{
  const world=new OfficeSimulation(seeded(),{members:[{...officeTeam[0],home:'home'}],spots:[{id:'home',kind:'seat',x:0,y:0},{id:'task',kind:'task',x:30,y:0}],navigate:(a,b)=>[a,b]})
  const actor=world.actors[0]
  actor.state='WALKING';actor.destination='task';actor.route=Array.from({length:301},(_,i)=>({x:i/10,y:0}));actor.segment=1;actor.velocity=40;actor.speed=40
  world.update(1/60)
  assert.ok(Math.abs(actor.foot.x-40/60)<1e-9,'short waypoint boundaries must not discard movement')
  assert.ok(actor.segment>=7)
})

test('stance feet stay planted and the stride has continuous landing and lift-off velocity',()=>{
  const length=48,positions=[0.1,0.2,0.3,0.4,0.5].map(phase=>phase*length+strideOffset(phase,length).along)
  assert.ok(positions.every(x=>Math.abs(x-positions[0])<1e-9),'body travel cancels foot offset during stance')
  for(const boundary of [0.62,1]){
    const epsilon=1e-5,a=strideOffset(boundary-epsilon,length),b=strideOffset(boundary,length),c=strideOffset(boundary+epsilon,length)
    assert.ok(Math.abs(a.along-b.along)<0.001&&Math.abs(c.along-b.along)<0.001)
    assert.ok(Math.abs((b.along-a.along)/epsilon-(c.along-b.along)/epsilon)<0.1)
    assert.ok(a.lift<1e-7&&b.lift<1e-7&&c.lift<1e-7)
  }
})

test('every seated pelvis stays on its cushion and both hands stay on the desk surface',()=>{
  for(const profile of campusProfiles){
    const world=new OfficeSimulation(seeded(),makeCampusConfig(profile))
    for(const actor of world.actors){
      const station=world.workstations[actor.home]
      actor.gestureUntil=10
      let previous:ReturnType<typeof characterPose>|undefined
      for(let frame=0;frame<240;frame++){
        const pose=characterPose(actor,station,frame/60)
        assert.deepEqual(pose.hip,station.chairSeat,profile.id+'/'+actor.id)
        for(const arm of pose.arms){
          assert.ok(distance(arm.end,station.interaction)<actor.height*0.06)
          if(previous)assert.ok(distance(arm.end,previous.arms.find(a=>a.side===arm.side)!.end)<0.15,'small desk gestures cannot sweep across the body')
        }
        // Left/right hand ordering follows the shoulder ordering, so the forearms cannot swap sides.
        const shoulders=pose.arms[1].root.x-pose.arms[0].root.x,hands=pose.arms[1].end.x-pose.arms[0].end.x
        assert.ok(shoulders*hands>=0)
        previous=pose
      }
    }
  }
})

test('sitting and standing interpolate one solid rig with continuous hip, wrist and foot positions',()=>{
  for(const profile of campusProfiles){
    const world=new OfficeSimulation(seeded(),makeCampusConfig(profile)),actor=world.actors[0],station=world.workstations[actor.home]
    actor.state='RISING';actor.transitionAt=0
    let previous=characterPose(actor,station,0)
    for(let i=1;i<=132;i++){
      const pose=characterPose(actor,station,i/120)
      for(const [a,b] of [[pose.hip,previous.hip],...pose.arms.map((arm,j)=>[arm.end,previous.arms[j].end]),...pose.legs.map((leg,j)=>[leg.end,previous.legs[j].end])])assert.ok(distance(a,b)<actor.height*0.025)
      previous=pose
    }
    actor.state='WALKING'
    const standing=characterPose(actor,station,1.1)
    assert.ok(distance(standing.hip,previous.hip)<1e-8)
  }
  assert.ok(Math.abs(angleDifference(Math.PI-0.01,-Math.PI+0.01)-0.02)<1e-9)
})

test('fixed 120 Hz simulation produces identical motion at 30, 60 and 120 display frames per second',()=>{
  const worlds=[30,60,120].map(hz=>{
    const world=new CampusWorld(seeded())
    for(let i=0;i<hz*25;i++)world.update(1/hz)
    return world
  })
  for(const world of worlds.slice(1))for(let i=0;i<world.actors.length;i++){
    assert.ok(distance(world.actors[i].foot,worlds[0].actors[i].foot)<1e-7)
    assert.equal(world.actors[i].state,worlds[0].actors[i].state)
  }
  for(const world of worlds)for(const sim of world.simulations.values())assert.ok(sim.renderAlpha>=0&&sim.renderAlpha<1&&Math.abs(sim.time-25)<CAMPUS_STEP*1.01)
})

test('ordinary scrolling pans and pinch gestures zoom symmetrically around the pointer',()=>{
  assert.deepEqual(wheelGesture(20,80,0,false,800),{kind:'pan',x:-18,y:-72})
  assert.equal(wheelGesture(0,-3,1,false,800).kind,'pan')
  const zoomIn=wheelGesture(0,-8,0,true,800),zoomOut=wheelGesture(0,8,0,true,800)
  assert.equal(zoomIn.kind,'zoom');assert.equal(zoomOut.kind,'zoom')
  if(zoomIn.kind==='zoom'&&zoomOut.kind==='zoom'){
    assert.ok(zoomIn.factor>1&&zoomOut.factor<1&&Math.abs(zoomIn.factor*zoomOut.factor-1)<1e-12)
    const camera=new Camera({x:40,y:-20,zoom:0.8}),viewport={width:1000,height:700},pointer={x:320,y:240}
    const before={x:(pointer.x-viewport.width/2-camera.value.x)/camera.value.zoom,y:(pointer.y-viewport.height/2-camera.value.y)/camera.value.zoom}
    camera.zoomAt(camera.value.zoom*zoomIn.factor,pointer,viewport)
    assert.ok(distance(before,{x:(pointer.x-viewport.width/2-camera.value.x)/camera.value.zoom,y:(pointer.y-viewport.height/2-camera.value.y)/camera.value.zoom})<1e-9)
  }
  assert.ok(pinchFactor(100,120)>1&&pinchFactor(120,100)<1)
  assert.equal(pinchFactor(0,100),1)
  assert.equal(clampZoom(100),1.9);assert.equal(clampZoom(0),0.08)
})


test('the collaboration table blocks its floor footprint, including the reported walk-through point',()=>{
  const profile=campusProfiles.find(p=>p.id==='collaboration-suite')!,config=makeCampusConfig(profile)
  assert.equal(config.isWalkable({x:890,y:591}),false,'the tabletop position cannot substitute for its footprint on the floor')
  const route=config.navigate(config.spots.find(s=>s.id==='suite-seat-2')!,config.spots.find(s=>s.id==='planning-board')!)
  assert.ok(route)
  for(let n=1;n<route.length;n++)for(let k=0;k<=20;k++){
    const t=k/20
    assert.ok(config.isWalkable({x:route[n-1].x+(route[n].x-route[n-1].x)*t,y:route[n-1].y+(route[n].y-route[n-1].y)*t}))
  }
})


test('the office foosball surface and legs cannot become a walk-through corridor',()=>{
  const profile=campusProfiles.find(p=>p.id==='connected-office')!,config=makeCampusConfig(profile)
  for(const point of [{x:520,y:360},{x:500,y:390},{x:490,y:300}])assert.equal(config.isWalkable(point),false)
})
