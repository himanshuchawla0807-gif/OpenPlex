#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
assert args[:5]==['run','--standalone','--format','json','--agent']
assert args[5]=='openplex-builder'
config=json.loads(os.environ['OPENCODE_CONFIG_CONTENT'])
assert config['permission']=={'*':'deny'}
assert config['agent']['openplex-builder']['permission']=={'*':'deny'}
payload=sys.stdin.read()
if 'FAILED_TURN' in payload:
 print(json.dumps({'type':'error','sessionID':'ses_fixture1','error':{'message':'Fixture error'}}))
else:
 print(json.dumps({'type':'text','sessionID':'ses_fixture1','part':{'type':'text','text':'OpenCode fixture café 🌱'}}))
