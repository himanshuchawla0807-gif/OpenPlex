// Local recording bridge. Not part of the release or a production web server.
import {spawn,spawnSync} from 'node:child_process'
import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync,existsSync,copyFileSync,chmodSync} from 'node:fs'
import {resolve} from 'node:path'
const root=resolve('output/recording'),workspace=resolve(process.env.OPENPLEX_RECORDING_FOLDER||resolve(root,'workspace')),origin='http://127.0.0.1:5180',token=randomBytes(32).toString('hex')
mkdirSync(workspace,{recursive:true});mkdirSync(root+'/native',{recursive:true})
if(!existsSync(root+'/bridge')){
 copyFileSync('scripts/recording-bridge.swift',root+'/native/main.swift')
 const sources=['AgentRuntime','EmployeeWorkspace','HarnessTerminal','ToolTrust'].map(n=>`native/OpenPlex/Sources/OpenPlex/${n}.swift`)
 const compile=spawnSync('swiftc',['-O',...sources,root+'/native/main.swift','-o',root+'/bridge'],{stdio:'inherit'})
 if(compile.status!==0)process.exit(1)
}
const codex=spawnSync('/usr/bin/which',['codex'],{encoding:'utf8'}).stdout.trim()
if(!codex)throw Error('Install and sign in to Codex before starting live recording connections.')
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'"
writeFileSync(root+'/codex-recording',`#!/bin/sh\nexec ${quote(codex)} -m ${quote(process.env.OPENPLEX_RECORDING_MODEL||'gpt-6-luna')} -c 'model_reasoning_effort="low"' -c check_for_update_on_startup=false -c project_doc_max_bytes=0 -c mcp_servers.computer-use.enabled=false -c mcp_servers.node_repl.enabled=false -c mcp_servers.rea.enabled=false -c mcp_servers.context7.enabled=false "$@"\n`)
chmodSync(root+'/codex-recording',0o700)
writeFileSync('output/recording-bridge.js',`const token=${JSON.stringify(token)},base='http://127.0.0.1:5193';
const cursorResponse=await fetch(base+'/cursor',{headers:{'X-Recording-Token':token}});if(!cursorResponse.ok)throw Error('Recording bridge unavailable');let since=(await cursorResponse.json()).cursor;
const key='small-office.projects.v1',projects=JSON.parse(localStorage.getItem(key)||'[]');for(const p of projects)if(p.id==='openplex-recording-v1')p.workingDirectory=${JSON.stringify(workspace)};localStorage.setItem(key,JSON.stringify(projects));
window.webkit={messageHandlers:{openplex:{postMessage(data){fetch(base+'/command',{method:'POST',headers:{'X-Recording-Token':token,'Content-Type':'application/json'},body:JSON.stringify(data)}).catch(console.error)}}}};
setInterval(async()=>{try{const r=await fetch(base+'/events?since='+since,{headers:{'X-Recording-Token':token}});for(const e of await r.json()){since=e.seq;window.dispatchEvent(new CustomEvent(e.name,{detail:e.detail}))}}catch{}},80);
`)
const child=spawn(root+'/bridge',[workspace,root+'/codex-recording'],{stdio:['pipe','pipe','inherit']})
let pending='',events=[],sequence=0,closing=false
child.stdout.on('data',chunk=>{pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);try{events.push({...JSON.parse(line),seq:++sequence});if(events.length>4000)events.shift()}catch{}}})
const server=createServer(async(req,res)=>{
 if(req.headers.origin!==origin||req.method!=='OPTIONS'&&req.headers['x-recording-token']!==token){res.writeHead(403);res.end();return}
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','X-Recording-Token,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
 if(req.method==='OPTIONS'){res.end();return}
 if(req.method==='GET'&&req.url==='/cursor'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({cursor:sequence}));return}
 if(req.method==='GET'&&req.url.startsWith('/events?')){const since=Number(new URL(req.url,'http://localhost').searchParams.get('since'))||0;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(events.filter(e=>e.seq>since)));return}
 if(req.method!=='POST'||req.url!=='/command'){res.writeHead(404);res.end();return}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000){res.writeHead(413);res.end();return}}
 try{const command=JSON.parse(raw);if(!String(command.key??'').includes('openplex-recording-v1')&&!['harness-inventory'].includes(command.action))throw Error('Recording sandbox only');child.stdin.write(JSON.stringify(command)+'\n');res.end('{}')}catch{res.writeHead(400);res.end()}
})
const stop=()=>{if(closing)return;closing=true;child.stdin.end('{"action":"shutdown"}\n');server.close();setTimeout(()=>process.exit(),1600)}
process.on('SIGINT',stop);process.on('SIGTERM',stop);child.on('exit',()=>{server.close();if(!closing)process.exitCode=1})
server.listen(5193,'127.0.0.1',()=>console.log('Recording connections ready. No inference starts until you send a message.\n'+origin+'/?builder&recording=reference&motion=full\n'+origin+'/?builder&recording=cinematic&motion=full'))
