import {campusCast} from '../data/campusCast.ts'
import {officeDefinitions} from '../procedural/officeRooms.ts'
import {defaultProfile,employeeKey} from './employees.ts'
import {arrangeRooms,parseProjects,STORAGE_KEY,type OfficeProject,type WorkspaceRoom} from './workspace.ts'
import type {AgentSessions} from './agentSessions.ts'
import type {ConversationMessage} from './conversation.ts'

export const RECORDING_PROJECT_ID='openplex-recording-v1'
const SESSION_KEY='openplex.agent-sessions.v1'
const demoNotice='Recording sandbox: all project progress below is fictional demonstration data. No real work has been performed.'
const briefs:Record<string,[string,string,string]>={
 'connected-office':['Coordinate the OpenPlex launch','The launch checklist and owners are drafted.','Align the final walkthrough with the department leads.'],
 'collaboration-suite':['Review the first-run setup','The setup flow and acceptance checklist are drafted.','Review the remaining terminal reconnect edge cases.'],
 'research-lab':['Summarize early user questions','The interview themes are organized into three clear needs.','Compare those needs against the onboarding copy.'],
 'design-studio':['Polish the workspace experience','The panel layout and light-theme review are drafted.','Review narrow-screen spacing and keyboard focus.'],
 'team-lounge':['Prepare the product walkthrough','The storyboard and feature order are drafted.','Refine the terminal-to-chat demonstration.'],
 'marketing-studio':['Shape the launch message','The audience, product promise and announcement draft are outlined.','Prepare a concise introduction for first-time visitors.'],
 'operations-hub':['Organize the release evidence','The checks, owner list and release notes are organized.','Collect the final review decisions in one place.'],
 'people-studio':['Prepare teammate onboarding','The role templates and onboarding checklist are drafted.','Review the first task for each department.'],
 'learning-room':['Review department priorities','The priorities and dependencies are mapped.','Resolve the next launch-review checkpoint.'],
 'strategy-room':['Review the launch scope','The launch goals and trade-offs are documented.','Keep the first release focused on the core workflow.'],
 'context-skills-office':['Organize employee reference material','The instruction and skill reference outline is drafted.','Review naming and keep the context concise.'],
 'ceo-office':['Coordinate the product launch','The department briefs are aligned and the release priorities are outlined.','Review the final setup experience before the demo handoff.'],
}

/** A separate, repeatable recording sandbox. It never starts a harness. */
export function createRecordingProject(directory=''):OfficeProject{
 const now=new Date().toISOString()
 const templates=[...officeDefinitions,...['collaboration-suite','research-lab','design-studio'].map(id=>officeDefinitions.find(d=>d.id===id)!)]
 const rooms:WorkspaceRoom[]=templates.map((template,n)=>({id:`recording-room-${n+1}`,templateId:template.id,name:n<officeDefinitions.length?template.name:`${template.name} · project team`,origin:{x:0,y:0},staff:[]}))
 const ceo=rooms.find(r=>r.templateId==='ceo-office')!,main=rooms.find(r=>r.templateId==='connected-office')!
 const oscar=campusCast.findIndex(c=>c.id==='oscar')
 ceo.staff.push(oscar)
 const remaining=campusCast.map((_,index)=>index).filter(index=>index!==oscar)
 main.staff.push(...remaining.splice(0,12))
 const departments=rooms.filter(room=>room!==main&&room!==ceo)
 // Every room has people; the main office remains the busiest room.
 for(let n=0;remaining.length;n++)departments[n%departments.length].staff.push(remaining.shift()!)
 const project:OfficeProject={id:RECORDING_PROJECT_ID,name:'OpenPlex · recording sandbox',createdAt:now,updatedAt:now,staticLayout:true,rooms:arrangeRooms(rooms),employeeProfiles:{},officeContext:{},...(directory?{workingDirectory:directory}:{})}
 for(const room of project.rooms){
  const [task,completed,next]=briefs[room.templateId]
  project.officeContext![room.id]=`${demoNotice}\nProject: OpenPlex launch walkthrough.\nDepartment task: ${task}.\nFictional progress: ${completed}\nNext: ${next}\nDo not use tools, read files, edit files, run commands, delegate or publish. Only discuss this demonstration scenario.`
  for(const index of room.staff){
   const profile=defaultProfile(index)
   profile.systemPrompt+=`\n\n${demoNotice}\nYou are participating in a product walkthrough. Answer in a natural first-person voice about the fictional task assigned below. Clearly keep the scenario fictional; never claim that real tests, changes, research or deployments happened. Do not use tools, commands, files, MCP servers, plugins or delegation. Keep ordinary replies to 2–4 sentences; status updates may be 100–150 words.\nTask: ${task}.\nFictional completed work: ${completed}\nFictional next step: ${next}`
   profile.instructions=[{name:'recording-scenario.md',content:`# Fictional product walkthrough\n\n${project.officeContext![room.id]}\n\nWhen asked for progress, describe the assigned fictional work, the supplied completed milestones and the next step. If a question requires facts outside this brief, say they are not available in the demo. No real work is authorized by this scenario.`}]
   project.employeeProfiles![employeeKey(room.id,index)]=profile
  }
 }
 return project
}

export function recordingConversation(project:OfficeProject,room:WorkspaceRoom,index:number):ConversationMessage[]{
 const [task,completed,next]=briefs[room.templateId],name=project.employeeProfiles?.[employeeKey(room.id,index)]?.name??campusCast[index].name
 return [
  {role:'user',text:`For this fictional OpenPlex walkthrough, your assignment is: ${task}. Please describe the supplied progress and your next step. This is demonstration context only; do not use tools or change anything.`},
  {role:'assistant',text:`I’m ${name}, and in this demo I’m working on ${task.charAt(0).toLowerCase()+task.slice(1)}. ${completed} I’m now preparing the next part: ${next.charAt(0).toLowerCase()+next.slice(1)}\n\nThe main pieces are in place for the walkthrough, and I’m keeping the remaining work focused on a clear first experience. My next handoff is a short review with the team so we can catch any gaps before presenting it. This is fictional progress for the recording, rather than work carried out on your files.`},
 ]
}

type RecordingStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>
/** Append once without replacing offices, chats or preferences already on device.
 * Reads are validated before the first write; failed writes restore prior values. */
export function seedRecordingProject(storage:RecordingStorage,directory=''):{project:OfficeProject;created:boolean}{
 const previous=storage.getItem(STORAGE_KEY),raw:unknown=previous?JSON.parse(previous):[]
 if(!Array.isArray(raw))throw new Error('Existing office storage is invalid. The recording sandbox was not created.')
 const existing=parseProjects(JSON.stringify(raw)).find(p=>p.id===RECORDING_PROJECT_ID)
 if(existing)return {project:existing,created:false}
 if(raw.some(p=>p&&typeof p==='object'&&'id' in p&&p.id===RECORDING_PROJECT_ID))throw new Error('An invalid recording sandbox already exists. No existing data was changed.')
 if(raw.length>=100)throw new Error('The office limit has been reached. No existing office was removed.')
 const oldSessions=storage.getItem(SESSION_KEY),parsed:unknown=oldSessions?JSON.parse(oldSessions):{}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Existing session storage is invalid. No sessions were changed.')
 const sessions={...parsed} as AgentSessions,project=createRecordingProject(directory),writes=new Map<string,string>(),time=Date.now()
 for(const room of project.rooms)for(const index of room.staff){
  const key=`${project.id}:${employeeKey(room.id,index)}`,conversationKey=`openplex.conversation:${key}`
  if(Object.hasOwn(sessions,key)||storage.getItem(conversationKey)!==null)throw new Error('An existing recording conversation would be replaced. No data was changed.')
  const messages=recordingConversation(project,room,index)
  writes.set(conversationKey,JSON.stringify(messages))
  sessions[key]={status:'complete',active:false,taskCount:1,completedCount:1,lastTask:messages[0].text,startedAt:time-60000,finishedAt:time-30000,messages:messages.map(m=>({role:m.role==='assistant'?'agent':'user',text:m.text}))}
 }
 writes.set(SESSION_KEY,JSON.stringify(sessions))
 writes.set(STORAGE_KEY,JSON.stringify([...raw,project]))
 const snapshots=new Map([...writes.keys()].map(key=>[key,storage.getItem(key)])),written:string[]=[]
 try{for(const [key,value] of writes){storage.setItem(key,value);written.push(key)}}catch(error){
  for(const key of written.reverse()){const old=snapshots.get(key);if(old===null)storage.removeItem(key);else if(old!==undefined)storage.setItem(key,old)}
  throw error
 }
 return {project,created:true}
}
