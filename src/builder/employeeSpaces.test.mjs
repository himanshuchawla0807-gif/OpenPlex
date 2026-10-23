import test from 'node:test'
import assert from 'node:assert/strict'
import {hiredEmployees,pageEmployees,parseSpaces,gridRows} from './employeeSpaces.ts'
import {createProject,addRoom,addEmployee} from './workspace.ts'
test('same character in different projects keeps independent session identity',()=>{
 const projects=['A','B'].map(name=>{let p=addRoom(createProject(name),'connected-office');return addEmployee(p,p.rooms[0].id,0)})
 const employees=hiredEmployees(projects)
 assert.equal(employees.length,2);assert.notEqual(employees[0].key,employees[1].key)
 assert.equal(employees[0].profile.name,'Oscar')
})
test('six-panel paging never drops employees and clamps stale page selections',()=>{
 const employees=Array.from({length:14},(_,i)=>i)
 assert.deepEqual([0,1,2].flatMap(page=>pageEmployees(employees,page).items),employees)
 assert.deepEqual(pageEmployees(employees,99),{pages:3,page:2,items:[12,13]})
 assert.deepEqual(pageEmployees([],3),{pages:1,page:0,items:[]})
 assert.equal(pageEmployees(employees,NaN).page,0)
})
test('saved spaces sanitize corrupt records, duplicate IDs and duplicate employees',()=>{
 const raw=[null,{id:'one',name:' Focus ',keys:['a','a',null,4,'b']},{id:'one',name:'Duplicate',keys:[]},{id:'two',name:' ',keys:[]}]
 assert.deepEqual(parseSpaces(raw),[{id:'one',name:'Focus',keys:['a','b']}])
 assert.deepEqual(parseSpaces({}),[])
 assert.equal(parseSpaces(Array.from({length:80},(_,i)=>({id:String(i),name:'x',keys:[]}))).length,50)
})
test('one through eight panels page without loss and final pages contain only actual employees',()=>{
 const staff=Array.from({length:19},(_,i)=>i)
 for(let size=1;size<=8;size++){
  const pages=pageEmployees(staff,0,size).pages
  assert.deepEqual(Array.from({length:pages},(_,page)=>pageEmployees(staff,page,size).items).flat(),staff)
  assert.ok(pageEmployees(staff,pages-1,size).items.length<=size)
 }
})

test('partial grids fill balanced rows without unused cells',()=>{
 for(let count=1;count<=8;count++){const rows=gridRows(count);assert.equal(rows.reduce((a,b)=>a+b,0),count);assert.ok(Math.max(...rows)-Math.min(...rows)<=1)}
 assert.deepEqual(gridRows(4),[2,2]);assert.deepEqual(gridRows(5),[3,2]);assert.deepEqual(gridRows(8),[4,4])
})
test('office-scoped workspace shows exactly its hires, never another project’s duplicate cast',()=>{
 const projects=['Current office','Other office'].map(name=>addRoom(createProject(name),'connected-office'))
 for(const index of [0,1,2])projects[0]=addEmployee(projects[0],projects[0].rooms[0].id,index)
 for(const index of [0,1,3,4])projects[1]=addEmployee(projects[1],projects[1].rooms[0].id,index)
 const scoped=hiredEmployees(projects,projects[0].id)
 assert.equal(scoped.length,3);assert.deepEqual(scoped.map(e=>e.index),[0,1,2]);assert.ok(scoped.every(e=>e.project.id===projects[0].id))
 assert.equal(hiredEmployees(projects,'removed-project').length,0)
})
