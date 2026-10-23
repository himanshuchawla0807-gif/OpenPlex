import test from 'node:test'
import assert from 'node:assert/strict'
import {createProject,addRoom,addEmployee} from './workspace.ts'
import {employeeKey,defaultProfile} from './employees.ts'
import {routeOfficeMessage,parseOfficePosts,employeeStatusEvidence,redactStatusText} from './officeStatus.ts'
import {hiredEmployees} from './employeeSpaces.ts'
const fixture=()=>{let p=addRoom(createProject('Status QA'),'connected-office');p=addRoom(p,'collaboration-suite');p=addEmployee(p,p.rooms[0].id,0);p=addEmployee(p,p.rooms[1].id,1);p=addEmployee(p,p.rooms[1].id,2);p.employeeProfiles={[employeeKey(p.rooms[0].id,0)]:{...defaultProfile(0),name:'Clove'}};return p}
test('all-hands, employee, multiple names, department, and channel routing select only hired staff',()=>{
 const p=fixture();assert.equal(routeOfficeMessage(p,"What's going on?").employees.length,3)
 assert.deepEqual(routeOfficeMessage(p,"Clove, what's going on?").employees.map(e=>e.profile.name),['Clove'])
 assert.equal(routeOfficeMessage(p,'@Clove status?').employees.length,1)
 assert.equal(routeOfficeMessage(p,"Technical department, what's going on?").employees.length,2)
 assert.equal(routeOfficeMessage(p,'Engineering status?').employees.length,2)
 assert.equal(routeOfficeMessage(p,'Status please',p.rooms[1].id).employees.length,2)
 const names=hiredEmployees([p]).slice(0,2).map(e=>e.profile.name);assert.equal(routeOfficeMessage(p,names.join(' and ')+', status?').employees.length,2)
})
test('unknown named addressees and departments never become a broadcast',()=>{
 for(const message of ["Nobody, what's going on?","Nobody what's going on?",'@nobody status?','Finance department status?']){const result=routeOfficeMessage(fixture(),message);assert.equal(result.employees.length,0,message);assert.ok(result.error,message)}
})
test('snapshots include only selected employee evidence, identify freshness, and do not invent a percentage',()=>{
 const employee=hiredEmployees([fixture()])[0],evidence=JSON.parse(employeeStatusEvidence(employee,{status:'running',active:true,messages:[{role:'agent',text:'Own progress'}],completedCount:2,lastTask:'Own task'},[{role:'assistant',text:'Own terminal'}],'\x1b[31mOwn live output',true,true,10000))
 assert.equal(evidence.source,employee.key);assert.equal(evidence.observedState,'Working');assert.equal(evidence.completedRecordedTasks,2);assert.ok(evidence.terminalTail.includes('Own live output'));assert.ok(!evidence.terminalTail.includes('\x1b'));assert.equal(evidence.capturedAt,'1970-01-01T00:00:10.000Z');assert.ok(!Object.keys(evidence).some(k=>/percent/i.test(k)))
})
test('feed bounds, thread parents and source keys survive while invalid roles are rejected',()=>{
 const posts=Array.from({length:400},(_,i)=>({id:String(i),channel:'all',parent:'question',source:'p:r:e',role:'employee',name:'Employee',text:'x'.repeat(12000),at:i,state:'done'}))
 const result=parseOfficePosts([...posts,{id:'bad',channel:'all',role:'system',name:'Injected',text:'bad',at:2}]);assert.ok(result.length<=300);assert.ok(result.reduce((n,p)=>n+p.text.length,0)<=300000);assert.ok(result.every(p=>p.parent==='question'&&p.source==='p:r:e'));assert.deepEqual(parseOfficePosts({}),[])
})

test('common credentials are redacted from report evidence while task text survives',()=>{const raw='Task review ready. API_KEY=private-value Authorization: Bearer private-token password="private password"';const clean=redactStatusText(raw);assert.ok(clean.includes('Task review ready'));for(const secret of ['private-value','private-token','private password'])assert.ok(!clean.includes(secret));assert.ok(clean.includes('[redacted]'))})
