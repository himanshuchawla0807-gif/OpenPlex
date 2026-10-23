import {test} from 'node:test'
import assert from 'node:assert/strict'
import {sampleBrunoRig,type RigPose} from '../src/characters/brunoRig.ts'

test('connected vector pilot keeps bone lengths fixed across every action and loop seam',()=>{
  for(const pose of ['idle','walk','sit','type'] as RigPose[])for(let frame=0;frame<=240;frame++){
    const b=sampleBrunoRig(pose,frame/60)
    for(let k=0;k<2;k++)for(const [root,limb,lengths] of [[b.hips[k],b.legs[k],[56,54]],[b.shoulders[k],b.arms[k],b.armLengths[k]]] as const){
      assert.ok(Math.abs(Math.hypot(limb.elbow.x-root.x,limb.elbow.y-root.y)-lengths[0])<1e-5)
      assert.ok(Math.abs(Math.hypot(limb.wrist.x-limb.elbow.x,limb.wrist.y-limb.elbow.y)-lengths[1])<1e-5)
      assert.ok(Number.isFinite(limb.upperDegrees)&&Number.isFinite(limb.lowerDegrees))
    }
  }
})
test('desk wrists stay within a compact keyboard region',()=>{
  for(let frame=0;frame<240;frame++)for(const arm of sampleBrunoRig('type',frame/60).arms){
    assert.ok(arm.wrist.x>=75&&arm.wrist.x<=100)
    assert.ok(arm.wrist.y>=-129&&arm.wrist.y<=-125)
  }
})
test('walking return does not teleport across its phase boundary',()=>{
  for(const seam of [.576,.96,1.536,1.92]){
    const before=sampleBrunoRig('walk',seam-1e-5),after=sampleBrunoRig('walk',seam+1e-5)
    for(let k=0;k<2;k++)assert.ok(Math.hypot(before.legs[k].wrist.x-after.legs[k].wrist.x,before.legs[k].wrist.y-after.legs[k].wrist.y)<.02)
  }
})

test('seated thighs lead forward and shins descend toward the floor',()=>{
  const b=sampleBrunoRig('type',0)
  for(let k=0;k<2;k++){const hip=b.hips[k],leg=b.legs[k]
    assert.ok(leg.elbow.x-hip.x>45,'thigh extends toward keyboard')
    assert.ok(Math.abs(leg.elbow.y-hip.y)<23,'thigh stays close to horizontal')
    assert.ok(leg.wrist.y-leg.elbow.y>40,'shin drops down from knee')
  }
})
