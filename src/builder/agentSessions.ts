import {useEffect,useState} from 'react'
export interface AgentMessage {role:'user'|'agent'|'event';text:string}
export interface AgentSession {threadId?:string;status:'idle'|'running'|'complete'|'attention';messages:AgentMessage[];active?:boolean;taskCount?:number;completedCount?:number;lastTask?:string;startedAt?:number;finishedAt?:number}
export type AgentSessions=Record<string,AgentSession>
interface NativeWindow extends Window {webkit?:{messageHandlers?:{openplex?:{postMessage:(data:unknown)=>void}}}}
export const nativeAvailable=()=>typeof window!=='undefined'&&typeof (window as NativeWindow).webkit?.messageHandlers?.openplex?.postMessage==='function'
export function nativeCommand(data:unknown){
 if(typeof window==='undefined')return
 try{
  const bridge=(window as NativeWindow).webkit?.messageHandlers?.openplex
  if(!bridge||typeof bridge.postMessage!=='function')throw new Error('The native task connection is unavailable. Reopen this workspace in the Mac app.')
  bridge.postMessage(data)
 }catch(error){
  const command=data&&typeof data==='object'?data as Record<string,unknown>:undefined
  if(command&&typeof command.key==='string')window.dispatchEvent(new CustomEvent(String(command.action).startsWith('terminal-')?'openplex-terminal':'openplex-agent',{detail:{key:command.key,kind:'error',message:error instanceof Error?error.message:'The native command could not be sent.',text:error instanceof Error?error.message:'The native task command could not be sent.'}}))
 }
}
const KEY='openplex.agent-sessions.v1'
const count=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:0
const timestamp=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:undefined
const validKey=(key:unknown):key is string=>typeof key==='string'&&key.length>0&&key.length<400&&!['__proto__','constructor','prototype'].includes(key)
function boundedMessages(value:unknown):AgentMessage[]{
 if(!Array.isArray(value))return []
 const messages:AgentMessage[]=[];let remaining=120000
 for(const raw of value.slice(-100).reverse()){
  if(!raw||typeof raw!=='object'||!['user','agent','event'].includes(raw.role)||typeof raw.text!=='string')continue
  const text=raw.text.slice(0,Math.min(30000,remaining));if(!text)continue
  messages.push({role:raw.role,text});remaining-=text.length;if(!remaining)break
 }
 return messages.reverse()
}
export function parseAgentSessions(value:unknown):AgentSessions{
 if(!value||typeof value!=='object'||Array.isArray(value))return {}
 return Object.fromEntries(Object.entries(value).slice(-200).flatMap(([key,raw])=>{
  if(!validKey(key)||!raw||typeof raw!=='object'||Array.isArray(raw))return []
  const s=raw as AgentSession
  return [[key,{threadId:typeof s.threadId==='string'&&s.threadId.length<=100?s.threadId:undefined,status:s.status==='running'||s.status==='attention'?'attention':s.status==='complete'?'complete':'idle',messages:boundedMessages(s.messages),taskCount:count(s.taskCount),completedCount:Math.min(count(s.completedCount),count(s.taskCount)),lastTask:typeof s.lastTask==='string'?s.lastTask.slice(0,100000):undefined,startedAt:timestamp(s.startedAt),finishedAt:timestamp(s.finishedAt)}]]
 }))
}
function load():AgentSessions{try{return parseAgentSessions(JSON.parse(localStorage.getItem(KEY)??'{}'))}catch{return {}}}
export function beginAgentTask(all:AgentSessions,key:string,text:string,now=Date.now()):AgentSessions{
 if(!validKey(key)||!text.trim()||all[key]?.status==='running'||all[key]?.active)return all
 return {...all,[key]:{...all[key],active:false,status:'running',taskCount:count(all[key]?.taskCount)+1,completedCount:count(all[key]?.completedCount),lastTask:text.slice(0,100000),startedAt:now,finishedAt:undefined,messages:boundedMessages([...(all[key]?.messages??[]),{role:'user',text}])}}
}
export function resetAgentSession(all:AgentSessions,key:string):AgentSessions{
 return !validKey(key)||all[key]?.status==='running'||all[key]?.active?all:{...all,[key]:{status:'idle',messages:[],taskCount:count(all[key]?.taskCount),completedCount:count(all[key]?.completedCount),lastTask:all[key]?.lastTask,startedAt:all[key]?.startedAt,finishedAt:all[key]?.finishedAt}}
}
export function receiveAgentEvent(all:AgentSessions,detail:unknown,now=Date.now()):AgentSessions{
 if(!detail||typeof detail!=='object')return all
 const d=detail as Record<string,unknown>
 if(!validKey(d.key)||!Object.hasOwn(all,d.key)||!['started','finished','error','session','answer','output'].includes(String(d.kind)))return all
 const old=all[d.key]
 // A reset or already finished conversation must not receive delayed output.
 if(old.status!=='running'&&!old.active)return all
 const messages=boundedMessages([...old.messages,...(typeof d.text==='string'&&d.text?[{role:d.kind==='answer'?'agent':'event',text:d.text}]:[])])
 const status=d.kind==='started'?'running':d.kind==='finished'?(d.exitCode===0?'complete':'attention'):d.kind==='error'&&!old.active?'attention':old.status
 // A streamed turn error is not process termination. Keep Stop available until
 // the native runtime drains stdout/stderr and reports its final exit status.
 const active=d.kind==='started'?true:d.kind==='finished'?false:old.active
 const threadId=d.kind==='session'&&typeof d.threadId==='string'&&d.threadId.length>0&&d.threadId.length<=100?d.threadId:old.threadId
 return {...all,[d.key]:{...old,status,active,threadId,messages,...(d.kind==='finished'||(d.kind==='error'&&!old.active)?{finishedAt:now}:{}),...(d.kind==='finished'&&d.exitCode===0?{completedCount:count(old.completedCount)+1}:{})}}
}
export function useAgentSessions(){
 const [sessions,setSessions]=useState<AgentSessions>(load)
 const [saveError,setSaveError]=useState(false)
 useEffect(()=>{let cancelled=false;queueMicrotask(()=>{if(cancelled)return;try{localStorage.setItem(KEY,JSON.stringify(sessions));setSaveError(false)}catch{setSaveError(true)}});return ()=>{cancelled=true}},[sessions])
 useEffect(()=>{
  const event=(event:Event)=>setSessions(all=>receiveAgentEvent(all,(event as CustomEvent).detail))
  window.addEventListener('openplex-agent',event);return ()=>window.removeEventListener('openplex-agent',event)
 },[])
 const begin=(key:string,text:string)=>setSessions(all=>beginAgentTask(all,key,text))
 const reset=(key:string)=>setSessions(all=>resetAgentSession(all,key))
 return {sessions,begin,reset,saveError}
}
