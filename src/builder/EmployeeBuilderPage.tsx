import {useState} from 'react'
import {Botanical} from './Botanical'
import {CampusCharacterPreview} from '../components/CampusCharacterPreview'
import {AgentBuilder} from './AgentBuilder'
import {parseProfile,profileError,type EmployeeProfile} from './employees'
import './employee-builder-page.css'
export function EmployeeBuilderPage({index,profile,draftKey,directory,projectId,onChooseCharacter,onReview}:{index:number;profile:EmployeeProfile;draftKey:string;directory?:string;projectId:string;onChooseCharacter:()=>void;onReview:(profile:EmployeeProfile)=>void}){
 const [draft,setDraft]=useState(()=>{try{const saved=localStorage.getItem(draftKey+':profile');const p=saved&&localStorage.getItem(draftKey+':base')===JSON.stringify(profile)?parseProfile(JSON.parse(saved),index):profile;return profileError(p)?profile:p}catch{return profile}})
 return <main className="employee-builder-page"><div className="employee-builder-layout"><aside><button className="builder-back-hiring" onClick={()=>onReview(draft)}>← Back to hiring</button><Botanical/><span className="builder-eyebrow">A CHARACTER WITH PURPOSE</span><CampusCharacterPreview index={index} portrait/><button className="builder-change-character" onClick={onChooseCharacter}>Change character ↗</button><h1>Build {draft.name}<br/>with a conversation.</h1><p>Bring the ideas and files. We’ll help shape a capable teammate.</p><div><span>01</span> Describe the teammate<br/><span>02</span> Add anything they need<br/><span>03</span> Review, then hire</div></aside><section className="employee-builder-conversation"><AgentBuilder draftKey={draftKey} profile={draft} directory={directory} projectId={projectId} onReview={()=>onReview(draft)} onApply={next=>{setDraft(next);try{localStorage.setItem(draftKey+':profile',JSON.stringify(next));localStorage.setItem(draftKey+':base',JSON.stringify(profile))}catch{/* Active profile remains reviewable. */}}}/></section></div></main>
}
