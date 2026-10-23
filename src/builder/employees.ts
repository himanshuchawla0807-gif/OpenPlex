import {campusCast} from '../data/campusCast.ts'
export interface EmployeeFile {name:string;content:string}
import {validHarness,type EmployeeHarness} from './harnesses.ts'
export type {EmployeeHarness} from './harnesses.ts'
export interface EmployeeProfile {harness:EmployeeHarness;name:string;role:string;systemPrompt:string;instructions:EmployeeFile[];skills:EmployeeFile[];mcp:string;plugins:EmployeeFile[]}
export const employeeKey=(roomId:string,index:number)=>`${roomId}:${campusCast[index]?.id??index}`
export function defaultProfile(index:number):EmployeeProfile{
 const character=campusCast[index]??campusCast[0]
 return {harness:'codex',name:character.name,role:character.title,systemPrompt:`You are ${character.name}, an agent specializing in ${character.specialties.join(' and ')}. ${character.description}\nBe clear about your progress, ask when necessary, and verify your work.`,instructions:[],skills:[],mcp:'{}',plugins:[]}
}
export function parseProfile(value:unknown,index:number):EmployeeProfile{
 const fallback=defaultProfile(index),p=value&&typeof value==='object'?value as Partial<EmployeeProfile>:{}
 const text=(v:unknown,max:number,otherwise='')=>typeof v==='string'?v.slice(0,max):otherwise
 const files=(v:unknown):EmployeeFile[]=>Array.isArray(v)?v.slice(0,20).flatMap(file=>file&&typeof file==='object'&&typeof file.name==='string'&&typeof file.content==='string'?[{name:Array.from(file.name as string).filter(c=>c.charCodeAt(0)>31&&c.charCodeAt(0)!==127).join('').replace(/[\\/]/g,'_').slice(0,100),content:file.content.slice(0,100000)}]:[]):[]
 return {harness:validHarness(p.harness)?p.harness:'codex',name:text(p.name,80,fallback.name).trim()||fallback.name,role:text(p.role,120,fallback.role),systemPrompt:text(p.systemPrompt,24000,fallback.systemPrompt),instructions:files(p.instructions),skills:files(p.skills),mcp:text(p.mcp,100000,'{}'),plugins:files(p.plugins)}
}
export function profileError(profile:EmployeeProfile):string|null{
 if(!validHarness(profile.harness))return 'Choose an employee harness from the catalog.'
 if(!profile.name.trim())return 'Give your employee a name.'
 try{
  const config=JSON.parse(profile.mcp)
  if(!config||typeof config!=='object'||Array.isArray(config))return 'MCP configuration must be a JSON object.'
  for(const [name,server] of Object.entries(config)){
   if(['__proto__','prototype','constructor'].includes(name)||!/^[A-Za-z0-9_-]{1,80}$/.test(name))return 'MCP server names must contain 1–80 letters, numbers, underscores or hyphens.'
   if(!server||typeof server!=='object'||Array.isArray(server))return `MCP server “${name}” must be a configuration object.`
   const value=server as Record<string,unknown>
   if(typeof value.command!=='string'&&typeof value.url!=='string')return `MCP server “${name}” needs a command or URL.`
   if(value.command!==undefined&&(typeof value.command!=='string'||!value.command.trim()||value.command.includes('\0')))return `MCP server “${name}” has an invalid command.`
   if(value.args!==undefined&&(!Array.isArray(value.args)||value.args.some(a=>typeof a!=='string'||a.includes('\0'))))return `MCP server “${name}” arguments must be text.`
   if(value.env!==undefined&&(!value.env||typeof value.env!=='object'||Array.isArray(value.env)||Object.values(value.env).some(v=>typeof v!=='string')))return `MCP server “${name}” environment values must be text.`
   if(value.url!==undefined){try{const url=new URL(String(value.url));if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error()}catch{return `MCP server “${name}” needs an HTTP(S) URL without embedded credentials.`}}

  }
 }catch{return 'MCP configuration must be valid JSON.'}
 if(new TextEncoder().encode(employeeBrief(profile)).length>1000000)return 'Employee references are too large for a work session. Shorten the instructions, skills or plugin references.'
 return null
}
export function employeeBrief(profile:EmployeeProfile):string{
 const section=(title:string,files:EmployeeFile[])=>files.length?`\n\n${title}\n${files.map(f=>`--- ${f.name} ---\n${f.content}`).join('\n\n')}`:''
 return `Employee: ${profile.name}\nRole: ${profile.role}\n\n${profile.systemPrompt}${section('Instruction files',profile.instructions)}${section('Skill references',profile.skills)}${section('Plugin references (configuration only; not installed automatically)',profile.plugins)}`
}
