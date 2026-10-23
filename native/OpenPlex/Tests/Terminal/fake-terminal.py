#!/usr/bin/python3
"""Local PTY fixture. Never imports a provider or makes network requests."""
import os, sys, json, signal, termios, tty, fcntl, struct
assert all(os.isatty(fd) for fd in (0,1,2))
with open('/dev/tty','rb',buffering=0) as controlling:
    assert os.isatty(controlling.fileno())
assert os.getsid(0)==os.getpid()
assert not any('bypass' in arg or 'skip-permissions' in arg for arg in sys.argv)
if '--sandbox' in sys.argv:
    assert sys.argv[sys.argv.index('--sandbox')+1]=='read-only'
    assert '--ask-for-approval' in sys.argv
else:
    assert '--permission-mode' in sys.argv
    assert sys.argv[sys.argv.index('--permission-mode')+1]=='plan'
def size():
    rows,cols,_,_=struct.unpack('HHHH',fcntl.ioctl(0,termios.TIOCGWINSZ,b'\0'*8))
    return f'SIZE:{cols}x{rows}\n'.encode()
signal.signal(signal.SIGWINCH,lambda *_:os.write(1,size()))
tty.setraw(0)
os.write(1,b'\x1b[32mREADY\x1b[0m\n'+size())
pending=b''
while True:
    chunk=os.read(0,4096)
    if not chunk: break
    pending+=chunk
    while b'\n' in pending:
        line,pending=pending.split(b'\n',1)
        if line==b'SIZE':
            os.write(1,size())
            continue
        if line==b'QUIT':
            os.write(1,b'BYE\n')
            sys.exit(0)
        response=b'ACK:'+line+' café 🌱\n'.encode()
        for start in range(0,len(response),3): os.write(1,response[start:start+3])
