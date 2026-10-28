import test from 'node:test'
import assert from 'node:assert/strict'
import {addEmployee,addRoom,arrangeRooms,createProject,parseProjects,projectDefinitions} from './workspace.ts'
import {officeDefinitions} from '../procedural/officeRooms.ts'
import {arrangeFootprints} from '../procedural/roomLayout.ts'
test('an identity can only be hired once across a project, including restored data',()=>{
 let p=addRoom(addRoom(createProject('Distinct team'),officeDefinitions[0].id),officeDefinitions[1].id)
 p=addEmployee(p,p.rooms[0].id,1)
 const duplicate=addEmployee(p,p.rooms[1].id,1)
 assert.deepEqual(duplicate,p)
 p.rooms[1].staff=[1,2]
 const restored=parseProjects(JSON.stringify([p]))[0]
 assert.deepEqual(restored.rooms[0].staff,[1]);assert.deepEqual(restored.rooms[1].staff,[2])
})
test('a blank project contains no rooms or employees; adding a room starts unstaffed',()=>{
 let p=createProject('My office');assert.equal(p.rooms.length,0)
 p=addRoom(p,officeDefinitions[0].id);assert.equal(p.rooms.length,1);assert.equal(p.rooms[0].staff.length,0)
 assert.equal(projectDefinitions(p)[0].templateId,officeDefinitions[0].id)
 assert.notEqual(projectDefinitions(p)[0].id,officeDefinitions[0].id)
})
test('staff additions enforce real seat capacity and prevent duplicate assignments',()=>{
 let p=addRoom(createProject('Team'),officeDefinitions[4].id),id=p.rooms[0].id,capacity=officeDefinitions[4].stations.length
 p=addEmployee(p,id,0);p=addEmployee(p,id,0);assert.equal(p.rooms[0].staff.length,1)
 for(let i=1;i<40;i++)p=addEmployee(p,id,i)
 assert.equal(p.rooms[0].staff.length,capacity)
 assert.deepEqual(addEmployee(p,id,-1),p);assert.deepEqual(addEmployee(p,id,1.5),p)
})
test('auto spacing never overlaps room footprints and preserves staff and names',()=>{
 const p=createProject('Campus',true),rooms=arrangeRooms(p.rooms)
 for(let a=0;a<rooms.length;a++)for(let b=a+1;b<rooms.length;b++){
  const x=rooms[a],y=rooms[b],xd=officeDefinitions.find(d=>d.id===x.templateId),yd=officeDefinitions.find(d=>d.id===y.templateId)
  assert.ok(x.origin.x+xd.width+3<=y.origin.x||y.origin.x+yd.width+3<=x.origin.x||x.origin.y+xd.depth+3<=y.origin.y||y.origin.y+yd.depth+3<=x.origin.y)
 }
 assert.deepEqual(rooms.map(r=>r.staff),p.rooms.map(r=>r.staff))
})
test('stored data round trips and invalid catalog, coordinates and employees are filtered',()=>{
 const p=createProject('Saved',true);assert.deepEqual(parseProjects(JSON.stringify([p])),[p]);assert.deepEqual(parseProjects('{broken'),[])
 p.rooms[0].staff=[0,0,-1,100,3.2,2];p.rooms.push({...p.rooms[1],id:'unknown',templateId:'unknown'});p.rooms.push({...p.rooms[1],id:'bad',origin:{x:NaN,y:0}})
 const read=parseProjects(JSON.stringify([p]))[0];assert.equal(read.rooms.length,officeDefinitions.length);assert.deepEqual(read.rooms[0].staff,[0,2])
})
test('main office stays near the center even when added last, with balanced campus bounds',()=>{
 const p=createProject('Centered',true)
 const input=[...p.rooms.slice(1),p.rooms[0]],rooms=arrangeRooms(input)
 const main=rooms.find(r=>r.templateId==='connected-office'),d=officeDefinitions[0]
 assert.ok(Math.abs(main.origin.x+d.width/2)<=d.width);assert.ok(Math.abs(main.origin.y+d.depth/2)<=d.depth)
 assert.deepEqual(rooms.map(r=>r.id),input.map(r=>r.id))
 const bounds=rooms.map(r=>({...r.origin,...officeDefinitions.find(d=>d.id===r.templateId)}))
 const minX=Math.min(...rooms.map(r=>r.origin.x)),maxX=Math.max(...rooms.map((r,i)=>r.origin.x+bounds[i].width))
 const minY=Math.min(...rooms.map(r=>r.origin.y)),maxY=Math.max(...rooms.map((r,i)=>r.origin.y+bounds[i].depth))
 assert.equal(minX+maxX,0);assert.equal(minY+maxY,0)
})
test('all supported campus sizes keep a circulation gap, including repeated main templates',()=>{
 const original=createProject('Campus',true).rooms
 for(let count=1;count<=100;count++){
  const rooms=arrangeRooms(Array.from({length:count},(_,i)=>({...original[i%original.length],id:`room-${i}`})))
  for(let a=0;a<rooms.length;a++)for(let b=a+1;b<rooms.length;b++){
   const x=rooms[a],y=rooms[b],xd=officeDefinitions.find(d=>d.id===x.templateId),yd=officeDefinitions.find(d=>d.id===y.templateId)
   assert.ok(x.origin.x+xd.width+3<=y.origin.x||y.origin.x+yd.width+3<=x.origin.x||x.origin.y+xd.depth+3<=y.origin.y||y.origin.y+yd.depth+3<=x.origin.y,`${count} rooms: ${a} overlaps ${b}`)
  }
 }
})
test('loading migrates automatic placement while retaining manual placement and local storage identity',()=>{
 const p=createProject('Saved',true)
 p.rooms=p.rooms.map((room,i)=>({...room,origin:{x:i*500,y:1200}}))
 const auto=parseProjects(JSON.stringify([p]))[0]
 assert.deepEqual(auto.rooms,arrangeRooms(p.rooms))
 assert.equal(auto.id,p.id);assert.equal(auto.updatedAt,p.updatedAt)
 p.staticLayout=false
 assert.deepEqual(parseProjects(JSON.stringify([p]))[0],p)
})

test('employee profiles survive reload, remain attached to room characters and reject orphan profiles',async()=>{
 const {defaultProfile,employeeKey}=await import('./employees.ts')
 let p=addEmployee(addRoom(createProject('Agents'),officeDefinitions[0].id),'missing',0)
 p=addEmployee(p,p.rooms[0].id,0)
 const key=employeeKey(p.rooms[0].id,0),profile={...defaultProfile(0),name:'Ada',systemPrompt:'Work carefully',instructions:[{name:'AGENTS.md',content:'Verify your work.'}],mcp:'{"tools":{"command":"example"}}'}
 p.employeeProfiles={[key]:profile,orphan:profile};p.workingDirectory='/tmp/office';p.officeContext={[p.rooms[0].id]:'Only this room',orphan:'not shared'}
 const saved=parseProjects(JSON.stringify([p]))[0]
 assert.deepEqual(saved.employeeProfiles,{[key]:profile});assert.deepEqual(saved.officeContext,{[p.rooms[0].id]:'Only this room'});assert.equal(saved.workingDirectory,'/tmp/office')
 const moved={...saved,rooms:arrangeRooms(saved.rooms)};assert.equal(moved.employeeProfiles[key].name,'Ada')
})
test('employee input is bounded and malformed file/config data does not become executable code',async()=>{
 const {parseProfile,profileError,defaultProfile,employeeBrief}=await import('./employees.ts')
 const profile=parseProfile({name:'   ',role:'x'.repeat(150),instructions:[{name:'../AGENTS.md',content:'a'.repeat(110000)},null],skills:'bad',mcp:'[]'},0)
 assert.equal(profile.name,defaultProfile(0).name);assert.equal(profile.role.length,120);assert.equal(profile.instructions.length,1);assert.equal(profile.instructions[0].content.length,100000);assert.ok(!profile.instructions[0].name.includes('/'));assert.deepEqual(profile.skills,[])
 assert.match(profileError(profile),/JSON object/);assert.match(profileError({...profile,mcp:'invalid'}),/valid JSON/);assert.equal(profileError({...profile,mcp:'{}'}),null)
 assert.match(employeeBrief({...defaultProfile(0),plugins:[{name:'Plugin',content:'Use only when needed'}]}),/not installed automatically/)
})

test('Casual style changes decor while preserving footprints, seats and employee identity',()=>{
 const modern=createProject('Modern',true),casual={...modern,theme:'casual'}
 const a=projectDefinitions(modern),b=projectDefinitions(casual)
 assert.notEqual(a[0].floor,b[0].floor);assert.notEqual(a[0].wall,b[0].wall);assert.notDeepEqual(a[0].furniture,b[0].furniture)
 assert.deepEqual(a.map(d=>({id:d.id,origin:d.origin,stations:d.stations,width:d.width,depth:d.depth})),b.map(d=>({id:d.id,origin:d.origin,stations:d.stations,width:d.width,depth:d.depth})))
 assert.equal(parseProjects(JSON.stringify([casual]))[0].theme,'casual');assert.equal(parseProjects(JSON.stringify([{...modern,theme:'unknown'}]))[0].theme,undefined)
})

test('duplicate imported projects retain their data under independent persistent identities',()=>{
 const first=createProject('Original',true),copy={...first,name:'Imported copy'}
 const restored=parseProjects(JSON.stringify([first,copy]))
 assert.equal(restored.length,2)
 assert.equal(restored[0].id,first.id)
 assert.notEqual(restored[1].id,first.id)
 assert.equal(restored[1].name,'Imported copy')
 assert.deepEqual(restored[1].rooms,first.rooms)
 assert.deepEqual(parseProjects(JSON.stringify(restored)),restored)
})

test('unselectable blank IDs are rejected without discarding valid neighboring projects',()=>{
 const valid=createProject('Valid',true)
 const invalid={...valid,id:'   '}
 const withInvalidRoom={...valid,id:'other',name:' ',rooms:[{...valid.rooms[0],id:''},valid.rooms[1]]}
 const restored=parseProjects(JSON.stringify([null,invalid,valid,withInvalidRoom]))
 assert.equal(restored.length,2)
 assert.equal(restored[0].id,valid.id)
 assert.equal(restored[1].name,'Untitled office')
 assert.deepEqual(restored[1].rooms.map(room=>room.id),[valid.rooms[1].id])
})

test('MCP server validation matches the native invocation boundary',async()=>{
 const {defaultProfile,profileError}=await import('./employees.ts')
 const base=defaultProfile(0)
 for(const mcp of ['{"bad.name":{}}','{"":{}}','{"local":null}','{"local":[]}','{"local":"command"}']){
  assert.ok(profileError({...base,mcp}),mcp)
 }
 assert.equal(profileError({...base,mcp:'{"local-tools_1":{"command":"example","args":[]}}'}),null)
})

test('oversized reference bundles fail before launching a native work session',async()=>{
 const {defaultProfile,profileError}=await import('./employees.ts')
 const base=defaultProfile(0),file={name:'context.md',content:'é'.repeat(100000)}
 assert.equal(profileError({...base,instructions:[file]}),null)
 assert.match(profileError({...base,instructions:Array.from({length:6},()=>file)}),/too large/)
})


test('CEO has one seat; legacy teams and their identity are preserved on restore',async()=>{
 const {defaultProfile,employeeKey}=await import('./employees.ts')
 let p=addRoom(createProject('Leadership'),'ceo-office'),id=p.rooms[0].id
 p=addEmployee(p,id,0);p=addEmployee(p,id,1)
 assert.deepEqual(p.rooms[0].staff,[0])
 p.rooms[0].staff=[0,1,2]
 const key=employeeKey(id,1);p.employeeProfiles={[key]:{...defaultProfile(1),name:'Existing manager',systemPrompt:'Keep this role'}}
 const restored=parseProjects(JSON.stringify([p]))[0]
 assert.deepEqual(restored.rooms.find(r=>r.id===id).staff,[0,1,2])
 assert.equal(restored.rooms.find(r=>r.id===id).templateId,'learning-room')
 assert.equal(restored.employeeProfiles[key].systemPrompt,'Keep this role')
 assert.equal(restored.rooms.filter(r=>r.templateId==='ceo-office').length,1)
 assert.deepEqual(restored.rooms.find(r=>r.templateId==='ceo-office').staff,[])
 assert.deepEqual(parseProjects(JSON.stringify([restored])),[restored])
})
test('campus placement is stable across add order and fills a compact diamond',()=>{
 const p=createProject('Balanced',true),placed=arrangeRooms(p.rooms)
 const reverse=arrangeRooms([...p.rooms].reverse())
 assert.deepEqual(Object.fromEntries(placed.map(r=>[r.id,r.origin])),Object.fromEntries(reverse.map(r=>[r.id,r.origin])))
 const footprints=placed.map(r=>({...r.origin,...officeDefinitions.find(d=>d.id===r.templateId)}))
 const width=Math.max(...footprints.map(f=>f.x+f.width))-Math.min(...footprints.map(f=>f.x))
 const depth=Math.max(...footprints.map(f=>f.y+f.depth))-Math.min(...footprints.map(f=>f.y))
 const filled=footprints.reduce((sum,f)=>sum+f.width*f.depth,0)/(width*depth)
 assert.ok(filled>.75,'Campus shelves must not leave large holes between offices')
 assert.ok(Math.max(width/depth,depth/width)<1.4,'Campus footprint should remain near-square')
})

// A fifteen-room recording campus must remain solid instead of starting a new ring.
test('fifteen rooms form contiguous balanced rows without a hollow center',()=>{
 const original=createProject('Recording',true).rooms
 const rooms=arrangeRooms(Array.from({length:15},(_,i)=>({...original[i%original.length],id:`demo-${i}`})))
 const footprints=rooms.map(r=>({...r.origin,...officeDefinitions.find(d=>d.id===r.templateId)}))
 const rows=new Map()
 for(const f of footprints){const row=rows.get(f.y)??[];row.push(f);rows.set(f.y,row)}
 assert.deepEqual([...rows.values()].map(row=>row.length).sort(),[3,4,4,4])
 for(const row of rows.values()){row.sort((a,b)=>a.x-b.x);for(let i=1;i<row.length;i++)assert.equal(row[i].x-row[i-1].x-row[i-1].width,3)}
 const width=Math.max(...footprints.map(f=>f.x+f.width))-Math.min(...footprints.map(f=>f.x))
 const depth=Math.max(...footprints.map(f=>f.y+f.depth))-Math.min(...footprints.map(f=>f.y))
 assert.ok(footprints.reduce((sum,f)=>sum+f.width*f.depth,0)/(width*depth)>.7)
})

test('mixed room sizes retain circulation gaps and deterministic identities',()=>{
 const catalog=[{id:'large',width:31,depth:28},{id:'small',width:12,depth:14},{id:'wide',width:27,depth:11}]
 for(let count=1;count<=40;count++){
  const source=Array.from({length:count},(_,i)=>({id:`mixed-${i}`,templateId:catalog[i%3].id,origin:{x:0,y:0}}))
  const rooms=arrangeFootprints(source,catalog),reversed=arrangeFootprints([...source].reverse(),catalog)
  assert.deepEqual(Object.fromEntries(rooms.map(r=>[r.id,r.origin])),Object.fromEntries(reversed.map(r=>[r.id,r.origin])))
  for(let a=0;a<count;a++)for(let b=a+1;b<count;b++){
   const x=rooms[a],y=rooms[b],xd=catalog.find(d=>d.id===x.templateId),yd=catalog.find(d=>d.id===y.templateId)
   assert.ok(x.origin.x+xd.width+3<=y.origin.x||y.origin.x+yd.width+3<=x.origin.x||x.origin.y+xd.depth+3<=y.origin.y||y.origin.y+yd.depth+3<=x.origin.y)
  }
 }
})
