export interface ConversationMessage {role:'user'|'assistant';text:string}
/** Codex OSC 7501 reports activity independently of its visible prompt redraws. */
export function terminalActivity(payload:string):boolean|undefined{
 const state=payload.match(/^state=(working|idle|done):app=codex$/)?.[1]
 return state===undefined?undefined:state==='working'
}
const cliUpdateMenu=(text:string)=>/^1\.\s+Update now \(runs [\s\S]*https:\/\/chatgpt\.com\/\s*codex\/install\.sh/.test(text)
const placeholder=/^(?:Ask Codex to do anything|What would you like to do\?)$/i
const chrome=/^(?:Worked for \d|[─━]{3,}|[╭╰│╮╯]|[›❯]\s*$|GPT[-– ]|gpt-|\? for shortcuts|\d+% context|context left|Tip:|shift\+tab|esc to interrupt|[⚠△].*warnings|[•◦✻✽✶✳⏺]\s*(?:Working|Thinking|Running|Reading|Searching|Compacting))/i
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
 return messages.map(m=>({...m,text:m.text.trim()})).filter(m=>m.text&&!(m.role==='user'&&cliUpdateMenu(m.text)))
}
export function mergeConversation(saved:ConversationMessage[],live:ConversationMessage[]):ConversationMessage[]{
 saved=saved.filter(m=>!(m.role==='user'&&cliUpdateMenu(m.text))).map(m=>m.role==='user'?{...m,text:m.text.replace(/\n\s*◦\s*(?:Working|Thinking)\s*\([^)]*\)[\s\S]*$/,'').trim()}:m)
 saved=saved.filter((m,i)=>!(m.role==='user'&&i>0&&saved[i-1].role==='user'&&saved[i-1].text===m.text))
 live=live.filter(m=>!(m.role==='user'&&cliUpdateMenu(m.text)))
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
 for(const index of starts){const old=saved.slice(index).filter(m=>m.role==='user').map(m=>m.text);let score=0;while(score<Math.min(old.length,users.length)&&samePrompt(old[score],users[score]))score++;if(score>=bestScore&&score>0){best=index;bestScore=score}}
 if(best>=0&&samePrompt(saved[best].text,live[0].text))live[0].text=saved[best].text
 let result:ConversationMessage[]
 if(best<0)result=[...saved,...live]
 else {
  const oldUserIndices=saved.flatMap((message,index)=>index>=best&&message.role==='user'?[index]:[])
  // A redraw can still show the previous turn just after a new input was sent.
  // Preserve submitted turns newer than the decoded screen instead of deleting them.
  const trailing=bestScore===users.length?oldUserIndices[bestScore]:undefined
  const lastUser=oldUserIndices[bestScore-1]
  const savedAnswer=live.at(-1)?.role==='user'&&lastUser!==undefined?saved.slice(lastUser+1,trailing):[]
  result=[...saved.slice(0,best),...live,...savedAnswer,...(trailing===undefined?[]:saved.slice(trailing))]
 }
 return result.slice(-100)
}

/** Tracks accepted terminal input as well as composer pastes. This is deliberately
 * independent of CLI screen redraws: a submitted prompt must survive resizing or
 * a renderer which removes that prompt from its visible screen. History/search
 * invalidate the local draft; the decoded terminal projection remains fallback. */
export class TerminalConversationInput {
 private text='';private cursor=0;private escape='';private pasting=false;private known=true
 write(data:string):string[]{
  const submitted:string[]=[]
  for(const ch of data){
   if(this.escape){
    this.escape+=ch
    if(this.escape==='\x1b[')continue
    if(this.escape.startsWith('\x1b[')&&!/[A-Za-z~]$/.test(this.escape))continue
    const sequence=this.escape;this.escape=''
    if(sequence==='\x1b[200~')this.pasting=true
    else if(sequence==='\x1b[201~')this.pasting=false
    else if(sequence==='\x1b[D')this.cursor=Math.max(0,this.cursor-1)
    else if(sequence==='\x1b[C')this.cursor=Math.min(this.text.length,this.cursor+1)
    else if(sequence==='\x1b[H'||sequence==='\x1b[1~')this.cursor=0
    else if(sequence==='\x1b[F'||sequence==='\x1b[4~')this.cursor=this.text.length
    else if(sequence==='\x1b[3~')this.text=this.text.slice(0,this.cursor)+this.text.slice(this.cursor+1)
    else this.known=false
    continue
   }
   if(ch==='\x1b'){this.escape=ch;continue}
   if((ch==='\r'||ch==='\n')&&!this.pasting){
    const value=this.text.trim()
    if(this.known&&value&&!value.startsWith('/'))submitted.push(value)
    this.text='';this.cursor=0;this.known=true;continue
   }
   if(ch==='\x03'){this.text='';this.cursor=0;this.known=true;continue}
   if(ch==='\x01'){this.cursor=0;continue}
   if(ch==='\x05'){this.cursor=this.text.length;continue}
   if(ch==='\x15'){this.text=this.text.slice(this.cursor);this.cursor=0;continue}
   if(ch==='\x0b'){this.text=this.text.slice(0,this.cursor);continue}
   if(ch==='\x17'){const before=this.text.slice(0,this.cursor).replace(/\S+\s*$/,'');this.text=before+this.text.slice(this.cursor);this.cursor=before.length;continue}
   if(ch==='\x7f'||ch==='\b'){if(this.cursor){this.text=this.text.slice(0,this.cursor-1)+this.text.slice(this.cursor);this.cursor--}continue}
   if(ch<' '&&ch!=='\n'&&ch!=='\r'&&ch!=='\t'){this.known=false;continue}
   if(this.text.length<40000){this.text=this.text.slice(0,this.cursor)+ch+this.text.slice(this.cursor);this.cursor+=ch.length}
  }
  return submitted
 }
}
