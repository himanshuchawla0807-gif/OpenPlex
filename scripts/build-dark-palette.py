"""Build scoped dark surface/text overrides; preserve light CSS and all artwork."""
from pathlib import Path
import re
root=Path('src/builder');out=['/* Generated semantic dark palette. Regenerate with scripts/build-dark-palette.py. */']
def color(hexvalue,kind):
 h=hexvalue[1:];h=''.join(c*2 for c in h) if len(h) in (3,4) else h
 if len(h) not in (6,8):return hexvalue
 rgb=[int(h[n:n+2],16) for n in (0,2,4)];light=sum(c*w for c,w in zip(rgb,[.2126,.7152,.0722]))/255
 if kind=='color':target='#fff4e6' if light>.85 else '#eee5ec' if light<.42 else '#c3b1c0'
 elif 'border' in kind:target='#514550' if light>.5 else '#80667e'
 elif 'outline' in kind:target='#c6a4c2'
 else:target='#24222a' if light>.85 else '#302b36' if light>.65 else '#493b4b' if light>.45 else '#705572'
 return target+(h[6:] if len(h)==8 else '')
def selectors(value):
 parts=[];start=0;depth=0
 for i,c in enumerate(value):
  if c in '([':depth+=1
  elif c in ')]':depth-=1
  elif c==',' and depth==0:parts.append(value[start:i]);start=i+1
 parts.append(value[start:]);return parts
for file in sorted(root.glob('*.css')):
 if file.name=='dark-appearance.css':continue
 for match in re.finditer(r'([^{}]+)\{([^{}]*)\}',re.sub(r'/\*.*?\*/','',file.read_text(),flags=re.S)):
  selector,body=match.groups();selector=selector.strip()
  if selector.startswith('@') or '%' in selector or selector in ['from','to']:continue
  changes=[]
  for declaration in body.split(';'):
   if ':' not in declaration:continue
   prop,value=declaration.split(':',1);prop=prop.strip()
   if prop not in ['color','background','background-color','background-image','border','border-color','border-top','border-bottom','border-left','border-right','outline','outline-color','fill','stroke']:continue
   replacement=re.sub(r'#[\da-fA-F]{3,8}\b',lambda m:color(m[0],prop),value)
   changes.append(prop+':'+replacement)
  if changes:out.append(','.join(':root[data-appearance=dark] '+part.strip() for part in selectors(selector))+'{'+ ';'.join(changes)+'}')
out.append('''
:root[data-appearance=dark]{color-scheme:dark;background:#1b191f;color:#eee5ec}
:root[data-appearance=dark] body{background:#1b191f}
:root[data-appearance=dark] .builder{--b-ink:#eee5ec;--b-muted:#b6a8b3;--b-line:#493e49;--b-paper:#201e25;--b-purple:#987799;background:#201e25}
:root[data-appearance=dark] :is(input,textarea,select){color:#eee5ec;background-color:#24222a;border-color:#514550}
:root[data-appearance=dark] :is(.builder-primary,.session-new-space,.builder-team-workspace){background:#856388!important;color:#fff6ed!important;border-color:#a582a5!important}
:root[data-appearance=dark] .harness-logo{background:#f1e8de;border-radius:8px}
:root[data-appearance=dark] .harness-terminal-mode{background:#24222a}
:root[data-appearance=dark] :is(.harness-hero,.builder-chat-heading){background:linear-gradient(90deg,#302731,#24222a)}
:root[data-appearance=dark] .builder-garden-welcome::before{background:url('/illustrations/openplex-garden.png') center 55%/cover no-repeat;opacity:1}
:root[data-appearance=dark] :is(.harness-sidebar,.employee-identity,.builder-sidebar){background-color:#28242d}
:root[data-appearance=dark] .harness-tile-header{background:linear-gradient(180deg,#65476366,transparent 95%)}
:root[data-appearance=dark] .employee-identity{background:linear-gradient(180deg,#453448 0%,#342b38 36%,#28242d 72%)}
:root[data-appearance=dark] .harness-user-message{background:#443247;border-color:#685069;color:#f6edf3}
:root[data-appearance=dark] :is(.employee-muted,.harness-muted,.builder-eyebrow){color:#bdadba}
:root[data-appearance=dark] :is(.chat-thinking,.harness-assistant-message){color:#eee5ec}
.employee-identity{background:linear-gradient(180deg,#e8e0e9 0%,#f0e9e7 40%,#f8f4eb 76%)}
.employee-identity .campus-preview-portrait{background:none;border-radius:0}
:root[data-appearance=dark] .employee-identity .campus-preview-portrait{background:none}
.harness-hero,.builder-chat-heading{background:linear-gradient(90deg,#f1e9ef,#fbf8f0)}
.harness-terminal-mode{background:#fbf8f0}
/* Match adjoining surfaces, with fades contained inside the header. */
.employee-builder-page .employee-builder-layout>aside{background:transparent}
.employee-builder-page .employee-builder-conversation{border:0;box-shadow:none}
:root[data-appearance=dark] .employee-builder-conversation{border:0;box-shadow:none}
.employee-builder-conversation .builder-chat-heading{border-bottom:0;background:linear-gradient(180deg,#f1e9ef 0%,#fbf8f0 100%)}
:root[data-appearance=dark] .employee-builder-page,:root[data-appearance=dark] .employee-builder-layout,:root[data-appearance=dark] .employee-builder-conversation,:root[data-appearance=dark] .employee-builder-layout>aside{background:#24222a}
:root[data-appearance=dark] .employee-builder-conversation .builder-chat-heading{background:linear-gradient(180deg,#352b36 0%,#2c262f 48%,#24222a 100%);border-bottom:0}
:root[data-appearance=dark] .builder-chat-log{background:#24222a}
:root[data-appearance=dark] .builder-canvas-section{background-image:radial-gradient(circle,rgba(225,213,230,.32) .8px,transparent 1.15px)}
.appearance-picker{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;color:inherit;font:12px/1.4 system-ui}
.appearance-picker>span{font-size:18px}.appearance-picker select{font:inherit;color:inherit;background:transparent;border:1px solid var(--b-line,#dacbd4);border-radius:8px;padding:5px 7px;max-width:92px}
.appearance-picker select:focus-visible{outline:2px solid #a783a8;outline-offset:3px}
@media(prefers-reduced-motion:reduce){.app-decoration,.botanical{animation:none!important}}
''')
(root/'dark-appearance.css').write_text('\n'.join(out)+'\n')
print('Generated',len(out)-2,'scoped dark rules')
