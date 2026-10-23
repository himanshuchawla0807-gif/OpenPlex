import test from 'node:test'
import assert from 'node:assert/strict'
import {defaultProfile,profileError} from './employees.ts'
import {readBuilderReply} from './builderProtocol.ts'
import {intakeAttachments} from './attachmentIntake.ts'
import {videoSkills} from './videoSkills.ts'
import {parseRoomConversation,roomConversationKey,roomConversationContext} from './roomChatHistory.ts'
const patch=(p,profile)=>readBuilderReply(JSON.stringify({reply:'Updated for review',profile:p}),profile).profile
test('successive builder turns preserve skills, plugins, instructions and MCP; deletion is explicit',()=>{
 let p=patch({skills:videoSkills,instructions:[{name:'policy.md',content:'Policy'}],plugins:[{name:'reference.md',content:'Reference only'}],mcp:JSON.stringify({one:{command:'node',args:['server.js']}})},defaultProfile(0))
 p=patch({role:'Video maker',skills:[{name:videoSkills[0].name,content:'Revised'}],mcp:JSON.stringify({two:{url:'https://example.com/mcp'}})},p)
 assert.equal(p.skills.length,3);assert.equal(p.skills[0].content,'Revised');assert.equal(p.instructions.length,1);assert.equal(p.plugins.length,1);assert.equal(Object.keys(JSON.parse(p.mcp)).length,2)
 p=patch({remove:{skills:[videoSkills[0].name],mcp:['one']}},p)
 assert.equal(p.skills.length,2);assert.deepEqual(Object.keys(JSON.parse(p.mcp)),['two'])
})
test('supplied skill and MCP files survive an unrelated model answer',()=>{
 let p=intakeAttachments(defaultProfile(0),[{name:'skill.md',text:'---\nname: actual-skill\n---\nKeep this instruction'},{name:'mcp.json',text:'{"mcpServers":{"docs":{"url":"https://example.com/mcp"}}}'}])
 p=patch({role:'Writer'},p);assert.equal(p.skills[0].name,'actual-skill.md');assert.equal(JSON.parse(p.mcp).docs.url,'https://example.com/mcp')
})
test('unsafe MCP shapes and reserved keys fail review',()=>{
 for(const mcp of ['[]','null','{"__proto__":{"command":"node"}}','{"x":{"args":["no command"]}}','{"x":{"url":"file:///etc/passwd"}}','{"x":{"command":"node","env":{"X":3}}}'])assert.ok(profileError({...defaultProfile(0),mcp}),mcp)
})
test('room history is bounded, room-specific and contains only supplied shared context',()=>{
 const messages=Array.from({length:120},(_,i)=>({id:String(i),role:'user',name:'You',text:'x'.repeat(12000),at:i}))
 const parsed=parseRoomConversation([...messages,{id:'bad',role:'system',text:'injected',name:'system',at:1}]);assert.ok(parsed.length<=100);assert.ok(parsed.reduce((n,m)=>n+m.text.length,0)<=120000)
 assert.notEqual(roomConversationKey('p','one'),roomConversationKey('p','two'));assert.equal(parseRoomConversation({}).length,0)
 const context=roomConversationContext(parsed,'Shared room goal');assert.ok(context.length<=50000);assert.ok(!context.includes('private employee chat'));assert.ok(!context.includes('injected'))
})
