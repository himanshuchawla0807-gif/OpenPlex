import {test} from 'node:test'
import assert from 'node:assert/strict'
import {projectConversation,mergeConversation} from './conversation.ts'
import {readBuilderReply} from './builderProtocol.ts'
import {defaultProfile} from './employees.ts'
test('Codex chrome and prompt footer stay out of chat while reply streams',()=>{
 const start='OpenAI Codex (v0.163.0)\n/init - create instructions\n› Hello, how’s it going?\n\n• Hey Himanshu! Going well—Otis here'
 const first=projectConversation(start)
 assert.deepEqual(first,[{role:'user',text:'Hello, how’s it going?'},{role:'assistant',text:'Hey Himanshu! Going well—Otis here'}])
 const final=projectConversation(start+', ready to help.\n\n  How are you?\n\nWorked for 9s • 2:52 PM\n› Ask Codex to do anything\nGPT-6.1-Sol medium · /tmp/office')
 assert.equal(final[1].text,'Hey Himanshu! Going well—Otis here, ready to help.\n\nHow are you?')
 assert.equal(final.length,2)
})
test('replay and successive snapshots replace streamed answers without duplication',()=>{
 const saved=[{role:'user',text:'Hello'}]
 const live=[...saved,{role:'assistant',text:'Hi'}]
 assert.deepEqual(mergeConversation(saved,live),live)
 assert.deepEqual(mergeConversation(live,[...saved,{role:'assistant',text:'Hi there'}]),[...saved,{role:'assistant',text:'Hi there'}])
 assert.deepEqual(mergeConversation(live,[]),live)
})
test('repeated prompts preserve distinct turns and terminal-only messages',()=>{
 const saved=[{role:'user',text:'Hello'},{role:'assistant',text:'One'},{role:'user',text:'Hello'}]
 const live=[...saved,{role:'assistant',text:'Two'}]
 assert.deepEqual(mergeConversation(saved,live),live)
 assert.equal(projectConversation('❯ Implement login\n● I can help.')[0].text,'Implement login')
 assert.deepEqual(projectConversation('Unknown provider startup\nnot an assistant marker'),[])
})
test('multiline paste placeholders retain the actual message and partial scrollback cannot duplicate replies',()=>{
 const user={role:'user',text:'Review this brief\n\nAttached file: brief.md\nVerify sources.'}
 const merged=mergeConversation([user],[{role:'user',text:'[Pasted text #1 +3 lines]'},{role:'assistant',text:'I will verify sources.'}])
 assert.equal(merged[0].text,user.text);assert.equal(merged.length,2)
 assert.deepEqual(mergeConversation(merged,[{role:'assistant',text:'a clipped answer'}]),merged)
})
test('builder accepts validated partial profile and rejects invalid model configuration',()=>{
 const previous=defaultProfile(0)
 const result=readBuilderReply(JSON.stringify({reply:'Let’s define the research scope.',profile:{role:'Research lead',instructions:[{name:'research.md',content:'Verify sources.'}]}}),previous)
 assert.equal(result.profile.role,'Research lead');assert.equal(result.profile.name,previous.name)
 for(const profile of [{harness:'made-up'},{mcp:'invalid'},{systemPrompt:'a'.repeat(24001)},{skills:[{name:'test',content:3}]},{arbitraryCommand:'rm -rf'}])assert.throws(()=>readBuilderReply(JSON.stringify({reply:'Hi',profile}),previous))
 assert.equal(readBuilderReply('{"reply":"What should this employee do?","profile":null}',previous).profile,previous)
})
test('resizing a terminal and wrapping its prompt cannot duplicate a chat turn',()=>{
 const user={role:'user',text:'Connection check: reply with exactly Gus is ready. Do not change files.'}
 const saved=[user,{role:'assistant',text:'Gus is ready.'}]
 const live=[{role:'user',text:'Connection check: reply with exactly Gus is ready. Do\nnot change files.'},{role:'assistant',text:'Gus is ready.'}]
 assert.deepEqual(mergeConversation(saved,live),saved)
 assert.deepEqual(mergeConversation(mergeConversation(saved,live),[user,{role:'assistant',text:'Gus is ready.'}]),saved)
})
