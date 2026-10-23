#!/usr/bin/python3
"""Deterministic Claude stream-json fixture; no provider calls."""
import json, os, sys, time, uuid
assert '--print' in sys.argv
assert sys.argv[sys.argv.index('--output-format')+1]=='stream-json'
assert '--verbose' in sys.argv
assert sys.argv[sys.argv.index('--permission-mode')+1]=='plan'
assert sys.argv[sys.argv.index('--append-system-prompt')+1]=='Fixture system'
assert not any('bypass' in arg or 'skip-permissions' in arg for arg in sys.argv)
prompt=sys.stdin.read()
if 'STATUS_PROBE' in prompt:
    assert sys.argv[sys.argv.index('--tools')+1]==''
    assert '--strict-mcp-config' in sys.argv
    assert '--resume' not in sys.argv
assert 'Test employee' in prompt
thread=sys.argv[sys.argv.index('--resume')+1] if '--resume' in sys.argv else str(uuid.uuid4())
answer='Claude fixture café 🌱 '+('resumed' if '--resume' in sys.argv else 'new')
events=[dict(type='system',subtype='init',session_id=thread)]
if 'FAILED_TURN' in prompt:
    events.append(dict(type='result',subtype='error_during_execution',is_error=True,errors=['Claude fixture failure'],session_id=thread))
else:
    events.extend([dict(type='assistant',session_id=thread,message=dict(content=[dict(type='text',text=answer)])),dict(type='result',subtype='success',is_error=False,result=answer,session_id=thread)])
for event in events:
    data=json.dumps(event,ensure_ascii=False).encode()+b'\n'
    for start in range(0,len(data),7):
        os.write(1,data[start:start+7])
        time.sleep(.001)
