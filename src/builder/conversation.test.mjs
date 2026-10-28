import {test} from 'node:test'
import assert from 'node:assert/strict'
import {projectConversation,mergeConversation,terminalActivity,TerminalConversationInput} from './conversation.ts'
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
test('Codex installer menu is chrome, including wrapped replay from older app transcripts',()=>{
 const menu="1. Update now (runs sh -c 'curl -fsSL https://chatgpt.com/\n   codex/install.sh | CODEX_NON_INTERACTIVE=1 sh')\n2. Skip\n3. Skip until next version"
 const task={role:'user',text:'Introduce yourself'},answer={role:'assistant',text:'I am Bruno.'}
 assert.deepEqual(projectConversation('› '+menu+'\n› Introduce yourself\n• I am Bruno.'),[task,answer])
 assert.deepEqual(mergeConversation([{role:'user',text:menu},task,answer],[]),[task,answer])
 assert.deepEqual(projectConversation('› 1. Update now the employee profile\n• Which role?'),[{role:'user',text:'1. Update now the employee profile'},{role:'assistant',text:'Which role?'}])
})

test('Codex activity protocol keeps streaming and idle independent of prompt chrome',()=>{
 assert.equal(terminalActivity('state=working:app=codex'),true)
 for(const state of ['idle','done'])assert.equal(terminalActivity(`state=${state}:app=codex`),false)
 for(const payload of ['state=working:app=unknown','state=unknown:app=codex','Working…','state=working:app=codex;injected'])assert.equal(terminalActivity(payload),undefined)
})


test('terminal typing and chat bracketed pastes submit the same canonical user turns',()=>{
 const input=new TerminalConversationInput()
 assert.deepEqual(input.write('Hel'),[])
 assert.deepEqual(input.write('lo!\x7f\r'),['Hello'])
 assert.deepEqual(input.write('\x1b[200~Review this brief\nKeep the context.\x1b[201~\r'),['Review this brief\nKeep the context.'])
 assert.deepEqual(input.write('/model\r'),[])
 assert.deepEqual(input.write('cancelled\x03next task\r'),['next task'])
})
test('terminal input editing is tracked while history is left to the screen projection',()=>{
 const input=new TerminalConversationInput()
 assert.deepEqual(input.write('Helo\x1b[Dll\x7f\x1b[F\r'),['Hello'])
 assert.deepEqual(input.write('unknown\x1b[A\r'),[])
 assert.deepEqual(input.write('known again\r'),['known again'])
 assert.deepEqual(input.write('first second\x17third\r'),['first third'])
})
test('partial redraws cannot discard freshly submitted terminal prompts or previous answers',()=>{
 const first={role:'user',text:'First'},answer={role:'assistant',text:'One'},pending={role:'user',text:'Next'}
 assert.deepEqual(mergeConversation([first,answer,pending],[first,answer]),[first,answer,pending])
 assert.deepEqual(mergeConversation([first,answer],[first]),[first,answer])
})
test('assistant-only projection anchored to the latest repeated input updates that turn',()=>{
 const first={role:'user',text:'Hello'},one={role:'assistant',text:'One'},two={role:'assistant',text:'Two'}
 assert.deepEqual(mergeConversation([first,one,first],[first,two]),[first,one,first,two])
 assert.deepEqual(mergeConversation([first,one,first,two],[first,{...two,text:'Two, still streaming'}]),[first,one,first,{...two,text:'Two, still streaming'}])
})

// Captured from the live Codex 0.165 recording smoke check.
test('hollow working spinner redraws never become repeated user messages',()=>{
 const prompt={role:'user',text:'Summarize the fictional demo task.'}
 let saved=[prompt]
 for(let n=0;n<4;n++)saved=mergeConversation(saved,projectConversation(`› ${prompt.text}\n\n◦ Working (${n}s • esc to interrupt)\n\n› Ask Codex to do anything`))
 assert.deepEqual(saved,[prompt])
 saved=mergeConversation(saved,projectConversation(`› ${prompt.text}\n• The checklist is drafted.`))
 assert.deepEqual(saved,[prompt,{role:'assistant',text:'The checklist is drafted.'}])
 assert.deepEqual(mergeConversation([prompt,{role:'user',text:prompt.text+'\n\n◦ Working (1s • esc to interrupt)'}],[]),[prompt])
})
