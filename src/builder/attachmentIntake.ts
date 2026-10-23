import {readBuilderReply} from './builderProtocol.ts'
import type {ChatAttachment} from './attachments'
import type {EmployeeProfile} from './employees'
/** Deterministically retain recognizable supplied configuration before model edits. */
export function intakeAttachments(profile:EmployeeProfile,files:ChatAttachment[]):EmployeeProfile {
 let result=profile
 for(const file of files){
  let patch:Record<string,unknown>|undefined
  if(/\.json$/i.test(file.name)){
   try{const raw=JSON.parse(file.text);if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    if(raw.mcpServers&&typeof raw.mcpServers==='object'&&!Array.isArray(raw.mcpServers))patch={mcp:JSON.stringify(raw.mcpServers)}
    else if(/mcp/i.test(file.name)&&Object.values(raw).every(v=>v&&typeof v==='object'&&('command' in v||'url' in v)))patch={mcp:JSON.stringify(raw)}
    else if(['instructions','skills','plugins','mcp'].some(k=>Object.hasOwn(raw,k)))patch=Object.fromEntries(Object.entries(raw).filter(([k])=>['instructions','skills','plugins','mcp'].includes(k)))
   }}catch{/* Non-configuration JSON remains model reference material. */}
  }
  if(!patch&&/\.md$/i.test(file.name)){
   const name=file.text.match(/^---\s*\n[\s\S]*?^name:\s*["']?([^\n"']+)/m)?.[1]?.trim()
   const key=name||/skill/i.test(file.name)?'skills':/plugin/i.test(file.name)?'plugins':'instructions'
   patch={[key]:[{name:name?`${name}.md`:file.name,content:file.text}]}
  }
  if(patch)result=readBuilderReply(JSON.stringify({reply:'Supplied configuration retained for review.',profile:patch}),result).profile
 }
 return result
}
