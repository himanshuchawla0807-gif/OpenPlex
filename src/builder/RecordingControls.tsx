import {useEffect,useState} from 'react'
import {RECORDING_PROJECT_ID} from './recordingProject'
import {STORAGE_KEY,type OfficeProject} from './workspace'
import './recording.css'

/** Explicit developer recording pages. No timers, model calls, or captured input. */
export function RecordingControls(){
 const mode=new URLSearchParams(location.search).get('recording')==='cinematic'?'cinematic':'reference'
 const [hidden,setHidden]=useState(false),[clean,setClean]=useState(false)
 const project=(JSON.parse(localStorage.getItem(STORAGE_KEY)??'[]') as OfficeProject[]).find(p=>p.id===RECORDING_PROJECT_ID)
 const move=(room?:string)=>window.dispatchEvent(new CustomEvent('openplex-recording-camera',{detail:{room,mode}}))
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.metaKey||e.ctrlKey)return;if(e.key.toLowerCase()==='h')setHidden(v=>!v);if(e.key==='Escape')setClean(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[])
 useEffect(()=>{document.documentElement.classList.toggle('recording-clean',clean);return()=>document.documentElement.classList.remove('recording-clean')},[clean])
 return <div className={'recording-controls'+(hidden?' recording-hidden':'')}><strong>{mode==='reference'?'Room-by-room camera':'Cinematic camera'}</strong><button onClick={()=>move()}>Overview</button><select aria-label="Camera room" defaultValue="" onChange={e=>move(e.target.value||undefined)}><option value="">Choose a room</option>{project?.rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select><button onClick={()=>setClean(v=>!v)}>{clean?'Show app navigation':'Canvas only'}</button><button onClick={()=>setHidden(true)}>Hide · H</button><small>Fictional recording sandbox</small></div>
}
