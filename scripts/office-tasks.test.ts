import test from 'node:test'
import assert from 'node:assert/strict'
import {OfficePeople,isOfficeFloorFree} from '../src/procedural/OfficePeople.ts'
import {officeDefinitions} from '../src/procedural/officeRooms.ts'
import {illustratedTasks} from '../src/characters/officeTasks.ts'

test('illustrated colleagues stop at real task furniture and return to their own desks',()=>{
 const w=new OfficePeople(officeDefinitions),seen=new Map<number,{held:number;walked:number;returned:boolean}>()
 for(const id of Object.keys(illustratedTasks))seen.set(Number(id),{held:0,walked:0,returned:false})
 for(let n=0;n<1200*30;n++){
  w.update(1/30)
  for(const a of w.actors){const s=seen.get(a.index);if(!s)continue
   if(a.mode==='walk'){s.walked+=1/30;assert.ok(isOfficeFloorFree(officeDefinitions[0],a));assert.ok(a.destination)}
   if(a.activity==='task'){
    s.held+=1/30;const f=officeDefinitions[0].furniture.find(f=>f.id===a.destination)!
    assert.ok(f,'Task needs an actual object')
    const dx=Math.max(f.i-a.i,0,a.i-f.i-f.w),dy=Math.max(f.j-a.j,0,a.j-f.j-f.d)
    assert.ok(Math.hypot(dx,dy)<1,'Task is out of reach of its object')
    assert.equal(a.mode,'idle');assert.ok(a.taskName&&a.taskName!=='Work at assigned desk')
   }
   if(s.held>0&&a.mode==='work'){s.returned=true;assert.equal(a.i,a.station.i);assert.equal(a.j,a.station.j)}
  }
 }
 for(const [id,s]of seen){assert.ok(s.held>=illustratedTasks[id].hold-.1,id+' never spent time on a task');assert.ok(s.walked>0);assert.ok(s.returned,id+' never returned to work')}
 assert.ok(seen.get(0)!.walked<18,'Oscar should make a short archive trip, not tour the whole room')
})
