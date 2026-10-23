import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const paths=git('ls-files','-z','--cached','--others','--exclude-standard').split('\0').filter(Boolean);
const patterns=[/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{50,}/,/sk-or-v1-[A-Za-z0-9]{30,}/,/ksk_[A-Za-z0-9]{20,}/,/AIza[0-9A-Za-z_-]{35}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/[A-Za-z]:[\\/]Users[\\/][^\\/\s<>]+/i];
const privateValues=[process.env.RELEASE_PRIVATE_EMAIL,process.env.USERPROFILE,...['INWORLD_API_KEY','GEMINI_API_KEY','OPENROUTER_API_KEY','GH_TOKEN','GITHUB_TOKEN'].map(k=>process.env[k])].filter(v=>v&&v.length>7);
let errors=0,history=0;
function inspect(name,bytes){
  const text=bytes.toString('utf8');
  if(patterns.some(pattern=>pattern.test(text))||privateValues.some(value=>bytes.includes(Buffer.from(value)))){
    console.error(name+': credential/private-path pattern or exact private value detected; value hidden');errors++;
  }
}
for(const name of new Set(paths)){
  if(/(^|\/)(?:node_modules|work|outputs?|dist|\.codex|\.aws)\//.test(name)||/\.(?:mp4|mov|wav|mp3|pcm|zip|pem|key|log)$/i.test(name)||/(^|\/)\.env(?:$|\.)/.test(name)&&!name.endsWith('.env.example')){console.error(name+': forbidden public entry');errors++;continue;}
  if(lstatSync(resolve(name)).isSymbolicLink()){console.error(name+': source symlink rejected');errors++;continue;}
  inspect(name,readFileSync(name));
}
try{
  for(const line of git('rev-list','--objects','--all').split('\n').filter(Boolean)){
    const [oid,...parts]=line.split(' ');if(!parts.length||git('cat-file','-t',oid).trim()!=='blob')continue;
    inspect('history/'+parts.join(' '),execFileSync('git',['cat-file','blob',oid],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']}));history++;
  }
  inspect('commit metadata',Buffer.from(git('log','--all','--format=%ae%x00%ce%x00%B')));
}catch(error){if(git('rev-list','--all').trim())throw error;}
if(errors)process.exitCode=1;
else console.log('Release scan passed: '+new Set(paths).size+' files; '+history+' history blobs. Pattern scan and supplied exact values checked; no matching values printed.');
