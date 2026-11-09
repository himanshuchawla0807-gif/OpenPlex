import {test} from 'node:test'
import assert from 'node:assert/strict'
import {addScheduledTask,cancelScheduledTask,dueScheduledTasks,parseTaskSchedule,settleScheduledTasks} from './taskSchedule.ts'
const task=(extra={})=>({id:'task-one',key:'project:room:oscar',prompt:'Review the project',dueAt:1000,createdAt:500,status:'pending',...extra})
test('schedule parsing rejects malformed records and duplicate identities',()=>{
 const parsed=parseTaskSchedule([task(),task(),task({id:'x',dueAt:'1000'}),task({id:'y',prompt:' '}),task({id:'z',status:'unknown'}),task({id:'k',key:'__proto__'}),null,[]])
 assert.equal(parsed.length,1)
 assert.equal(parsed[0].id,'task-one')
 assert.deepEqual(parseTaskSchedule({}),[])
 assert.deepEqual(parseTaskSchedule([task({dueAt:Infinity})]),[])
})
test('running tasks recover as attention and never automatically rerun after restart',()=>{
 const recovered=parseTaskSchedule([task({status:'running',startedAt:1100})])
 assert.equal(recovered[0].status,'attention')
 assert.match(recovered[0].error,/app closed/)
 assert.deepEqual(dueScheduledTasks(recovered,{},()=>true,2000),[])
})
test('due tasks respect time, authorized employee gate and independent employee locks',()=>{
 const tasks=[task({id:'later',dueAt:900}),task({id:'earlier',dueAt:800}),task({id:'future',key:'future',dueAt:3000}),task({id:'other',key:'other'}),task({id:'denied',key:'denied'})]
 assert.deepEqual(dueScheduledTasks(tasks,{},key=>key!=='denied',2000).map(t=>t.id),['earlier','other'])
 assert.deepEqual(dueScheduledTasks(tasks,{'project:room:oscar':{status:'running',messages:[]}},()=>true,2000).map(t=>t.id),['other','denied'])
 assert.deepEqual(dueScheduledTasks([task({status:'running'}),task({id:'next'})],{},()=>true,2000),[])
})
test('only pending tasks can be cancelled and cancellation survives load',()=>{
 const cancelled=cancelScheduledTask([task()], 'task-one',2000)
 assert.equal(cancelled[0].status,'cancelled')
 assert.equal(parseTaskSchedule(cancelled)[0].status,'cancelled')
 const running=task({status:'running'})
 assert.equal(cancelScheduledTask([running],'task-one')[0],running)
})
test('add validates and cannot replace existing or execute immediately',()=>{
 const current=[task()]
 assert.equal(addScheduledTask(current,task()),current)
 assert.equal(addScheduledTask(current,task({id:'bad',prompt:''})),current)
 assert.equal(addScheduledTask(current,task({id:'running',status:'running'})),current)
 assert.equal(addScheduledTask(current,task({id:'new'})).length,2)
})
test('completion requires matching task and a terminal result from this execution',()=>{
 const tasks=[task({status:'running',startedAt:1500})]
 const session={status:'complete',messages:[],lastTask:'Review the project',startedAt:1500,finishedAt:2000}
 assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':session})[0].status,'completed')
 assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':{...session,status:'attention'}})[0].status,'attention')
 for(const extra of [{finishedAt:1000},{lastTask:'A different task'},{status:'running'}])assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':{...session,...extra}})[0],tasks[0])
})

test('a matching previous execution cannot settle a new schedule claim',()=>{
 const queued=task({status:'running',startedAt:1500})
 const earlier={status:'complete',messages:[],lastTask:queued.prompt,startedAt:1200,finishedAt:1500}
 assert.equal(settleScheduledTasks([queued],{[queued.key]:earlier})[0],queued)
 const current={...earlier,startedAt:1500,finishedAt:1800}
 assert.equal(settleScheduledTasks([queued],{[queued.key]:current})[0].status,'completed')
})

test('a full schedule can replace its oldest finished entry, but not unresolved work',()=>{
 const finished=Array.from({length:498},(_,i)=>task({id:'past-'+i,status:'completed',finishedAt:5000+i}))
 const cancelled=task({id:'older-cancelled',status:'cancelled',finishedAt:4000})
 const attention=task({id:'needs-attention',status:'attention',finishedAt:3000})
 const next=task({id:'new'})
 const result=addScheduledTask([...finished,attention,cancelled],next)
 assert.equal(result.length,500)
 assert.equal(result.at(-1),next)
 assert.ok(result.includes(attention))
 assert.ok(!result.includes(cancelled))
 const unresolved=Array.from({length:500},(_,i)=>task({id:'pending-'+i}))
 assert.equal(addScheduledTask(unresolved,next),unresolved)
})
