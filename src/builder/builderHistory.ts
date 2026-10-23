import type {EmployeeProfile} from './employees'
export interface BuilderMessage {role:'user'|'assistant';text:string}
export const BUILDER_RETENTION_MS=30*24*60*60*1000
interface StorageLike {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void}
export function loadBuilderHistory(storage:StorageLike,key:string,now=Date.now()):BuilderMessage[]{
 try{
  const saved=storage.getItem(key+':conversation');if(!saved)return []
  const raw=JSON.parse(saved),legacy=Array.isArray(raw),messages=legacy?raw:raw.messages
  if(!legacy&&(!Number.isFinite(raw.updatedAt)||now-raw.updatedAt>BUILDER_RETENTION_MS)){storage.removeItem(key+':conversation');return []}
  const valid=Array.isArray(messages)?messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-40):[]
  if(legacy)saveBuilderHistory(storage,key,valid,now)
  return valid
 }catch{return []}
}
export function saveBuilderHistory(storage:StorageLike,key:string,messages:BuilderMessage[],now=Date.now()){
 storage.setItem(key+':conversation',JSON.stringify({version:1,updatedAt:now,messages:messages.slice(-40)}))
}
export function saveBuilderRevision(storage:StorageLike,key:string,profile:EmployeeProfile,now=Date.now()){
 let previous:{at:number;profile:EmployeeProfile}[]=[]
 try{const saved=JSON.parse(storage.getItem(key+':revisions')??'[]');if(Array.isArray(saved))previous=saved}catch{/* Begin a fresh revision list. */}
 if(JSON.stringify(previous.at(-1)?.profile)===JSON.stringify(profile))return
 storage.setItem(key+':revisions',JSON.stringify([...previous,{at:now,profile}].slice(-20)))
}
