import {test} from 'node:test'
import assert from 'node:assert/strict'
import {beginAgentTask,nativeAvailable,nativeCommand,parseAgentSessions,receiveAgentEvent,resetAgentSession} from './agentSessions.ts'
const key='project:room:oscar'
const event=(sessions,kind,extra={})=>receiveAgentEvent(sessions,{key,kind,...extra})
test('active errors retain Stop and block reset until native termination',()=>{
 let state=beginAgentTask({},key,'Task')
 state=event(state,'started')
 state=event(state,'error',{text:'Turn failed'})
 assert.equal(state[key].status,'running')
 assert.equal(resetAgentSession(state,key),state)
 assert.equal(beginAgentTask(state,key,'Another task'),state)
 state=event(state,'finished',{exitCode:1})
 assert.equal(state[key].status,'attention')
 assert.equal(state[key].active,false)
 assert.equal(resetAgentSession(state,key)[key].status,'idle')
})
test('launch failure needs attention without falsely retaining a process',()=>{
 const state=event(beginAgentTask({},key,'Task'),'error',{text:'CLI missing'})
 assert.equal(state[key].status,'attention')
 assert.equal(state[key].active,false)
})
test('employees keep separate transcript and resume identity',()=>{
 let state=beginAgentTask({},key,'Task A')
 state=beginAgentTask(state,'other','Task B')
 state=event(state,'started')
 state=event(state,'session',{threadId:'thread-a'})
 state=event(state,'answer',{text:'Answer A',threadId:'not-a-session-event'})
 state=event(state,'finished',{exitCode:0})
 assert.equal(state[key].threadId,'thread-a')
 assert.deepEqual(state.other.messages,[{role:'user',text:'Task B'}])
 state=beginAgentTask(state,key,'Follow up')
 assert.equal(state[key].threadId,'thread-a')
 assert.deepEqual(state[key].messages.map(m=>m.text),['Task A','Answer A','Follow up'])
})
test('unknown, malformed and delayed bridge messages cannot revive cleared sessions',()=>{
 let state=beginAgentTask({},key,'Task')
 for(const detail of [null,{}, {key:'unknown',kind:'started'}, {key,kind:'made-up'}, {key:'__proto__',kind:'started'}])assert.equal(receiveAgentEvent(state,detail),state)
 state=event(state,'finished',{exitCode:0})
 state=resetAgentSession(state,key)
 assert.equal(event(state,'answer',{text:'Late answer'}),state)
 assert.equal(event(state,'started'),state)
})
test('stored running tasks recover as attention and discard unsafe object data',()=>{
 const parsed=parseAgentSessions(JSON.parse('{"__proto__":{"status":"running"},"valid":{"status":"running","active":true,"threadId":"saved","messages":[null,{"role":"user","text":"Hello","extra":"ignored"},{"role":"bad","text":"no"}]}}'))
 assert.deepEqual(Object.keys(parsed),['valid'])
 assert.equal(parsed.valid.status,'attention')
 assert.equal(parsed.valid.active,undefined)
 assert.deepEqual(parsed.valid.messages,[{role:'user',text:'Hello'}])
 assert.equal(parsed.valid.threadId,'saved')
 assert.deepEqual(parseAgentSessions([]),{})
})
test('transcript text and retention remain bounded during streaming and reload',()=>{
 let state=beginAgentTask({},key,'Task')
 state=event(state,'started')
 for(let i=0;i<110;i++)state=event(state,'output',{text:'x'.repeat(40000)})
 assert.ok(state[key].messages.length<=100)
 assert.ok(state[key].messages.every(m=>m.text.length<=30000))
 assert.ok(state[key].messages.reduce((sum,m)=>sum+m.text.length,0)<=120000)
 assert.deepEqual(parseAgentSessions(state)[key].messages,state[key].messages)
})

test('a failed bridge dispatch reports launch failure instead of stranding Working',()=>{
 const previous=globalThis.window
 try{
  const target=new EventTarget()
  target.webkit={messageHandlers:{openplex:{postMessage(){throw new Error('Bridge disconnected')}}}}
  globalThis.window=target
  let state=beginAgentTask({},key,'Task')
  target.addEventListener('openplex-agent',e=>{state=receiveAgentEvent(state,e.detail)})
  assert.equal(nativeAvailable(),true)
  nativeCommand({action:'run',key})
  assert.equal(state[key].status,'attention')
  assert.equal(state[key].messages.at(-1).text,'Bridge disconnected')
  target.webkit.messageHandlers.openplex={}
  assert.equal(nativeAvailable(),false)
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

test('task statistics use actual submissions and terminal results without percentages',()=>{
 let state=beginAgentTask({},key,'First task',1000)
 assert.equal(state[key].taskCount,1)
 assert.equal(state[key].startedAt,1000)
 assert.equal(beginAgentTask(state,key,'Duplicate',1001),state)
 state=receiveAgentEvent(state,{key,kind:'started'},1100)
 state=receiveAgentEvent(state,{key,kind:'finished',exitCode:0},2000)
 assert.equal(state[key].completedCount,1)
 assert.equal(state[key].finishedAt,2000)
 assert.equal(receiveAgentEvent(state,{key,kind:'finished',exitCode:0},2100),state)
 state=resetAgentSession(state,key)
 assert.equal(state[key].taskCount,1)
 assert.equal(state[key].completedCount,1)
 state=beginAgentTask(state,key,'Second task',3000)
 assert.equal(state[key].lastTask,'Second task')
 assert.equal(state[key].taskCount,2)
 assert.equal(state[key].finishedAt,undefined)
 state=receiveAgentEvent(state,{key,kind:'error',text:'Could not launch'},3100)
 assert.equal(state[key].completedCount,1)
 assert.equal(state[key].finishedAt,3100)
 const restored=parseAgentSessions(state)[key]
 assert.equal(restored.taskCount,2)
 assert.equal(restored.completedCount,1)
 assert.equal(restored.startedAt,3000)
})
