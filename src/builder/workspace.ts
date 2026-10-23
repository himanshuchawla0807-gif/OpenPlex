import {arrangeFootprints} from '../procedural/roomLayout.ts'
import {employeeAllocation} from '../procedural/OfficePeople.ts'
import {officeDefinitions} from '../procedural/officeRooms.ts'
import type {OfficeDefinition} from '../procedural/model.ts'
import {employeeKey,parseProfile,type EmployeeProfile} from './employees.ts'
import {campusCast} from '../data/campusCast.ts'
export interface WorkspaceRoom {id:string;templateId:string;name:string;origin:{x:number;y:number};staff:number[]}
export interface OfficeProject {id:string;name:string;createdAt:string;updatedAt:string;staticLayout:boolean;rooms:WorkspaceRoom[];employeeProfiles?:Record<string,EmployeeProfile>;workingDirectory?:string;officeContext?:Record<string,string>;theme?:'modern'|'casual'}
export const STORAGE_KEY='small-office.projects.v1'
export const uid=()=>globalThis.crypto?.randomUUID?.()??`office-${Date.now()}-${Math.random().toString(36).slice(2)}`
export function arrangeRooms(rooms:WorkspaceRoom[]):WorkspaceRoom[]{return arrangeFootprints(rooms,officeDefinitions)}
export function createProject(name:string,preset=false,theme:'modern'|'casual'='modern'):OfficeProject{
 const date=new Date().toISOString()
 const rooms=preset?officeDefinitions.map((d,n)=>({id:uid(),templateId:d.id,name:d.name,origin:{...d.origin},staff:[...(employeeAllocation[n]??[])]})):[]
 return {...(theme==='casual'?{theme}:{}),id:uid(),name:name.trim()||'Untitled office',createdAt:date,updatedAt:date,staticLayout:true,rooms:arrangeRooms(rooms)}
}
export function addRoom(project:OfficeProject,templateId:string):OfficeProject{
 const template=officeDefinitions.find(d=>d.id===templateId);if(!template)return project
 const siblings=project.rooms.filter(r=>r.templateId===templateId).length
 const room:WorkspaceRoom={id:uid(),templateId,name:`${template.name}${siblings?` ${siblings+1}`:''}`,origin:{x:project.rooms.length?Math.max(...project.rooms.map(r=>r.origin.x))+29:0,y:0},staff:[]}
 const rooms=[...project.rooms,room];return {...project,rooms:project.staticLayout?arrangeRooms(rooms):rooms}
}
export function addEmployee(project:OfficeProject,roomId:string,index:number):OfficeProject{
 if(!Number.isInteger(index)||!campusCast[index]||project.rooms.some(room=>room.staff.includes(index)))return project
 return {...project,rooms:project.rooms.map(room=>{
 const capacity=officeDefinitions.find(d=>d.id===room.templateId)?.stations.length??0
 return room.id===roomId&&!room.staff.includes(index)&&room.staff.length<capacity?{...room,staff:[...room.staff,index]}:room
 })}
}
export function themeDefinition(template:OfficeDefinition,theme:'modern'|'casual'='modern',index=0):OfficeDefinition{
 if(theme==='modern')return template
 const colors=[{floor:'#e8d6c3',wall:'#f7e5cc',accent:'#b4795f'},{floor:'#e2d4dd',wall:'#f0e4ef',accent:'#977b9c'},{floor:'#d6dfd0',wall:'#eef0d8',accent:'#81966d'}],palette=colors[index%colors.length]
 return {...template,...palette,furniture:template.furniture.map(item=>({...item,...(item.kind==='chair'?{color:'#a77f91'}:item.kind==='rug'?{color:palette.floor}:['armchair','cabinet','displaytable'].includes(item.kind)?{color:palette.accent}:item.kind==='bench'?{color:'#f2d7b6'}:{})}))}
}
export function projectDefinitions(project:OfficeProject):Array<OfficeDefinition&{templateId:string}>{
 return project.rooms.flatMap((room,index)=>{const original=officeDefinitions.find(d=>d.id===room.templateId),template=original?themeDefinition(original,project.theme,index):undefined;return template?[{...template,id:room.id,templateId:template.id,name:room.name,origin:room.origin}]:[]})
}
/** Bound imports to the catalog and seat capacities; malformed saved data never
 * becomes an executable renderer definition. */
export function parseProjects(raw:string|null):OfficeProject[]{
 if(!raw)return []
 try {const value:unknown=JSON.parse(raw);if(!Array.isArray(value))return []
 const projectIds=new Set<string>()
 return value.slice(0,100).flatMap((p:unknown)=>{
 if(!p||typeof p!=='object')return [];const data=p as Partial<OfficeProject>
 if(typeof data.id!=='string'||!data.id.trim()||typeof data.name!=='string'||!Array.isArray(data.rooms))return []
 // Imported copies may share an ID. Preserve both projects without allowing an
 // edit, session key or removal in one to target the other.
 let projectId=data.id
 while(projectIds.has(projectId))projectId=uid()
 projectIds.add(projectId)
 const ids=new Set<string>(),assigned=new Set<number>(),newCeoRooms:WorkspaceRoom[]=[]
 const rooms=data.rooms.slice(0,100).flatMap((room:WorkspaceRoom)=>{
 let template=room&&officeDefinitions.find(d=>d.id===room.templateId)
 if(!template||typeof room.id!=='string'||!room.id.trim()||ids.has(room.id)||!Number.isFinite(room.origin?.x)||!Number.isFinite(room.origin?.y))return []
 ids.add(room.id)
 // Preserve legacy multi-person CEO rooms, profiles and session IDs as executive
 // teams; add an empty CEO office instead of silently dropping hired employees.
 if(template.id==='ceo-office'&&new Set(Array.isArray(room.staff)?room.staff.filter(index=>Number.isInteger(index)&&index>=0&&index<campusCast.length&&!assigned.has(index)):[]).size>1) {
   template=officeDefinitions.find(d=>d.id==='learning-room')!
   let id=uid();while(ids.has(id)||data.rooms!.some(r=>r?.id===id))id=uid();ids.add(id)
   newCeoRooms.push({id,templateId:'ceo-office',name:'CEO office',origin:{x:room.origin.x+template.width+3,y:room.origin.y},staff:[]})
 }
 return [{id:room.id,templateId:template.id,name:room.templateId==='ceo-office'&&template.id==='learning-room'?(room.name==='CEO office'?'Executive team':`${room.name||'Executive'} team`).slice(0,80):typeof room.name==='string'?room.name.slice(0,80):template.name,origin:{x:room.origin.x,y:room.origin.y},staff:Array.from(new Set(Array.isArray(room.staff)?room.staff.filter(index=>Number.isInteger(index)&&index>=0&&index<campusCast.length&&!assigned.has(index)):[])).slice(0,template.stations.length).map(index=>{assigned.add(index);return index})}]
 })
 rooms.push(...newCeoRooms)
 const profiles:Record<string,EmployeeProfile>=Object.fromEntries(rooms.flatMap(room=>room.staff.flatMap(index=>{
 const key=employeeKey(room.id,index),value=data.employeeProfiles&&Object.hasOwn(data.employeeProfiles,key)?data.employeeProfiles[key]:undefined;return value?[[key,parseProfile(value,index)]]:[]
 })))
 const extras={...(data.theme==='casual'||data.theme==='modern'?{theme:data.theme}:{}),...(Object.keys(profiles).length?{employeeProfiles:profiles}:{}),...(typeof data.workingDirectory==='string'?{workingDirectory:data.workingDirectory.slice(0,4096)}:{}),...(data.officeContext&&typeof data.officeContext==='object'?{officeContext:Object.fromEntries(rooms.flatMap(room=>typeof data.officeContext?.[room.id]==='string'?[[room.id,data.officeContext[room.id].slice(0,100000)]]:[]))}:{})}
 const staticLayout=data.staticLayout!==false
 return [{...extras,id:projectId,name:data.name.slice(0,80).trim()||'Untitled office',createdAt:typeof data.createdAt==='string'?data.createdAt:new Date().toISOString(),updatedAt:typeof data.updatedAt==='string'?data.updatedAt:new Date().toISOString(),staticLayout,rooms:staticLayout?arrangeRooms(rooms):rooms}]
 })}catch{return []}
}
