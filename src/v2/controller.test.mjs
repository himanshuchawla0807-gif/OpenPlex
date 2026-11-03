import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CoordinationController} from './controller.ts'
import {prepareWork} from './workflow.ts'
import {createCoordination,setMembers,createTask,claimTask,publishMemory,postHelp,reviewTask,settleTask} from './domain.ts'
const roster=[{id:'p:head',name:'Lead',departmentId:'d',role:'head'},{id:'p:a',name:'Alice',departmentId:'d',role:'employee',reportsTo:'p:head'},{id:'p:b',name:'Bob',departmentId:'other',role:'employee',reportsTo:'p:head'}]
const initial=()=>setMembers(createCoordination('p'),roster)
const add=(s,assigneeId='p:a',extra={})=>createTask(s,{title:'Bounded work',brief:'Return a reasoned result.',assigneeId,idempotencyKey:crypto.randomUUID(),...extra})
function fixture(state=add(initial())){
 let disk={state,revision:1},fail=false,busy=[],runs=[],stops=[],saves=0
 const io={load:async()=>structuredClone(disk),save:async(snapshot,next)=>{saves++;if(fail)throw Error('Disk full');assert.equal(snapshot.revision,disk.revision);disk={state:structuredClone(next),revision:disk.revision+1};return structuredClone(disk)},busy:()=>busy,run:(envelope,key)=>{assert.equal(disk.state.tasks.find(t=>t.id===envelope.taskId).status,'running');runs.push({envelope,key})},stop:key=>stops.push(key)}
 const c=new CoordinationController('p',io)
 return {c,io,runs,stops,get disk(){return disk},get saves(){return saves},fail:()=>{fail=true},busy:x=>{busy=x}}
}
const wait=async(c)=>{for(let i=0;i<100&&c.pending;i++)await new Promise(r=>setTimeout(r,2));assert.equal(c.pending,0)}
test('claims are durably saved before dispatch; tool-free graph never calls fetch',async()=>{
 const f=fixture(),fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected external network')}
 try{await f.c.load();await f.c.runReady();assert.equal(f.runs.length,1);assert.equal(f.disk.state.tasks[0].attempt,1);assert.match(f.runs[0].envelope.prompt,/untrusted reference data/)}finally{globalThis.fetch=fetch}
})
test('a failed commit never dispatches and retains the previous task state',async()=>{
 const f=fixture();await f.c.load();f.fail();await assert.rejects(f.c.runReady(),/Disk full/);assert.equal(f.runs.length,0);assert.equal(f.c.snapshot.state.tasks[0].status,'queued')
})
test('two rapid Run clicks cannot duplicate one work package',async()=>{
 const f=fixture();await f.c.load();const r=await Promise.allSettled([f.c.runReady(),f.c.runReady()]);assert.equal(r[0].status,'fulfilled');assert.equal(r[1].status,'rejected');assert.equal(f.runs.length,1)
})
test('native streamed answers require matching run and explicit review',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();const {key}=f.runs[0]
 f.c.event({key:'v2:p:other',kind:'answer',text:'Forged output'});f.c.event({key,kind:'started'});f.c.event({key,kind:'answer',text:'Verified assumptions, evidence and limitations.'});f.c.event({key,kind:'finished',exitCode:0});await wait(f.c)
 const t=f.disk.state.tasks[0];assert.equal(t.status,'awaiting_review');assert.doesNotMatch(t.result,/Forged/);await f.c.change(s=>reviewTask(s,t.id,true));assert.equal(f.disk.state.tasks[0].status,'completed')
})
test('a turn error does not free ownership before native process termination',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();const {key}=f.runs[0];f.c.event({key,kind:'started'});f.c.event({key,kind:'error',text:'Provider failure'});assert.equal(f.c.activeCount,1);assert.equal(f.disk.state.tasks[0].status,'running');f.c.event({key,kind:'finished',exitCode:1});await wait(f.c);assert.equal(f.c.activeCount,0);assert.equal(f.disk.state.tasks[0].status,'blocked')
})
test('startup credential errors route to authorization, never auto-retry',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();f.c.event({key:f.runs[0].key,kind:'error',text:'Authentication: sign in required'});await wait(f.c);assert.equal(f.disk.state.tasks[0].status,'needs_authorization');assert.equal(f.runs.length,1)
})
test('cancellation is persisted before stop, and late output cannot revive it',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();const {key}=f.runs[0];await f.c.cancel(f.disk.state.tasks[0].id);assert.equal(f.disk.state.tasks[0].status,'cancelled');assert.deepEqual(f.stops,[key]);f.c.event({key,kind:'answer',text:'Late'});f.c.event({key,kind:'finished',exitCode:0});await wait(f.c);assert.equal(f.disk.state.tasks[0].status,'cancelled')
})
test('restart stops an ambiguous prior run, records a blocker and does not dispatch',async()=>{
 const state=add(initial()),running=claimTask(state,state.tasks[0].id,'prior-run');const f=fixture(running);await f.c.load();assert.equal(f.disk.state.tasks[0].status,'blocked');assert.deepEqual(f.stops,['v2:p:prior-run']);assert.equal(f.runs.length,0)
})
test('execution lease timeout stops the owned attempt and rejects its late result',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();const t=f.disk.state.tasks[0];await f.c.expire(t.leaseUntil+1);assert.equal(f.disk.state.tasks[0].status,'blocked');assert.equal(f.stops.length,1)
})
test('busy regular employee sessions are excluded, and graph enforces total/per-owner limits',async()=>{
 const state=add(add(add(initial()),'p:b'),'p:a'),f=fixture(state);f.busy(['p:a']);await f.c.load();await f.c.runReady();assert.deepEqual(f.runs.map(r=>r.envelope.employeeId),['p:b']);const p=await prepareWork(state);assert.equal(p.envelopes.length,2);assert.equal(new Set(p.envelopes.map(e=>e.employeeId)).size,2)
})
test('worker context excludes unrelated private/department memory and help threads',async()=>{
 let s=add(add(initial()),'p:b'),t=s.tasks[0]
 for(const [scope,scopeId,content] of [['project','p','shared-evidence'],['employee','p:b','bob-private-secret'],['department','other','other-department-secret']])s=publishMemory(s,{scope,scopeId,content,title:'Finding',source:'checked:1',authorId:'user'})
 s=postHelp(s,{taskId:s.tasks[1].id,senderId:'p:b',recipientId:'p:head',text:'unrelated-help-secret'})
 const r=await prepareWork(s,['p:b']);assert.equal(r.envelopes.length,1);assert.equal(r.envelopes[0].taskId,t.id);assert.match(r.envelopes[0].prompt,/shared-evidence/);assert.doesNotMatch(r.envelopes[0].prompt,/bob-private-secret|other-department-secret|unrelated-help-secret/)
})
test('dependency output is provided only after acceptance and citations retain revisions',async()=>{
 let s=add(initial(),'p:a',{participants:['p:b']}),id=s.tasks[0].id;s=claimTask(s,id,'one');s=settleTask(s,id,'one',{result:'Accepted source evidence'});s=reviewTask(s,id,true);s=add(s,'p:b',{dependencies:[id]});s=publishMemory(s,{scope:'project',scopeId:'p',title:'Verified',content:'Evidence',source:`task:${id}`,authorId:'user'});const r=await prepareWork(s);assert.match(r.envelopes[0].prompt,/Accepted source evidence/);assert.equal(r.envelopes[0].citations[0],s.memories[0].id+'@1')
})

test('unmount shutdown stops only this coordinator’s attempts without declaring them complete',async()=>{
 const f=fixture();await f.c.load();await f.c.runReady();assert.deepEqual(f.c.activeEmployees,['p:a']);f.c.shutdown();assert.deepEqual(f.stops,[f.runs[0].key]);assert.equal(f.disk.state.tasks[0].status,'running')
})

test('waiting for another employee’s task does not grant its private result',async()=>{
 let s=add(initial()),id=s.tasks[0].id;s=claimTask(s,id,'private-run');s=settleTask(s,id,'private-run',{result:'private-dependency-canary'});s=reviewTask(s,id,true);s=add(s,'p:b',{dependencies:[id]});const prepared=await prepareWork(s);assert.equal(prepared.envelopes.length,1);assert.doesNotMatch(prepared.envelopes[0].prompt,/private-dependency-canary/);assert.match(prepared.envelopes[0].prompt,/private result was not shared/)
})
