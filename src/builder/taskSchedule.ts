import {useEffect,useRef,useState} from 'react'
import {nativeAvailable,type AgentSessions} from './agentSessions.ts'
export type ScheduledTaskStatus='pending'|'running'|'completed'|'attention'|'cancelled'
export interface ScheduledTask {id:string;key:string;prompt:string;dueAt:number;status:ScheduledTaskStatus;createdAt:number;startedAt?:number;finishedAt?:number;error?:string}
export const TASK_SCHEDULE_KEY='openplex.task-schedule.v1'
const maxTasks=500
const positiveTime=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0
const validKey=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<400&&!['__proto__','constructor','prototype'].includes(value)
const validPrompt=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=100000
export function parseTaskSchedule(value:unknown):ScheduledTask[]{
 if(!Array.isArray(value))return []
 const ids=new Set<string>()
 return value.slice(0,maxTasks).flatMap(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.id!=='string'||!/^[-_a-zA-Z0-9]{1,100}$/.test(raw.id)||ids.has(raw.id)||!validKey(raw.key)||!validPrompt(raw.prompt)||!positiveTime(raw.dueAt)||!positiveTime(raw.createdAt)||!['pending','running','completed','attention','cancelled'].includes(raw.status))return []
  ids.add(raw.id)
  return [{id:raw.id,key:raw.key,prompt:raw.prompt,dueAt:raw.dueAt,createdAt:raw.createdAt,status:raw.status==='running'?'attention':raw.status,startedAt:positiveTime(raw.startedAt)?raw.startedAt:undefined,finishedAt:positiveTime(raw.finishedAt)?raw.finishedAt:undefined,error:raw.status==='running'?'The app closed while this task was running. Check the employee session before scheduling it again.':typeof raw.error==='string'?raw.error.slice(0,1000):undefined} as ScheduledTask]
 })
}
export function addScheduledTask(tasks:ScheduledTask[],task:ScheduledTask):ScheduledTask[]{
 if(tasks.length>=maxTasks||tasks.some(t=>t.id===task.id)||task.status!=='pending'||parseTaskSchedule([task]).length!==1)return tasks
 return [...tasks,task]
}
export function cancelScheduledTask(tasks:ScheduledTask[],id:string,now=Date.now()):ScheduledTask[]{
 return tasks.map(t=>t.id===id&&t.status==='pending'?{...t,status:'cancelled',finishedAt:now}:t)
}
export function dueScheduledTasks(tasks:ScheduledTask[],sessions:AgentSessions,canRun:(key:string)=>boolean,now=Date.now()):ScheduledTask[]{
 const busy=new Set(tasks.filter(t=>t.status==='running').map(t=>t.key)),due:ScheduledTask[]=[]
 for(const task of [...tasks].sort((a,b)=>a.dueAt-b.dueAt||a.createdAt-b.createdAt)){
  if(task.status!=='pending'||task.dueAt>now||busy.has(task.key)||sessions[task.key]?.status==='running'||sessions[task.key]?.active||!canRun(task.key))continue
  busy.add(task.key);due.push(task)
 }
 return due
}
export function settleScheduledTasks(tasks:ScheduledTask[],sessions:AgentSessions):ScheduledTask[]{
 return tasks.map(task=>{
  const session=sessions[task.key]
  if(task.status!=='running'||!task.startedAt||!session?.finishedAt||session.finishedAt<task.startedAt||session.lastTask!==task.prompt||!['complete','attention'].includes(session.status))return task
  return {...task,status:session.status==='complete'?'completed':'attention',finishedAt:session.finishedAt} as ScheduledTask
 })
}
interface ScheduleOptions {sessions:AgentSessions;canRun:(key:string)=>boolean;doRun:(key:string,prompt:string)=>boolean}
export function useTaskSchedule(options:ScheduleOptions){
 const [tasks,setTasks]=useState<ScheduledTask[]>(()=>{try{return parseTaskSchedule(JSON.parse(localStorage.getItem(TASK_SCHEDULE_KEY)??'[]'))}catch{return []}})
 const [saveError,setSaveError]=useState(false)
 const current=useRef(tasks),latest=useRef(options)
 // Effects and callbacks consult the latest synchronous queue, including a claim
 // made earlier in this same tick, before React commits its next render.
 const save=(next:ScheduledTask[])=>{
  try{localStorage.setItem(TASK_SCHEDULE_KEY,JSON.stringify(next));setSaveError(false);current.current=next;setTasks(next);return true}catch{setSaveError(true);return false}
 }
 const saver=useRef(save)
 useEffect(()=>{latest.current=options;saver.current=save})
 useEffect(()=>{saver.current(current.current)},[])
 useEffect(()=>{
  const settled=settleScheduledTasks(current.current,options.sessions)
  if(settled.some((t,i)=>t!==current.current[i]))saver.current(settled)
 },[options.sessions])
 useEffect(()=>{
  const tick=()=>{
   if(!nativeAvailable())return
   const {sessions,canRun,doRun}=latest.current
   for(const due of dueScheduledTasks(current.current,sessions,canRun)){
    // Persist the claim BEFORE launching. A storage failure never launches work.
    // On restart a persisted running claim becomes attention, never an auto retry.
    const startedAt=Date.now(),claim=current.current.map(t=>t.id===due.id?{...t,status:'running' as const,startedAt}:t)
    if(!saver.current(claim))return
    try{if(doRun(due.key,due.prompt))continue}catch{/* Present a recoverable failure below. */}
    saver.current(current.current.map(t=>t.id===due.id?{...t,status:'attention',finishedAt:Date.now(),error:'The task could not start. Check the employee profile and authorized project folder.'}:t))
   }
  }
  const timer=window.setInterval(tick,1000)
  return ()=>window.clearInterval(timer)
 },[])
 const add=(key:string,prompt:string,dueAt:number):ScheduledTask|null=>{
  const task:ScheduledTask={id:crypto.randomUUID(),key,prompt:prompt.trim(),dueAt,status:'pending',createdAt:Date.now()}
  const next=addScheduledTask(current.current,task)
  return next!==current.current&&saver.current(next)?task:null
 }
 const cancel=(id:string)=>saver.current(cancelScheduledTask(current.current,id))
 return {tasks,add,cancel,saveError}
}
