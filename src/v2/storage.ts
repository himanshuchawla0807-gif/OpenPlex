import {nativeAvailable,nativeCommand} from '../builder/agentSessions.ts'
import {parseCoordination,type CoordinationState,type MemoryRecord} from './domain.ts'
export interface Snapshot {state:CoordinationState;revision:number}
export function coordinationRequest(projectId:string,directory:string,operation:string,values:Record<string,unknown>={}):Promise<Record<string,unknown>> {
 if(!nativeAvailable())return Promise.reject(new Error('Durable coordination requires the v2 Mac app and an authorized local folder.'))
 return new Promise((resolve,reject)=>{
  const requestId=crypto.randomUUID()
  const finish=(error?:Error,value?:Record<string,unknown>)=>{clearTimeout(timer);window.removeEventListener('openplex-coordination',receive);if(error)reject(error);else resolve(value!)}
  const receive=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.requestId!==requestId||d.projectId!==projectId)return;if(d.error)finish(new Error(String(d.error)));else finish(undefined,d)}
  const timer=setTimeout(()=>finish(new Error('The local coordinator did not respond. Reopen the v2 Mac app; no work was submitted.')),15000)
  window.addEventListener('openplex-coordination',receive)
  nativeCommand({action:'coordination',operation,projectId,directory,requestId,...values})
 })
}
export async function loadCoordination(projectId:string,directory:string):Promise<Snapshot>{const r=await coordinationRequest(projectId,directory,'load');return {state:parseCoordination(r.state,projectId),revision:Number(r.revision)}}
export async function saveCoordination(snapshot:Snapshot,directory:string,next:CoordinationState):Promise<Snapshot>{const state=parseCoordination(next,snapshot.state.projectId);const r=await coordinationRequest(state.projectId,directory,'save',{state,expectedRevision:snapshot.revision});return {state:parseCoordination(r.state,state.projectId),revision:Number(r.revision)}}
export async function searchKnowledge(projectId:string,directory:string,query:string,actorId?:string):Promise<MemoryRecord[]>{const r=await coordinationRequest(projectId,directory,'search',{query,...(actorId?{actorId}:{})});return r.items as MemoryRecord[]}
