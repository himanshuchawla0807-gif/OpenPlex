import {Fragment} from 'react'
// Text-only formatting: no HTML injection or remote images from agent output.
export function ChatText({text}:{text:string}){
 return <div className="chat-prose">{text.split(/(```[\s\S]*?(?:```|$))/g).map((block,i)=>block.startsWith('```')?<pre key={i}><code>{block.replace(/^```[^\n]*\n?/,'').replace(/```$/,'')}</code></pre>:<Fragment key={i}>{block.split(/\n\s*\n/).map((paragraph,j)=><p key={j}>{paragraph.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part,k)=>part.startsWith('`')?<code key={k}>{part.slice(1,-1)}</code>:part.startsWith('**')?<strong key={k}>{part.slice(2,-2)}</strong>:part)}</p>)}</Fragment>)}</div>
}
