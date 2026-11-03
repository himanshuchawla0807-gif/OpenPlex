import {cancelTask,parseCoordination,recoverInterrupted,settleTask,type CoordinationState} from './domain.ts'
import {prepareWork,type WorkEnvelope} from './workflow.ts'
import type {Snapshot} from './storage.ts'

export interface CoordinationIO {
 load:()=>Promise<Snapshot>
 save:(snapshot:Snapshot,next:CoordinationState)=>Promise<Snapshot>
 busy:()=>string[]
 run:(envelope:WorkEnvelope,key:string)=>void
 stop:(key:string)=>void
}
interface Attempt {envelope:WorkEnvelope;started:boolean;output:string;error?:string}
/** Serializes local commits. Neither a model response nor a native exit can approve work. */
export class CoordinationController {
 snapshot?:Snapshot
 error=''
 pending=0
 private tail:Promise<unknown>=Promise.resolve()
 private attempts=new Map<string,Attempt>()
 private listeners=new Set<()=>void>()
 readonly projectId:string
 private io:CoordinationIO
 constructor(projectId:string,io:CoordinationIO){this.projectId=projectId;this.io=io}
 subscribe(listener:()=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener)}}
 private notify(){for(const listener of this.listeners)listener()}
 private enqueue<T>(work:()=>Promise<T>):Promise<T>{
  this.pending++;this.notify()
  const result=this.tail.then(work)
  this.tail=result.catch(error=>{this.error=error instanceof Error?error.message:String(error)})
  return result.finally(()=>{this.pending--;this.notify()})
 }
 async load(){return this.enqueue(async()=>{
  if(this.attempts.size)throw Error('Stop this coordinator’s active attempts before reloading.')
  const snapshot=await this.io.load();const state=parseCoordination(snapshot.state,this.projectId)
  // Closing/reopening a view never authorizes repeating an ambiguous side effect.
  for(const task of state.tasks.filter(t=>t.status==='running'))if(task.runId)this.io.stop(`v2:${this.projectId}:${task.runId}`)
  const interrupted=state.tasks.some(t=>t.status==='running')
  this.snapshot=interrupted?await this.io.save(snapshot,recoverInterrupted(state)):snapshot
  this.error=''
 })}
 async change(transform:(state:CoordinationState)=>CoordinationState){return this.enqueue(async()=>{
  if(!this.snapshot)throw Error('Load a project before changing coordination state.')
  const next=parseCoordination(transform(this.snapshot.state),this.projectId)
  this.snapshot=await this.io.save(this.snapshot,next);this.error=''
 })}
 async runReady(){return this.enqueue(async()=>{
  if(!this.snapshot)throw Error('Load the coordinator first.')
  const {document,envelopes}=await prepareWork(this.snapshot.state,this.io.busy())
  if(!envelopes.length)throw Error('No runnable work: check dependencies, busy sessions and attempt budgets.')
  // No dispatch when the durable claim fails, including a revision conflict.
  this.snapshot=await this.io.save(this.snapshot,document);this.error=''
  for(const envelope of envelopes){
   const key=`v2:${this.projectId}:${envelope.runId}`
   this.attempts.set(key,{envelope,started:false,output:''})
   try{this.io.run(envelope,key)}catch(error){this.event({key,kind:'error',text:error instanceof Error?error.message:String(error)})}
  }
 })}
 event(value:unknown){
  if(!value||typeof value!=='object')return
  const d=value as Record<string,unknown>,key=String(d.key??''),attempt=this.attempts.get(key)
  if(!attempt)return
  if(d.kind==='started'){attempt.started=true;this.notify();return}
  if(d.kind==='answer'&&typeof d.text==='string')attempt.output=(attempt.output+'\n'+d.text).slice(-24000)
  if(d.kind==='error')attempt.error=String(d.text??'The harness failed.').slice(0,4000)
  if(d.kind==='finished'||d.kind==='error'&&!attempt.started){
   this.attempts.delete(key)
   const error=attempt.error||(d.kind==='finished'&&d.exitCode!==0?'The harness exited without a successful result.':undefined)
   void this.change(state=>settleTask(state,attempt.envelope.taskId,attempt.envelope.runId,{result:attempt.output.trim()||undefined,error,authorization:!!error&&/sign.in|authentication|permission|approval|credential|CLI was not found/i.test(error)})).catch(()=>{})
  }
 }
 async cancel(id:string){
  await this.change(state=>cancelTask(state,id))
  const tasks=this.snapshot!.state.tasks
  for(const [key,attempt] of this.attempts)if(tasks.find(t=>t.id===attempt.envelope.taskId)?.status==='cancelled')this.io.stop(key)
 }
 async expire(now=Date.now()){
  const expired=this.snapshot?.state.tasks.filter(t=>t.status==='running'&&t.leaseUntil!==undefined&&t.leaseUntil<=now)??[]
  if(!expired.length)return
  await this.change(state=>expired.reduce((s,t)=>settleTask(s,t.id,t.runId!,{error:'Execution timed out. Reconcile this attempt before retrying.'},now),state))
  for(const t of expired)this.io.stop(`v2:${this.projectId}:${t.runId}`)
 }
 get activeCount(){return this.attempts.size}
 get activeEmployees(){return [...new Set([...this.attempts.values()].map(a=>a.envelope.employeeId))]}
 shutdown(){for(const key of this.attempts.keys())this.io.stop(key)}
}
