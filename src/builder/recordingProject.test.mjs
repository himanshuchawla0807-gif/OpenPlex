import test from 'node:test'
import assert from 'node:assert/strict'
import {createRecordingProject,seedRecordingProject,RECORDING_PROJECT_ID} from './recordingProject.ts'
import {STORAGE_KEY,createProject,parseProjects} from './workspace.ts'
import {officeDefinitions} from '../procedural/officeRooms.ts'
import {campusCast} from '../data/campusCast.ts'
import {hiredEmployees} from './employeeSpaces.ts'
import {employeeStatusEvidence} from './officeStatus.ts'

function memoryStorage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values}}
test('recording sandbox has fifteen occupied rooms and one distinct seat per character',()=>{
 const project=createRecordingProject('/tmp/recording'),indices=project.rooms.flatMap(r=>r.staff)
 assert.equal(project.rooms.length,15);assert.equal(indices.length,campusCast.length);assert.equal(new Set(indices).size,campusCast.length)
 assert.equal(project.rooms.find(r=>r.templateId==='connected-office').staff.length,12)
 assert.equal(project.rooms.find(r=>r.templateId==='ceo-office').staff.length,1)
 for(const room of project.rooms){assert.ok(room.staff.length>0);assert.ok(room.staff.length<=officeDefinitions.find(d=>d.id===room.templateId).stations.length)}
 assert.deepEqual(parseProjects(JSON.stringify([project]))[0],project)
 for(const profile of Object.values(project.employeeProfiles)){assert.match(profile.systemPrompt,/fictional/);assert.match(profile.systemPrompt,/Do not use tools/);assert.equal(profile.harness,'codex');assert.equal('model' in profile,false)}
})
test('seed appends without changing other offices or sessions and is idempotent',()=>{
 const old=createProject('My real office'),priorSession={status:'idle',messages:[]},storage=memoryStorage({[STORAGE_KEY]:JSON.stringify([old]),'openplex.agent-sessions.v1':JSON.stringify({real:priorSession})})
 const result=seedRecordingProject(storage,'/tmp/recording')
 assert.equal(result.created,true);assert.equal(result.project.id,RECORDING_PROJECT_ID)
 assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY))[0],old)
 const sessions=JSON.parse(storage.getItem('openplex.agent-sessions.v1'));assert.deepEqual(sessions.real,priorSession)
 const oscar=hiredEmployees([result.project]).find(e=>e.profile.name==='Oscar'),messages=JSON.parse(storage.getItem('openplex.conversation:'+oscar.key))
 assert.match(employeeStatusEvidence(oscar,sessions[oscar.key],messages,'',false,false),/fictional/)
 const before=[...storage.values];assert.equal(seedRecordingProject(storage).created,false);assert.deepEqual([...storage.values],before)
})
test('invalid storage and orphan conversation collisions are not overwritten',()=>{
 const broken=memoryStorage({[STORAGE_KEY]:'not JSON'});assert.throws(()=>seedRecordingProject(broken));assert.equal(broken.getItem(STORAGE_KEY),'not JSON')
 const project=createRecordingProject(),key=hiredEmployees([project])[0].key,collision=memoryStorage({['openplex.conversation:'+key]:'keep me'})
 assert.throws(()=>seedRecordingProject(collision));assert.equal(collision.getItem('openplex.conversation:'+key),'keep me');assert.equal(collision.getItem(STORAGE_KEY),null)
})
test('a failed seed rolls back earlier writes',()=>{
 const storage=memoryStorage(),write=storage.setItem;let n=0
 storage.setItem=(key,value)=>{if(++n===8)throw new Error('quota');write(key,value)}
 assert.throws(()=>seedRecordingProject(storage),/quota/);assert.equal(storage.values.size,0)
})
