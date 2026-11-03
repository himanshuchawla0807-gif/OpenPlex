/** Deterministic coordination policy. Models propose content; they do not grant authority. */
export type MemberRole='ceo'|'head'|'employee'|'reviewer'|'recovery'
export interface Member {id:string;name:string;departmentId:string;role:MemberRole;reportsTo?:string}
export type TaskStatus='queued'|'running'|'awaiting_review'|'completed'|'blocked'|'needs_authorization'|'cancelled'
export interface Task {id:string;title:string;brief:string;assigneeId:string;parentId?:string;participants:string[];dependencies:string[];status:TaskStatus;attempt:number;maxAttempts:number;createdAt:number;updatedAt:number;runId?:string;leaseUntil?:number;result?:string;error?:string;idempotencyKey:string}
export interface MemoryRecord {id:string;scope:'employee'|'task'|'department'|'project';scopeId:string;authorId:string;title:string;content:string;source:string;revision:number;createdAt:number;expiresAt?:number;supersededBy?:string;deletedAt?:number}
export interface TeamMessage {id:string;taskId:string;senderId:string;recipientId:string;text:string;createdAt:number;replyTo?:string}
export interface AuditEvent {id:string;kind:string;taskId?:string;actorId:string;at:number;detail:string}
export interface CoordinationState {schemaVersion:1;projectId:string;members:Member[];tasks:Task[];memories:MemoryRecord[];messages:TeamMessage[];events:AuditEvent[]}
export interface TaskInput {title:string;brief:string;assigneeId:string;parentId?:string;participants?:string[];dependencies?:string[];idempotencyKey:string;maxAttempts?:number}
export type MemoryInput=Omit<MemoryRecord,'id'|'revision'|'createdAt'> & Partial<Pick<MemoryRecord,'id'|'revision'|'createdAt'>>
const roles:MemberRole[]=['ceo','head','employee','reviewer','recovery']
const statuses:TaskStatus[]=['queued','running','awaiting_review','completed','blocked','needs_authorization','cancelled']
const scopes:MemoryRecord['scope'][]=['employee','task','department','project']
const forbidden=new Set(['__proto__','constructor','prototype'])
const fail=(message:string):never=>{throw new Error(message)}
function object(value:unknown):Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return fail('Expected a plain coordination record.')
 if(Object.keys(value).some(k=>forbidden.has(k)))return fail('Unsafe record key.')
 return value as Record<string,unknown>
}
function id(value:unknown,label='identity'):string {if(typeof value!=='string'||!/^[-a-zA-Z0-9_:.]{1,399}$/.test(value)||forbidden.has(value))return fail(`Invalid ${label}.`);return value}
function text(value:unknown,max:number,label:string):string {if(typeof value!=='string'||!value.trim()||value.length>max||value.includes('\0'))return fail(`Invalid ${label}.`);return value}
function time(value:unknown):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return fail('Invalid timestamp.');return value}
function integer(value:unknown,min:number,max:number):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)return fail('Invalid execution limit.');return value}
function list(value:unknown,max:number,label:string):unknown[] {if(!Array.isArray(value)||value.length>max)return fail(`Invalid ${label} list.`);return value}
function ids(value:unknown,max=200):string[] {const out=list(value,max,'identity').map(v=>id(v));if(new Set(out).size!==out.length)return fail('Duplicate identity.');return out}
function unique<T extends {id:string}>(values:T[],label:string):T[] {if(new Set(values.map(x=>x.id)).size!==values.length)return fail(`Duplicate ${label} identity.`);return values}
const optionalText=(v:unknown,max=24000)=>v===undefined?undefined:text(v,max,'result')
const uuid=()=>crypto.randomUUID()
const member=(state:CoordinationState,key:string)=>state.members.find(m=>m.id===key)??fail('Employee is not part of this project.')
const task=(state:CoordinationState,key:string)=>state.tasks.find(t=>t.id===key)??fail('Task is not part of this project.')
const manager=(m:Member)=>m.role==='ceo'||m.role==='head'
const terminal=(t:Task)=>t.status==='completed'||t.status==='cancelled'
function audit(state:CoordinationState,kind:string,actorId:string,detail:string,now:number,taskId?:string):CoordinationState {
 return {...state,events:[...state.events,{id:uuid(),kind,actorId,detail,at:time(now),...(taskId?{taskId}:{})}].slice(-2000)}
}
function changeTask(state:CoordinationState,value:Task):CoordinationState {return {...state,tasks:state.tasks.map(t=>t.id===value.id?value:t)}}
function allowedTaskActor(state:CoordinationState,t:Task,actorId:string) {
 if(actorId==='user')return
 const actor=member(state,actorId),owner=member(state,t.assigneeId)
 if(actor.id!==owner.id&&!(manager(actor)&&owner.reportsTo===actor.id))fail('Only the task owner, direct manager or user can change this task.')
}
function taskDepth(state:CoordinationState,value:Task):number {let depth=0,current=value;const seen=new Set<string>();while(current.parentId){if(seen.has(current.id))return fail('Task hierarchy contains a cycle.');seen.add(current.id);current=task(state,current.parentId);depth++;if(depth>3)return fail('Task delegation is limited to three levels.')}return depth}
function validateHierarchy(state:CoordinationState) {
 if(state.members.filter(m=>m.role==='ceo').length>1)fail('A project can have only one CEO.')
 for(const m of state.members){
  if(m.role==='ceo'&&m.reportsTo)fail('The CEO reports to the user.')
  let current=m,depth=0;const seen=new Set([m.id])
  while(current.reportsTo){const parent=member(state,current.reportsTo);if(!manager(parent))fail('Reporting lines must point to a CEO or department head.');if(seen.has(parent.id))fail('Reporting lines contain a cycle.');seen.add(parent.id);current=parent;if(++depth>3)fail('Reporting lines are limited to three levels.')}
 }
}
export function createCoordination(projectId:string):CoordinationState {return {schemaVersion:1,projectId:id(projectId,'project'),members:[],tasks:[],memories:[],messages:[],events:[]}}
/** Fail closed: malformed saved state never becomes executable work. */
export function parseCoordination(value:unknown,projectId:string):CoordinationState {
 const raw=object(value);id(projectId,'project')
 if(raw.schemaVersion!==1||raw.projectId!==projectId)fail('Unsupported schema or another project’s coordination state.')
 const members=unique(list(raw.members,200,'member').map(v=>{const m=object(v);if(!roles.includes(m.role as MemberRole))fail('Invalid organizational role.');if(m.id==='user'||m.id==='coordinator')fail('Employee identity is reserved for the coordinator or user.');return {id:id(m.id),name:text(m.name,80,'employee name'),departmentId:id(m.departmentId),role:m.role as MemberRole,...(m.reportsTo!==undefined?{reportsTo:id(m.reportsTo)}:{})}}),'member')
 const tasks=unique(list(raw.tasks,500,'task').map(v=>{const t=object(v);if(!statuses.includes(t.status as TaskStatus))fail('Invalid task status.');const result:Task={id:id(t.id),title:text(t.title,160,'task title'),brief:text(t.brief,24000,'task brief'),assigneeId:id(t.assigneeId),participants:ids(t.participants),dependencies:ids(t.dependencies,100),status:t.status as TaskStatus,attempt:integer(t.attempt,0,5),maxAttempts:integer(t.maxAttempts,1,5),createdAt:time(t.createdAt),updatedAt:time(t.updatedAt),idempotencyKey:text(t.idempotencyKey,200,'idempotency key')};if(t.parentId!==undefined)result.parentId=id(t.parentId);if(t.runId!==undefined)result.runId=id(t.runId);if(t.leaseUntil!==undefined)result.leaseUntil=time(t.leaseUntil);if(t.result!==undefined)result.result=text(t.result,24000,'task result');if(t.error!==undefined)result.error=text(t.error,4000,'task error');return result}),'task')
 const memories=unique(list(raw.memories,1000,'memory').map(v=>{const m=object(v);if(!scopes.includes(m.scope as MemoryRecord['scope']))fail('Invalid knowledge scope.');return {id:id(m.id),scope:m.scope as MemoryRecord['scope'],scopeId:id(m.scopeId),authorId:id(m.authorId),title:text(m.title,160,'knowledge title'),content:text(m.content,24000,'knowledge content'),source:text(m.source,2000,'knowledge source'),revision:integer(m.revision,1,100000),createdAt:time(m.createdAt),...(m.expiresAt!==undefined?{expiresAt:time(m.expiresAt)}:{}),...(m.supersededBy!==undefined?{supersededBy:id(m.supersededBy)}:{}),...(m.deletedAt!==undefined?{deletedAt:time(m.deletedAt)}:{})}}),'memory')
 const messages=unique(list(raw.messages,1000,'message').map(v=>{const m=object(v);return {id:id(m.id),taskId:id(m.taskId),senderId:id(m.senderId),recipientId:id(m.recipientId),text:text(m.text,12000,'help message'),createdAt:time(m.createdAt),...(m.replyTo!==undefined?{replyTo:id(m.replyTo)}:{})}}),'message')
 const events=unique(list(raw.events,2000,'event').map(v=>{const e=object(v);return {id:id(e.id),kind:text(e.kind,80,'event kind'),actorId:id(e.actorId),at:time(e.at),detail:text(e.detail,4000,'event detail'),...(e.taskId!==undefined?{taskId:id(e.taskId)}:{})}}),'event')
 const state:CoordinationState={schemaVersion:1,projectId,members,tasks,memories,messages,events};validateHierarchy(state)
 if(new Set(tasks.map(t=>t.idempotencyKey)).size!==tasks.length)fail('Duplicate task delivery key.')
 const running=tasks.filter(t=>t.status==='running');if(running.length>2||new Set(running.map(t=>t.assigneeId)).size!==running.length)fail('Saved execution exceeds concurrency limits.')
 for(const t of tasks){
  member(state,t.assigneeId);for(const p of t.participants)member(state,p)
  if(!t.participants.includes(t.assigneeId))fail('The owner must participate in the task.')
  if(t.attempt>t.maxAttempts||t.updatedAt<t.createdAt)fail('Invalid task attempt or time.')
  if(t.status==='running'&&(!t.runId||t.leaseUntil===undefined||t.attempt<1))fail('A running task needs an execution lease.')
  if(t.status!=='running'&&t.leaseUntil!==undefined)fail('Only running tasks can hold leases.')
  if(t.status==='completed'&&!t.result)fail('Completion requires reviewed output.')
  for(const dependency of t.dependencies){if(dependency===t.id)fail('A task cannot depend on itself.');task(state,dependency)}
  taskDepth(state,t)
  if(tasks.filter(child=>child.parentId===t.id).length>2)fail('A task may delegate to at most two children.')
 }
 const visiting=new Set<string>(),visited=new Set<string>()
 const visit=(t:Task)=>{if(visiting.has(t.id))fail('Task dependencies contain a cycle.');if(visited.has(t.id))return;visiting.add(t.id);for(const dep of t.dependencies)visit(task(state,dep));for(const child of tasks.filter(x=>x.parentId===t.id))visit(child);visiting.delete(t.id);visited.add(t.id)}
 for(const t of tasks)visit(t)
 for(const m of memories){
  if(m.authorId!=='user')member(state,m.authorId)
  validateScope(state,m)
  if(m.supersededBy){const successor=memories.find(x=>x.id===m.supersededBy)??fail('Knowledge correction is missing.');if(successor.scope!==m.scope||successor.scopeId!==m.scopeId||successor.revision<=m.revision)fail('Invalid knowledge revision link.')}
 }
 for(const m of messages){const t=task(state,m.taskId);member(state,m.senderId);member(state,m.recipientId);const prior=m.replyTo?messages.find(x=>x.id===m.replyTo&&x.taskId===m.taskId):undefined;if(m.replyTo&&(!prior||prior.recipientId!==m.senderId||prior.senderId!==m.recipientId))fail('Help reply references another thread or audience.');if(!t.participants.includes(m.senderId)&&!prior)fail('Only task participants or an explicitly addressed helper can send help messages.')}
 for(const e of events){if(e.actorId!=='user'&&e.actorId!=='coordinator')member(state,e.actorId);if(e.taskId)task(state,e.taskId)}
 return state
}
export function setMembers(state:CoordinationState,members:Member[],now=Date.now()):CoordinationState {
 const checked=parseCoordination({...state,members},state.projectId)
 return audit(checked,'organization.updated','user','Reporting lines updated.',now)
}
export function createTask(state:CoordinationState,input:TaskInput,actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const assignee=member(state,input.assigneeId)
 if(actorId!=='user'){const actor=member(state,actorId);if(actor.id!==assignee.id&&(!manager(actor)||assignee.reportsTo!==actor.id))fail('Delegation is limited to direct reports.')}
 const duplicate=state.tasks.find(t=>t.idempotencyKey===input.idempotencyKey)
 if(duplicate){if(duplicate.title!==input.title||duplicate.brief!==input.brief||duplicate.assigneeId!==input.assigneeId||duplicate.parentId!==input.parentId||duplicate.maxAttempts!==(input.maxAttempts??2)||JSON.stringify(duplicate.dependencies)!==JSON.stringify(input.dependencies??[])||JSON.stringify(duplicate.participants)!==JSON.stringify([...new Set([input.assigneeId,...(input.participants??[])])]))fail('Delivery key already belongs to different work.');return state}
 if(state.tasks.length>=500)fail('This project has reached its 500-task limit.')
 if(input.parentId){const parent=task(state,input.parentId);allowedTaskActor(state,parent,actorId);if(terminal(parent))fail('Cannot delegate from a closed task.');if(state.tasks.filter(t=>t.parentId===parent.id).length>=2)fail('A task may delegate to at most two children.')}
 const value:Task={id:uuid(),title:text(input.title,160,'task title'),brief:text(input.brief,24000,'task brief'),assigneeId:assignee.id,...(input.parentId?{parentId:input.parentId}:{}),participants:[...new Set([assignee.id,...(input.participants??[])])],dependencies:input.dependencies??[],status:'queued',attempt:0,maxAttempts:input.maxAttempts??2,createdAt:time(now),updatedAt:now,idempotencyKey:input.idempotencyKey}
 return audit(parseCoordination({...state,tasks:[...state.tasks,value]},state.projectId),'task.created',actorId,value.title,now,value.id)
}
export function runnableTasks(state:CoordinationState,busyEmployeeIds:string[]=[],limit=2,now=Date.now()):Task[] {
 const busy=new Set([...busyEmployeeIds,...state.tasks.filter(t=>t.status==='running').map(t=>t.assigneeId)]),out:Task[]=[]
 const slots=Math.max(0,Math.min(2,Math.max(0,Math.floor(limit)))-state.tasks.filter(t=>t.status==='running').length)
 for(const t of state.tasks.filter(t=>t.status==='queued').sort((a,b)=>a.createdAt-b.createdAt)){
  if(out.length>=slots)break
  if(busy.has(t.assigneeId)||t.attempt>=t.maxAttempts||t.dependencies.some(dep=>task(state,dep).status!=='completed')||(t.parentId&&['cancelled','blocked','needs_authorization'].includes(task(state,t.parentId).status)))continue
  if(t.leaseUntil!==undefined&&t.leaseUntil>now)continue
  out.push(t);busy.add(t.assigneeId)
 }
 return out
}
export function claimTask(state:CoordinationState,id:string,runId:string,actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const t=task(state,id);allowedTaskActor(state,t,actorId)
 if(t.status==='running'&&t.runId===runId)return state
 if(state.tasks.some(x=>x.runId===runId)||state.events.some(e=>e.kind==='task.started'&&e.detail.endsWith(`Run ${runId}.`)))fail('Run identity has already been used.')
 if(!runnableTasks(state,[],2,now).some(x=>x.id===id))fail('Task is not ready or execution capacity is occupied.')
 const value:Task={...t,status:'running',runId:globalThis.String(runId),leaseUntil:now+10*60*1000,attempt:t.attempt+1,updatedAt:time(now),error:undefined,result:undefined}
 return audit(parseCoordination(changeTask(state,value),state.projectId),'task.started',actorId,`Attempt ${value.attempt} claimed. Run ${runId}.`,now,id)
}
export function settleTask(state:CoordinationState,id:string,runId:string,outcome:{result?:string;error?:string;authorization?:boolean},now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const t=task(state,id)
 if(t.status!=='running'||t.runId!==runId)return state
 if(t.leaseUntil!==undefined&&now>=t.leaseUntil)return audit(changeTask(state,{...t,status:'blocked',leaseUntil:undefined,error:'Execution lease expired. Reconcile the prior attempt before retrying.',updatedAt:time(now)}),'task.lease_expired','coordinator','Late output was not accepted.',now,id)
 const result=optionalText(outcome.result),error=optionalText(outcome.error,4000)
 const status:TaskStatus=outcome.authorization?'needs_authorization':error||!result?'blocked':'awaiting_review'
 return audit(changeTask(state,{...t,status,result,error:error??(!result?'No verifiable result was returned.':undefined),leaseUntil:undefined,updatedAt:time(now)}),'task.'+status,'coordinator',status==='awaiting_review'?'Output recorded; independent review is required.':error??'The attempt needs attention.',now,id)
}
export function reviewTask(state:CoordinationState,id:string,approved:boolean,actorId='user',note='',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const t=task(state,id)
 if(!['awaiting_review','blocked'].includes(t.status))fail('This task is not waiting for review or reconciliation.')
 if(actorId!=='user'){const reviewer=member(state,actorId);if(reviewer.id===t.assigneeId)fail('An author cannot approve their own output.');if(reviewer.role!=='reviewer'&&!(manager(reviewer)&&member(state,t.assigneeId).reportsTo===reviewer.id))fail('This employee is not authorized to review the task.');if(reviewer.departmentId!==member(state,t.assigneeId).departmentId&&reviewer.role!=='ceo')fail('Cross-department review requires the user or CEO.')}
 if(approved&&(!t.result||t.status!=='awaiting_review'))fail('Completion needs recorded output and independent review.')
 if(approved&&state.tasks.some(child=>child.parentId===t.id&&child.status!=='completed'))fail('Complete delegated children before approving the parent.')
 if(!approved&&t.attempt>=t.maxAttempts)fail('The task exhausted its attempt budget. Create a new reviewed work package.')
 const value:Task={...t,status:approved?'completed':'queued',leaseUntil:undefined,updatedAt:time(now),...(approved?{}:{result:undefined,error:note.trim()?text(note,4000,'review note'):'Explicitly requeued after review.'})}
 return audit(changeTask(state,value),approved?'task.approved':'task.requeued',actorId,note.trim()?text(note,4000,'review note'):approved?'Output accepted.':'Previous attempt reconciled; retry authorized.',now,id)
}
export function cancelTask(state:CoordinationState,id:string,actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const root=task(state,id);allowedTaskActor(state,root,actorId)
 if(terminal(root))return state
 const cancelled=new Set([id]);let changed=true
 while(changed){changed=false;for(const t of state.tasks)if(!terminal(t)&&!cancelled.has(t.id)&&((t.parentId&&cancelled.has(t.parentId))||t.dependencies.some(dep=>cancelled.has(dep)))){cancelled.add(t.id);changed=true}}
 const next={...state,tasks:state.tasks.map(t=>cancelled.has(t.id)&&!terminal(t)?{...t,status:'cancelled' as const,leaseUntil:undefined,updatedAt:time(now),error:'Cancelled with its task tree.'}:t)}
 return audit(next,'task.cancelled',actorId,`${cancelled.size} work package(s) cancelled.`,now,id)
}
export function recoverInterrupted(state:CoordinationState,now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);let next=state
 for(const t of state.tasks.filter(t=>t.status==='running'))next=audit(changeTask(next,{...t,status:'blocked',leaseUntil:undefined,updatedAt:time(now),error:'The coordinator restarted during this attempt. Reconcile its outcome before explicitly retrying.'}),'task.interrupted','coordinator','No work was automatically resubmitted.',now,t.id)
 return next
}
function validateScope(state:CoordinationState,m:Pick<MemoryRecord,'scope'|'scopeId'>) {
 if(m.scope==='employee')member(state,m.scopeId)
 if(m.scope==='task')task(state,m.scopeId)
 if(m.scope==='department'&&!state.members.some(x=>x.departmentId===m.scopeId))fail('Unknown department knowledge scope.')
 if(m.scope==='project'&&m.scopeId!==state.projectId)fail('Cross-project knowledge publication requires a separate explicit workflow.')
}
function canSee(state:CoordinationState,m:MemoryRecord,actorId:string):boolean {
 if(actorId==='user')return true
 const actor=member(state,actorId)
 return m.scope==='project'||m.scope==='employee'&&m.scopeId===actor.id||m.scope==='department'&&m.scopeId===actor.departmentId||m.scope==='task'&&task(state,m.scopeId).participants.includes(actor.id)
}
export function visibleMemories(state:CoordinationState,actorId:string,now=Date.now()):MemoryRecord[] {
 if(actorId!=='user')member(state,actorId)
 return state.memories.filter(m=>m.deletedAt===undefined&&!m.supersededBy&&(m.expiresAt===undefined||m.expiresAt>now)&&canSee(state,m,actorId))
}
export function publishMemory(state:CoordinationState,input:MemoryInput,actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId)
 if(state.memories.length>=1000)fail('The project knowledge limit is reached.')
 const record:MemoryRecord={...input,id:input.id??uuid(),revision:input.revision??1,createdAt:input.createdAt??now}
 if(record.deletedAt!==undefined||record.supersededBy!==undefined)fail('New knowledge cannot start deleted or superseded.')
 validateScope(state,record)
 if(actorId!=='user'){
  const actor=member(state,actorId)
  if(record.authorId!==actorId)fail('Knowledge authorship must match the authenticated employee.')
  if(!canSee(state,record,actorId))fail('Cannot publish outside the employee’s authorized scope.')
  if(record.scope==='project'&&!manager(actor))fail('Project-wide publication requires manager or user review.')
  if(record.scope==='department'&&!manager(actor))fail('Department publication requires manager or user review.')
 }
 const previous=state.memories.find(m=>m.id===record.id)
 if(previous){
  if(previous.deletedAt!==undefined||previous.supersededBy)fail('Cannot correct an inactive knowledge revision.')
  if(previous.scope!==record.scope||previous.scopeId!==record.scopeId)fail('A correction cannot silently widen knowledge access.')
  if(actorId!=='user'&&previous.authorId!==actorId)fail('Only the author or user can correct knowledge.')
  record.id=uuid();record.revision=previous.revision+1;record.createdAt=time(now)
 }
 const memories=[...state.memories.map(m=>m===previous?{...m,supersededBy:record.id}:m),record]
 return audit(parseCoordination({...state,memories},state.projectId),previous?'memory.corrected':'memory.published',actorId,record.title,now)
}
export function deleteMemory(state:CoordinationState,id:string,actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const current=state.memories.find(m=>m.id===id)??fail('Knowledge record is not part of this project.')
 if(actorId!=='user'&&current.authorId!==actorId)fail('Only the author or user can delete knowledge.')
 if(current.deletedAt!==undefined)return state
 const affected=new Set([id]);let changed=true;while(changed){changed=false;for(const m of state.memories)if(m.supersededBy&&affected.has(m.id)&&!affected.has(m.supersededBy)){affected.add(m.supersededBy);changed=true}}
 const memories=state.memories.map(m=>affected.has(m.id)?{...m,content:'[Deleted by user or author]',title:'Deleted knowledge',source:'[Deleted]',deletedAt:time(now)}:m)
 return audit({...state,memories},'memory.deleted',actorId,'Knowledge content removed from active state and retrieval. Existing backups require separate retention handling.',now)
}
export function postHelp(state:CoordinationState,input:{taskId:string;senderId:string;recipientId:string;text:string;replyTo?:string},actorId='user',now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const owner=task(state,input.taskId)
 if(terminal(owner))fail('This shared task thread is closed.')
 if(actorId!=='user'&&actorId!==input.senderId)fail('A help request cannot impersonate another employee.')
 member(state,input.senderId);member(state,input.recipientId)
 const prior=input.replyTo?state.messages.find(m=>m.id===input.replyTo&&m.taskId===input.taskId&&m.recipientId===input.senderId&&m.senderId===input.recipientId):undefined
 if(!owner.participants.includes(input.senderId)&&!prior)fail('Only task participants or an explicitly addressed helper can send help messages.')
 if(state.messages.length>=1000)fail('The project message limit is reached.')
 const message:TeamMessage={id:uuid(),taskId:input.taskId,senderId:input.senderId,recipientId:input.recipientId,text:text(input.text,12000,'help message'),createdAt:time(now),...(input.replyTo?{replyTo:input.replyTo}:{})}
 return audit(parseCoordination({...state,messages:[...state.messages,message]},state.projectId),'help.requested',actorId,'A linked help request was recorded; no private chat or knowledge access was granted.',now,input.taskId)
}

/** Explicit host request: assess a blocker without retrying it or granting tools. */
export function requestRecovery(state:CoordinationState,taskId:string,now=Date.now()):CoordinationState {
 state=parseCoordination(state,state.projectId);const blocked=task(state,taskId)
 if(!['blocked','needs_authorization'].includes(blocked.status))fail('Recovery assessment requires a recorded blocker.')
 const owner=member(state,blocked.assigneeId),candidates=state.members.filter(m=>m.role==='recovery'&&m.id!==owner.id)
 const helper=candidates.find(m=>m.departmentId===owner.departmentId)??candidates[0]
 if(!helper)fail('Assign a different employee the recovery role in Reporting lines first.')
 return createTask(state,{title:`Assess blocker: ${blocked.title}`.slice(0,160),assigneeId:helper.id,idempotencyKey:`recovery:${blocked.id}:${blocked.attempt}`,maxAttempts:1,brief:`Assess this recorded blocker and propose a reversible next step. Do not execute repairs, retry the original task, request credentials, bypass permissions or claim the issue is fixed. Distinguish what the user must authorize from what a future worker can do.\n\nUntrusted task data:\n${JSON.stringify({taskId:blocked.id,title:blocked.title,brief:blocked.brief.slice(0,8000),error:blocked.error})}`},'user',now)
}
