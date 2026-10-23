export interface ConversationMessage {role:'user'|'assistant';text:string}
const placeholder=/^(?:Ask Codex to do anything|What would you like to do\?)$/i
const chrome=/^(?:Worked for \d|[─━]{3,}|[╭╰│╮╯]|[›❯]\s*$|GPT[-– ]|gpt-|\? for shortcuts|\d+% context|context left|Tip:|shift\+tab|esc to interrupt|[⚠△].*warnings|[•✻✽✶✳⏺]\s*(?:Working|Thinking|Running|Reading|Searching|Compacting))/i
/** Project known CLI speaker markers from xterm's decoded, unwrapped buffer.
 * Unknown output stays in Terminal/activity; it is never invented as a reply. */
export function projectConversation(snapshot:string):ConversationMessage[]{
 const messages:ConversationMessage[]=[]
 let current:ConversationMessage|undefined,skip=false
 for(const line of snapshot.split('\n')){
  const user=line.match(/^\s*[›❯]\s+(.+)/),assistant=line.match(/^\s*[•●⏺]\s+(.+)/)
  if(user){
   if(placeholder.test(user[1])){current=undefined;skip=true;continue}
   current={role:'user',text:user[1]};messages.push(current);skip=false
  }else if(chrome.test(line.trim())){current=undefined;skip=true}
  else if(assistant){current={role:'assistant',text:assistant[1]};messages.push(current);skip=false}
  else if(current&&!skip){current.text+='\n'+line.replace(/^ {2}/,'')}
 }
 return messages.map(m=>({...m,text:m.text.trim()})).filter(m=>m.text)
}
export function mergeConversation(saved:ConversationMessage[],live:ConversationMessage[]):ConversationMessage[]{
 if(!live.length)return saved
 live=live.map(message=>({...message}))
 const lastSavedUser=saved.findLast(m=>m.role==='user'),lastLiveUser=live.findLast(m=>m.role==='user')
 // Codex collapses multiline bracketed pastes into a terminal placeholder.
 // Keep the original composer text rather than displaying that placeholder.
 if(lastSavedUser&&lastLiveUser&&/^\[Pasted (?:text|Content)/i.test(lastLiveUser.text))lastLiveUser.text=lastSavedUser.text
 // A bounded scrollback can begin halfway through an older assistant turn.
 // Retain it in activity rather than appending it repeatedly as a new answer.
 const firstUser=live.findIndex(m=>m.role==='user')
 if(firstUser<0)return saved
 live=live.slice(firstUser)
 // Match the longest overlap of user turns. This handles replay, terminal
 // redraws, and repeated identical prompts without duplicating the transcript.
 const normalizePrompt=(text:string)=>text.replace(/\s+/g,' ').trim()
 const samePrompt=(a:string,b:string)=>normalizePrompt(a)===normalizePrompt(b)||(a.includes('\n')&&a.split('\n')[0]===b)
 const starts=saved.flatMap((m,i)=>m.role==='user'&&samePrompt(m.text,live[0].text)?[i]:[])
 let best=-1,bestScore=0
 const users=live.filter(m=>m.role==='user').map(m=>m.text)
 for(const index of starts){const old=saved.slice(index).filter(m=>m.role==='user').map(m=>m.text);let score=0;while(score<Math.min(old.length,users.length)&&samePrompt(old[score],users[score]))score++;if(score>bestScore){best=index;bestScore=score}}
 if(best>=0&&samePrompt(saved[best].text,live[0].text))live[0].text=saved[best].text
 const result=best<0?[...saved,...live]:[...saved.slice(0,best),...live]
 return result.slice(-100)
}
