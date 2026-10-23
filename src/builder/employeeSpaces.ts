import {campusCast} from '../data/campusCast.ts'
import {employeeKey,defaultProfile} from './employees.ts'
import type {OfficeProject} from './workspace.ts'
export const SPACE_KEY='openplex.employee-spaces.v1'
export interface EmployeeSpace {id:string;name:string;keys:string[]}
export function hiredEmployees(projects:OfficeProject[],projectId?:string){return projects.filter(project=>!projectId||project.id===projectId).flatMap(project=>project.rooms.flatMap(room=>room.staff.flatMap(index=>campusCast[index]?[{key:`${project.id}:${employeeKey(room.id,index)}`,index,project,room,profile:project.employeeProfiles?.[employeeKey(room.id,index)]??defaultProfile(index)}]:[])))}
export type HiredEmployee=ReturnType<typeof hiredEmployees>[number]
export function parseSpaces(raw:unknown):EmployeeSpace[]{
 if(!Array.isArray(raw))return []
 const ids=new Set<string>()
 return raw.slice(0,50).flatMap(s=>{if(!s||typeof s!=='object'||typeof s.id!=='string'||!s.id||s.id.length>100||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||!Array.isArray(s.keys))return [];ids.add(s.id);return [{id:s.id,name:s.name.trim().slice(0,60),keys:[...new Set(s.keys.filter((key:unknown):key is string=>typeof key==='string'&&key.length>0&&key.length<400))].slice(0,200) as string[]}]})
}
export function pageEmployees<T>(items:T[],page:number,size=6){size=Math.min(8,Math.max(1,Math.floor(size)||6));const pages=Math.max(1,Math.ceil(items.length/size));const current=Math.min(pages-1,Math.max(0,Number.isInteger(page)?page:0));return {pages,page:current,items:items.slice(current*size,current*size+size)}}

export function gridRows(count:number):number[]{
 const n=Math.min(8,Math.max(0,Math.floor(count)))
 return n<=3?[n]:[Math.ceil(n/2),Math.floor(n/2)]
}
