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
 const session={status:'complete',messages:[],lastTask:'Review the project',finishedAt:2000}
 assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':session})[0].status,'completed')
 assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':{...session,status:'attention'}})[0].status,'attention')
 for(const extra of [{finishedAt:1000},{lastTask:'A different task'},{status:'running'}])assert.equal(settleScheduledTasks(tasks,{'project:room:oscar':{...session,...extra}})[0],tasks[0])
})
