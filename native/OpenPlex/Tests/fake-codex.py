#!/usr/bin/python3
"""Deterministic local protocol fixture. Never calls Codex or a network service."""
import json, os, sys, time, uuid
assert 'sandbox_mode="read-only"' in sys.argv
assert 'developer_instructions="Fixture system"' in sys.argv
assert not any('bypass' in x for x in sys.argv)
prompt=sys.stdin.read()
if 'STATUS_PROBE' in prompt:
    assert '--disable' in sys.argv and 'shell_tool' in sys.argv and 'unified_exec' in sys.argv
    assert 'mcp_servers={}' not in sys.argv  # preserve transport while disabling individual servers
    assert 'resume' not in sys.argv
if 'FAILED_TURN' in prompt:
    # Protocol failure does not necessarily imply a nonzero process status.
    print(json.dumps(dict(type='turn.failed',error=dict(message='Fixture turn failed'))),end='')
    sys.exit(0)
if 'STDERR_UTF8' in prompt:
    diagnostic=('café 🌱'*15000+'\nlast diagnostic 🌱').encode()
    for start in range(0,len(diagnostic),7):
        os.write(2,diagnostic[start:start+7])
    sys.exit(0)
if 'LONG_TASK' in prompt:
    time.sleep(20)
thread=sys.argv[sys.argv.index('resume')+1] if 'resume' in sys.argv else str(uuid.uuid4())
for event in [dict(type='thread.started',thread_id=thread),dict(type='item.completed',item=dict(type='agent_message',text='Fixture answer: café 🌱 '+('resumed' if 'resume' in sys.argv else 'new'))),dict(type='turn.completed')]:
    data=(json.dumps(event,ensure_ascii=False)+'\n').encode()
    # Deliberately fragment UTF-8 and JSON to exercise pipe framing.
    for start in range(0,len(data),7):
        os.write(1,data[start:start+7])
        time.sleep(.001)
