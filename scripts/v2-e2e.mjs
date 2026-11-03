import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createInterface} from 'node:readline'
import {CoordinationController} from '../src/v2/controller.ts'
import {setMembers,createTask,publishMemory,reviewTask} from '../src/v2/domain.ts'
const directory=await mkdtemp(join(tmpdir(),'openplex-v2-e2e-')),projectId='e2e-project',provider=process.argv[3].includes('claude')?'claude':'codex'
const pending=new Map(),calls=[],replies=[],workers=new Map()
let child,controller
function start(){
 child=spawn(process.argv[2],[directory,process.argv[3]],{stdio:['pipe','pipe','inherit']})
 createInterface({input:child.stdout}).on('line',line=>{const data=JSON.parse(line);if(data.event){controller?.event(data.event);replies.push(data.event)}else if(data.error&&data.key){controller?.event({key:data.key,kind:'error',text:data.error})}else{const p=pending.get(data.requestId);if(p){clearTimeout(p.timer);pending.delete(data.requestId);if(data.error)p.reject(Error(data.error));else p.resolve(data)}}})
}
function request(operation,values={}){return new Promise((resolve,reject)=>{const requestId=crypto.randomUUID(),timer=setTimeout(()=>reject(Error('Native bridge timed out')),10000);pending.set(requestId,{resolve,reject,timer});child.stdin.write(JSON.stringify({action:'coordination',operation,projectId,directory,requestId,...values})+'\n')})}
const io={load:async()=>request('load'),save:async(snapshot,state)=>request('save',{state,expectedRevision:snapshot.revision}),busy:()=>[],run:(envelope,key)=>{calls.push(envelope);workers.set(key,envelope.employeeId);child.stdin.write(JSON.stringify({action:'run',key,ownerKey:envelope.employeeId,taskId:envelope.taskId,runId:envelope.runId,projectId,directory,harness:provider,mcp:'{}',allowEdits:false,systemPrompt:'Fixture system',brief:'Employee: Test employee; isolated test worker',prompt:'STATUS_PROBE\n'+envelope.prompt})+'\n')},stop:key=>child.stdin.write(JSON.stringify({action:'stop',key})+'\n')}
async function waitUntil(check){const end=Date.now()+15000;while(!check()){assert.ok(Date.now()<end,'Timed out waiting for native result');await new Promise(r=>setTimeout(r,15))}}
async function stop(){const closed=new Promise(r=>child.once('close',r));child.stdin.end();await closed}
try{
 start();controller=new CoordinationController(projectId,io);await controller.load()
 await controller.change(s=>setMembers(s,[{id:'e2e-project:lead',name:'Lead',departmentId:'tech',role:'head'},{id:'e2e-project:a',name:'Alice',departmentId:'tech',role:'employee',reportsTo:'e2e-project:lead'},{id:'e2e-project:b',name:'Bob',departmentId:'marketing',role:'employee',reportsTo:'e2e-project:lead'}]))
 await controller.change(s=>publishMemory(s,{scope:'employee',scopeId:'e2e-project:b',authorId:'user',title:'Bob private',content:'private-canary',source:'test:private'}))
 await controller.change(s=>publishMemory(s,{scope:'project',scopeId:projectId,authorId:'user',title:'Shared evidence',content:'shared-canary',source:'test:reviewed'}))
 for(const assigneeId of ['e2e-project:a','e2e-project:b'])await controller.change(s=>createTask(s,{title:'Reason about a checklist',brief:'Return a short assumption and limitation.',assigneeId,idempotencyKey:assigneeId}))
 await controller.runReady()
 await waitUntil(()=>controller.activeCount===0&&controller.pending===0)
 assert.equal(calls.length,2);assert.ok(!calls.find(c=>c.employeeId==='e2e-project:a').prompt.includes('private-canary'));assert.ok(calls.every(c=>c.prompt.includes('shared-canary')))
 assert.ok(controller.snapshot.state.tasks.every(t=>t.status==='awaiting_review'));assert.ok(controller.snapshot.state.tasks.every(t=>/fixture/i.test(t.result)))
 // Duplicate native dispatch of an already consumed receipt is rejected.
 const first=calls[0]
 await assert.rejects(request('claim-run',{runId:first.runId,ownerKey:first.employeeId,taskId:first.taskId}),/claim|transaction/)
 const hits=await request('search',{query:'canary',actorId:'e2e-project:a'});assert.equal(hits.items.length,1);assert.equal(hits.items[0].scope,'project')
 for(const t of controller.snapshot.state.tasks)await controller.change(s=>reviewTask(s,t.id,true))
 const revision=controller.snapshot.revision;await request('backup');await stop()
 start();controller=new CoordinationController(projectId,io);await controller.load();assert.equal(controller.snapshot.revision,revision);assert.ok(controller.snapshot.state.tasks.every(t=>t.status==='completed'));assert.equal(calls.length,2)
 console.log(`V2 native end-to-end ${provider}: real LangGraph planning → SQLite claim → tool-free harness fixture → review → scoped FTS → backup → process restart passed; 0 paid model calls.`)
 await stop()
}finally{child?.kill();for(const p of pending.values())clearTimeout(p.timer);await rm(directory,{recursive:true,force:true})}
