import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createCoordination,parseCoordination,setMembers,createTask,runnableTasks,claimTask,settleTask,reviewTask,cancelTask,recoverInterrupted,publishMemory,deleteMemory,visibleMemories,postHelp} from './domain.ts'

const roster=[
 {id:'ceo',name:'Oscar',departmentId:'executive',role:'ceo'},
 {id:'head',name:'Bruno',departmentId:'engineering',role:'head',reportsTo:'ceo'},
 {id:'worker',name:'Cleo',departmentId:'engineering',role:'employee',reportsTo:'head'},
 {id:'worker2',name:'Iris',departmentId:'engineering',role:'employee',reportsTo:'head'},
 {id:'reviewer',name:'Arthur',departmentId:'engineering',role:'reviewer',reportsTo:'head'},
 {id:'other',name:'Poppy',departmentId:'design',role:'employee',reportsTo:'ceo'},
]
const initial=()=>setMembers(createCoordination('project-one'),roster,100)
const add=(state,overrides={},actor='user',now=200)=>createTask(state,{title:'Check acceptance',brief:'Return concrete evidence and a summary.',assigneeId:'worker',idempotencyKey:crypto.randomUUID(),...overrides},actor,now)
const last=state=>state.tasks.at(-1)
const note=(overrides={})=>({scope:'employee',scopeId:'worker',authorId:'worker',title:'An observation',content:'A cited observation, not an instruction.',source:'task:accepted-check',...overrides})

test('strict state parsing rejects cross-project data, malformed bounds and unsafe object keys',()=>{
 const state=initial()
 for(const value of [null,[],{...state,projectId:'other-project'},{...state,schemaVersion:2},{...state,members:[...roster,roster[0]]},JSON.parse('{"__proto__":{"polluted":true}}')])assert.throws(()=>parseCoordination(value,'project-one'))
 assert.equal({}.polluted,undefined)
 const cloned=parseCoordination(state,'project-one');cloned.members[0].name='Changed';assert.equal(state.members[0].name,'Oscar')
 assert.throws(()=>createCoordination('__proto__'))
 assert.throws(()=>createCoordination('../elsewhere'))
 assert.throws(()=>setMembers(state,[{id:'user',name:'Impersonation',departmentId:'d',role:'employee'}]),/reserved/)
 assert.throws(()=>setMembers(state,[{id:'coordinator',name:'Impersonation',departmentId:'d',role:'employee'}]),/reserved/)
})

test('reporting hierarchy rejects multiple CEOs, cycles, invalid managers and excessive depth',()=>{
 const state=initial()
 assert.throws(()=>setMembers(state,[...roster,{id:'ceo2',name:'Second',departmentId:'executive',role:'ceo'}]),/one CEO/)
 assert.throws(()=>setMembers(state,roster.map(m=>m.id==='head'?{...m,reportsTo:'worker'}:m)),/CEO or department head/)
 assert.throws(()=>setMembers(state,roster.map(m=>m.id==='ceo'?{...m,reportsTo:'head'}:m)),/CEO reports/)
 assert.throws(()=>setMembers(state,[{id:'a',name:'A',departmentId:'d',role:'head',reportsTo:'b'},{id:'b',name:'B',departmentId:'d',role:'head',reportsTo:'a'}]),/cycle/)
 const chain=Array.from({length:5},(_,i)=>({id:'n'+i,name:'N'+i,departmentId:'d',role:'head',...(i?{reportsTo:'n'+(i-1)}:{})}))
 assert.throws(()=>setMembers(state,chain),/three levels/)
})

test('delegation is bounded by direct reporting lines and stable delivery keys',()=>{
 let state=initial()
 state=add(state,{idempotencyKey:'delivery-one'},'head');const id=last(state).id
 assert.equal(add(state,{idempotencyKey:'delivery-one'},'head').tasks.length,1)
 assert.throws(()=>add(state,{idempotencyKey:'delivery-one',title:'Different'},'head'),/different work/)
 assert.throws(()=>add(state,{idempotencyKey:'delivery-one',maxAttempts:5},'head'),/different work/)
 assert.throws(()=>add(state,{assigneeId:'other'},'head'),/direct reports/)
 assert.throws(()=>add(state,{assigneeId:'worker2'},'worker'),/direct reports/)
 state=add(state,{parentId:id,assigneeId:'worker2'},'user')
 state=add(state,{parentId:id,assigneeId:'other'},'user')
 assert.throws(()=>add(state,{parentId:id},'user'),/two children/)
 assert.throws(()=>add(initial(),{dependencies:['not-from-this-project']}),/not part/)
})

test('task dependency and parent cycles fail closed when loading persisted state',()=>{
 let state=add(initial());const a=last(state).id
 state=add(state,{assigneeId:'worker2'});const b=last(state).id
 assert.throws(()=>parseCoordination({...state,tasks:state.tasks.map(t=>({...t,dependencies:[t.id===a?b:a]}))},state.projectId),/cycle/)
 assert.throws(()=>parseCoordination({...state,tasks:state.tasks.map(t=>({...t,parentId:t.id===a?b:a}))},state.projectId),/cycle/)
})

test('queue respects global capacity, one execution per employee and reviewed dependencies',()=>{
 let state=add(initial());const first=last(state).id
 state=add(state);state=add(state,{assigneeId:'worker2'});const second=last(state).id
 state=add(state,{assigneeId:'other',dependencies:[first]})
 assert.deepEqual(runnableTasks(state,[],2).map(t=>t.id),[first,second])
 assert.equal(runnableTasks(state,['worker'],2)[0].id,second)
 state=claimTask(state,first,'run-one','user',300)
 state=claimTask(state,second,'run-two','user',300)
 assert.equal(runnableTasks(state).length,0)
 assert.throws(()=>claimTask(state,state.tasks[1].id,'run-three'),/not ready/)
 state=settleTask(state,first,'run-one',{result:'Tests passed.'},400)
 assert.equal(runnableTasks(state).some(t=>t.assigneeId==='other'),false)
 state=reviewTask(state,first,true,'reviewer','Verified tests.',500)
 assert.equal(runnableTasks(state,['worker']).some(t=>t.assigneeId==='other'),true)
})

test('only matched run output can settle, and completion requires independent review',()=>{
 let state=add(initial());const id=last(state).id
 state=claimTask(state,id,'run-one','user',300)
 assert.equal(last(settleTask(state,id,'stale-run',{result:'Spoofed'},350)).status,'running')
 state=settleTask(state,id,'run-one',{result:'Evidence: two passing checks.'},400)
 assert.equal(last(state).status,'awaiting_review')
 assert.throws(()=>reviewTask(state,id,true,'worker'),/own output/)
 assert.throws(()=>reviewTask(state,id,true,'other'),/not authorized/)
 state=reviewTask(state,id,true,'reviewer','I checked both assertions.',500)
 assert.equal(last(state).status,'completed')
 assert.equal(last(settleTask(state,id,'run-one',{error:'Delayed error'},600)).status,'completed')
})

test('restart recovery blocks old attempts and never automatically resubmits side effects',()=>{
 let state=add(initial());const id=last(state).id
 state=claimTask(state,id,'run-one','user',300)
 const recovered=recoverInterrupted(parseCoordination(JSON.parse(JSON.stringify(state)),state.projectId),400)
 assert.equal(last(recovered).status,'blocked')
 assert.match(last(recovered).error,/Reconcile/)
 assert.equal(runnableTasks(recovered).length,0)
 const late=settleTask(recovered,id,'run-one',{result:'Late answer'},450)
 assert.equal(last(late).status,'blocked')
 const queued=reviewTask(recovered,id,false,'user','Confirmed no side effect happened.',500)
 assert.equal(last(queued).status,'queued')
 assert.throws(()=>claimTask(queued,id,'run-one','user',600),/already been used/)
 assert.equal(last(claimTask(queued,id,'run-two','user',600)).attempt,2)
})

test('lease expiry and missing evidence are blocked rather than reported as success',()=>{
 let state=add(initial());const id=last(state).id
 state=claimTask(state,id,'run-one','user',300)
 const expired=settleTask(state,id,'run-one',{result:'Too late'},600301)
 assert.equal(last(expired).status,'blocked')
 assert.match(last(expired).error,/lease expired/)
 const empty=settleTask(state,id,'run-one',{},400)
 assert.equal(last(empty).status,'blocked')
 assert.throws(()=>reviewTask(empty,id,true),/recorded output/)
})

test('authorization cannot be bypassed by retry and attempts stop at configured budget',()=>{
 let state=add(initial(),{maxAttempts:1});const id=last(state).id
 state=claimTask(state,id,'run-one','user',300)
 const denied=settleTask(state,id,'run-one',{error:'Sign-in needed',authorization:true},400)
 assert.equal(last(denied).status,'needs_authorization')
 assert.throws(()=>reviewTask(denied,id,false),/not waiting/)
 state=settleTask(state,id,'run-one',{error:'Network failed'},400)
 assert.throws(()=>reviewTask(state,id,false),/exhausted/)
 assert.equal(last(state).attempt,1)
})

test('cancellation propagates to delegated children and dependent work, fencing late output',()=>{
 let state=add(initial());const root=last(state).id
 state=add(state,{parentId:root,assigneeId:'worker2'});const child=last(state).id
 state=add(state,{dependencies:[child],assigneeId:'other'})
 state=claimTask(state,child,'child-run','user',300)
 state=cancelTask(state,root,'user',400)
 assert.ok(state.tasks.every(t=>t.status==='cancelled'))
 assert.equal(runnableTasks(state).length,0)
 assert.equal(last(settleTask(state,child,'child-run',{result:'Late'},500)).status,'cancelled')
 assert.ok(initial().events.length>0)
})

test('parent cannot complete while its delegated work is unfinished',()=>{
 let state=add(initial(),{assigneeId:'head'});const root=last(state).id
 state=add(state,{parentId:root})
 state=claimTask(state,root,'parent-run','user',300)
 state=settleTask(state,root,'parent-run',{result:'An integration summary.'},400)
 assert.throws(()=>reviewTask(state,root,true),/delegated children/)
})

test('knowledge access is filtered by private, team, department and project scopes',()=>{
 let state=add(initial(),{participants:['worker2']});const id=last(state).id
 for(const input of [note(),note({scope:'task',scopeId:id,title:'Team'}),note({scope:'department',scopeId:'engineering',title:'Department'}),note({scope:'project',scopeId:'project-one',title:'Project'})])state=publishMemory(state,input,'user',300)
 assert.equal(visibleMemories(state,'worker',400).length,4)
 assert.equal(visibleMemories(state,'worker2',400).length,3)
 assert.equal(visibleMemories(state,'other',400).length,1)
 // CEO status does not confer access to employees' private notes.
 assert.equal(visibleMemories(state,'ceo',400).length,1)
 assert.throws(()=>visibleMemories(state,'not-hired'),/not part/)
 assert.throws(()=>publishMemory(state,note({scope:'project',scopeId:'different-project'})),/Cross-project/)
 assert.throws(()=>publishMemory(state,note({scope:'employee',scopeId:'worker2'}),'worker'),/authorized scope/)
 assert.throws(()=>publishMemory(state,note({scope:'project',scopeId:'project-one'}),'worker'),/manager or user/)
})

test('knowledge needs provenance; corrections supersede without widening scope and deletion removes revision chain',()=>{
 let state=publishMemory(initial(),note(),'worker',200),old=state.memories[0]
 assert.throws(()=>publishMemory(state,note({source:''})),/source/)
 assert.throws(()=>publishMemory(state,{...old,scope:'project',scopeId:state.projectId}),/widen/)
 state=publishMemory(state,{...old,content:'A corrected sourced observation.'},'worker',300)
 assert.equal(state.memories.length,2)
 const active=visibleMemories(state,'worker',400)
 assert.equal(active.length,1);assert.equal(active[0].revision,2);assert.notEqual(active[0].id,old.id)
 assert.equal(active[0].createdAt,300)
 state=deleteMemory(state,old.id,'worker',500)
 assert.equal(visibleMemories(state,'user',600).length,0)
 assert.ok(state.memories.every(m=>!m.content.includes('observation')))
 assert.throws(()=>deleteMemory(publishMemory(initial(),note()),old.id,'other'))
})

test('expired knowledge never enters fresh context and a helper gains no private scope',()=>{
 let state=add(initial());const id=last(state).id
 state=publishMemory(state,note({expiresAt:300}),'worker',200)
 assert.equal(visibleMemories(state,'worker',299).length,1)
 assert.equal(visibleMemories(state,'worker',300).length,0)
 state=postHelp(state,{taskId:id,senderId:'worker',recipientId:'other',text:'Could you check this claim?'},'worker',400)
 assert.equal(visibleMemories(state,'other',250).length,0)
 const request=state.messages[0]
 state=postHelp(state,{taskId:id,senderId:'other',recipientId:'worker',text:'Here is the answer to your shared question.',replyTo:request.id},'other',500)
 assert.equal(state.messages.length,2)
 assert.throws(()=>postHelp(state,{taskId:id,senderId:'worker',recipientId:'other',text:'Pretend to be my peer'},'worker2'),/impersonate/)
 assert.throws(()=>postHelp(state,{taskId:id,senderId:'other',recipientId:'worker',text:'Unsolicited mutation'},'other'),/participants/)
 assert.throws(()=>postHelp(state,{taskId:id,senderId:'other',recipientId:'worker2',text:'Wrong reply recipient',replyTo:request.id},'other'),/participants/)
})

test('every operation leaves prior state untouched and survives a JSON round trip',()=>{
 const original=initial(),serialized=JSON.stringify(original)
 let state=add(original)
 assert.equal(JSON.stringify(original),serialized)
 const taskId=last(state).id
 state=claimTask(state,taskId,'run-one','user',300)
 state=settleTask(state,taskId,'run-one',{result:'Read-only evidence.'},400)
 state=reviewTask(state,taskId,true,'user','Verified.',500)
 state=publishMemory(state,note({scope:'task',scopeId:taskId}),'user',600)
 assert.deepEqual(parseCoordination(JSON.parse(JSON.stringify(state)),state.projectId),parseCoordination(state,state.projectId))
 assert.throws(()=>setMembers(state,roster.filter(m=>m.id!=='worker')),/not part/)
})

test('recovery assessment is explicit, bounded and cannot retry or authorize blocked work',async()=>{
 const {requestRecovery}=await import('./domain.ts')
 let s=setMembers(initial(),[...roster,{id:'doctor',name:'Recovery',role:'recovery',departmentId:'engineering'}])
 s=add(s);const original=last(s).id;s=claimTask(s,original,'blocked-run');s=settleTask(s,original,'blocked-run',{authorization:true,error:'Expired credentials'})
 s=requestRecovery(s,original);const assessment=last(s)
 assert.equal(assessment.assigneeId,'doctor');assert.equal(assessment.maxAttempts,1);assert.equal(s.tasks[0].status,'needs_authorization');assert.match(assessment.brief,/Do not execute repairs/)
 assert.equal(requestRecovery(s,original).tasks.length,s.tasks.length)
 assert.throws(()=>requestRecovery(initial(),'missing'))
})

test('a child cannot wait for the parent whose completion waits for that child',()=>{
 let s=add(initial(),{assigneeId:'head'}),parentId=last(s).id
 assert.throws(()=>add(s,{assigneeId:'worker',parentId,dependencies:[parentId]},'head'),/cycle/)
})
