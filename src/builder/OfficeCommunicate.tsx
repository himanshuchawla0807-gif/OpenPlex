import {useEffect,useRef,useState} from 'react'
import type {OfficeProject} from './workspace'
import {hiredEmployees,type HiredEmployee} from './employeeSpaces'
import {nativeAvailable,nativeCommand,type AgentSessions} from './agentSessions'
import {CharacterPortrait} from './CharacterPortrait'
import {ChatText} from './ChatText'
import {employeeStatusEvidence,parseOfficePosts,routeOfficeMessage,statusReportInstructions,type OfficePost} from './officeStatus'
import './office-communicate.css'
interface Props {project:OfficeProject;open:boolean;sessions:AgentSessions;workingKeys:Set<string>;terminalKeys:Set<string>;onClose:()=>void;onOpenEmployee:(room:string,index:number)=>void}
interface ReportJob {key:string;employee:HiredEmployee;post:string;question:string;started:boolean;sent:boolean;cancelled?:boolean;answer:string}
function terminalSnapshot(key:string):Promise<string>{return new Promise(resolve=>{
 const requestId=crypto.randomUUID();let timer:number
 const finish=(text:string)=>{window.clearTimeout(timer);window.removeEventListener('openplex-status-snapshot',receive);resolve(text)}
 const receive=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.requestId===requestId&&d.key===key)finish(typeof d.text==='string'?d.text:'')}
 window.addEventListener('openplex-status-snapshot',receive);timer=window.setTimeout(()=>finish(''),1500);nativeCommand({action:'status-snapshot',key,requestId})
})}
export function OfficeCommunicate({project,open,sessions,workingKeys,terminalKeys,onClose,onOpenEmployee}:Props){
 const storageKey='openplex.office-feed:'+project.id
 const [posts,setPosts]=useState<OfficePost[]>(()=>{try{return parseOfficePosts(JSON.parse(localStorage.getItem(storageKey)??'[]')).map(p=>p.state==='queued'||p.state==='working'?{...p,state:'interrupted',text:'This status request was interrupted. Ask again for a fresh update.'}:p)}catch{return []}})
 const [channel,setChannel]=useState('all'),[draft,setDraft]=useState(''),[error,setError]=useState(''),[count,setCount]=useState(0)
 const current=useRef(posts),jobs=useRef(new Map<string,ReportJob>()),queue=useRef<ReportJob[]>([]),cancelled=useRef(false),pump=useRef<()=>void>(()=>{}),log=useRef<HTMLDivElement>(null),dialog=useRef<HTMLElement>(null)
 const latest=useRef({sessions,workingKeys,terminalKeys})
 const save=(next:OfficePost[])=>{const bounded=parseOfficePosts(next);try{localStorage.setItem(storageKey,JSON.stringify(bounded))}catch{setError('This conversation could not be saved. Free some app storage before asking for more updates.');return false}current.current=bounded;setPosts(bounded);return true}
 const patch=(id:string,changes:Partial<OfficePost>)=>save(current.current.map(p=>p.id===id?{...p,...changes}:p))
 const finish=(job:ReportJob)=>{window.dispatchEvent(new CustomEvent('openplex-activity',{detail:{key:job.key,working:false}}));jobs.current.delete(job.key);setCount(jobs.current.size+queue.current.length);pump.current()}
 const pumpJobs=()=>{
  if(cancelled.current)return
  while(jobs.current.size<2&&queue.current.length){const job=queue.current.shift()!;jobs.current.set(job.key,job);window.dispatchEvent(new CustomEvent('openplex-activity',{detail:{key:job.key,working:true}}));patch(job.post,{state:'working',text:'Reading the latest work snapshot…'});setCount(jobs.current.size+queue.current.length)
   void terminalSnapshot(job.employee.key).then(snapshot=>{
    if(!jobs.current.has(job.key)||cancelled.current)return
    const state=latest.current,employee=job.employee;let conversation:unknown=[]
    try{conversation=JSON.parse(localStorage.getItem('openplex.conversation:'+employee.key)??'[]')}catch{/* Streamed state and terminal tail remain available. */}
    const capturedAt=Date.now(),evidence=employeeStatusEvidence(employee,state.sessions[employee.key],conversation,snapshot,state.workingKeys.has(employee.key)||state.sessions[employee.key]?.active===true,state.terminalKeys.has(employee.key),capturedAt)
    patch(job.post,{capturedAt})
    job.sent=true
    nativeCommand({action:'run',key:job.key,projectId:project.id,directory:project.workingDirectory,harness:employee.profile.harness,mcp:'{}',allowEdits:false,systemPrompt:statusReportInstructions,brief:`Employee: ${employee.profile.name}\nRole: ${employee.profile.role}\nDepartment: ${employee.room.name}`,prompt:`User asks in Office Communicate: ${job.question}\n\nReport from this work snapshot only:\n${evidence}`})
   })
  }
 }
 const receivers=useRef({patch,finish})
 useEffect(()=>{latest.current={sessions,workingKeys,terminalKeys};pump.current=pumpJobs;receivers.current={patch,finish}})
 useEffect(()=>{cancelled.current=false;const activeJobs=jobs.current,waitingQueue=queue.current;const receive=(event:Event)=>{const d=(event as CustomEvent).detail,job=jobs.current.get(d?.key);if(!job)return
  if(d.kind==='started')job.started=true
  if(d.kind==='answer'&&typeof d.text==='string'){job.answer=(job.answer?job.answer+'\n\n':'')+d.text;receivers.current.patch(job.post,{text:job.answer.slice(-12000)})}
  if(d.kind==='error')receivers.current.patch(job.post,{state:'error',text:d.text??'The reporting harness needs attention.'})
  if(d.kind==='finished'){receivers.current.patch(job.post,{state:job.cancelled?'interrupted':d.exitCode===0&&job.answer?'done':'error',...(job.cancelled?{text:job.answer||'Status request stopped.'}:d.exitCode===0&&job.answer?{}:{text:job.answer||'No status reply was returned. Check the harness configuration, sign-in or allowance, then retry.'})});receivers.current.finish(job)}
  else if(d.kind==='error'&&!job.started)receivers.current.finish(job)
 };window.addEventListener('openplex-agent',receive);return()=>{cancelled.current=true;window.removeEventListener('openplex-agent',receive);for(const job of activeJobs.values()){if(job.sent)nativeCommand({action:'stop',key:job.key});window.dispatchEvent(new CustomEvent('openplex-activity',{detail:{key:job.key,working:false}}))};activeJobs.clear();waitingQueue.splice(0)}},[project.id])
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[open])
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[posts,channel,open])
 const employees=hiredEmployees([project],project.id),route=routeOfficeMessage(project,draft,channel)
 const send=()=>{
  if(!draft.trim()||count)return
  if(route.error){setError(route.error);return}if(!route.employees.length){setError('There are no hired employees in this audience yet.');return}
  if(!nativeAvailable()||!project.workingDirectory){setError('Choose a workspace folder in the Mac app before asking for employee updates.');return}
  const question=draft.trim(),id=crypto.randomUUID(),now=Date.now(),nextJobs:ReportJob[]=[],newPosts:OfficePost[]=[{id,channel,role:'user',name:'You',text:question,at:now}]
  for(const employee of route.employees){const post=crypto.randomUUID(),supported=['codex','claude'].includes(employee.profile.harness)
   newPosts.push({id:post,channel,parent:id,role:'employee',name:employee.profile.name,source:employee.key,text:supported?'Queued for a separate status request.':`Status replies are not yet supported by this employee’s ${employee.profile.harness} adapter. Open their working chat for the recorded activity.`,state:supported?'queued':'error',at:now})
   if(supported)nextJobs.push({key:`status:${project.id}:${id}:${employee.index}`,employee,post,question,started:false,sent:false,answer:''})
  }
  if(!save([...current.current,...newPosts]))return
  setDraft('');setError('');cancelled.current=false;queue.current.push(...nextJobs);setCount(nextJobs.length);pump.current()
 }
 const stop=()=>{cancelled.current=true;const queued=queue.current.splice(0);for(const job of queued)patch(job.post,{state:'interrupted',text:'Status request cancelled before it started.'});for(const job of jobs.current.values()){job.cancelled=true;patch(job.post,{state:'interrupted',text:job.sent?'Stopping this status request…':'Status request cancelled before it started.'});if(job.sent)nativeCommand({action:'stop',key:job.key});else{jobs.current.delete(job.key);window.dispatchEvent(new CustomEvent('openplex-activity',{detail:{key:job.key,working:false}}))}}setCount(jobs.current.size)}
 const sourceEmployee=(key?:string)=>employees.find(e=>e.key===key)
 const shown=posts.filter(p=>p.channel===channel)
 return <div className="builder-modal-backdrop office-communicate-backdrop" style={{display:open?undefined:'none'}}><section ref={dialog} className="office-communicate" role="dialog" aria-modal="true" aria-label="Office Communicate" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled)'));if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}}}}>
 <aside><span className="builder-eyebrow">OFFICE COMMUNICATE</span><h2>{project.name}</h2><p>CHANNELS</p><nav aria-label="Office channels"><button aria-pressed={channel==='all'} onClick={()=>setChannel('all')}># all-hands <small>{employees.length}</small></button>{project.rooms.map(room=><button key={room.id} aria-pressed={channel===room.id} onClick={()=>setChannel(room.id)}># {room.name} <small>{room.staff.length}</small></button>)}</nav><p>PEOPLE</p><div className="office-feed-people">{employees.map(e=><button key={e.key} onClick={()=>{setChannel('all');setDraft(e.profile.name+", what's going on?")}}><CharacterPortrait index={e.index}/><span>{e.profile.name}<small>{workingKeys.has(e.key)||sessions[e.key]?.active?'Working':terminalKeys.has(e.key)?'Connected':'Available'}</small></span></button>)}</div></aside>
 <div className="office-feed-main"><header><div><h2># {channel==='all'?'all-hands':project.rooms.find(r=>r.id===channel)?.name}</h2><p>Ask everyone, an employee by name, or a department.</p></div><button onClick={onClose} aria-label="Close Office Communicate">×</button></header>
 <div className="office-feed-log" role="log" aria-label="Office messages" ref={log}>{!shown.length&&<div className="office-feed-empty"><span>✳</span><h3>A little shared perspective.</h3><p>Try “What’s going on?”, “{employees[0]?.profile.name??'Employee name'}, what’s going on?” or “Technical department, what’s going on?”</p><p>Replies summarize a snapshot of each employee’s own work. Their working chats keep running.</p></div>}{shown.map(post=>{const employee=sourceEmployee(post.source);return <article key={post.id} className={post.parent?'office-feed-reply':''}>{employee?<CharacterPortrait index={employee.index}/>:<span className="office-feed-user">Y</span>}<div><div className="office-feed-byline"><strong>{post.name}</strong><time dateTime={new Date(post.at).toISOString()}>{new Date(post.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time>{post.state&&<small>{post.state==='done'?'Reported':post.state}</small>}</div><ChatText text={post.text}/>{employee&&<button className="office-feed-source" onClick={()=>{onClose();onOpenEmployee(employee.room.id,employee.index)}}>Open working chat ↗{post.capturedAt?' · snapshot '+new Date(post.capturedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</button>}</div></article>})}</div>
 {error&&<p className="office-feed-error" role="alert">{error}</p>}<form onSubmit={e=>{e.preventDefault();send()}}><div className="office-feed-audience" role="status">{count?`${count} status replies in progress · working chats continue`:draft.trim()?`To: ${route.label} · ${route.employees.length} ${route.employees.length===1?'employee':'employees'}`:'Name an employee, choose a channel, or ask everyone.'}</div><textarea aria-label="Message office" maxLength={6000} value={draft} disabled={count>0} onChange={e=>setDraft(e.target.value)} placeholder="What’s going on?"/><div className="office-feed-send"><small>Snapshots and replies are shared here. Model providers receive the requested work context.</small>{count?<button type="button" onClick={stop}>Stop status requests</button>:<button disabled={!draft.trim()||!!route.error||!route.employees.length}>Ask for updates ↗</button>}</div></form></div></section></div>
}
