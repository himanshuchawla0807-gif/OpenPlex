"""Read native source bounds; register coherent chair/person artwork without editing PNGs."""
import json
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np
# Measured hand centers for each view, normalized within the complete cutout.
contacts={
 'gus':[(.80,.47),(.22,.32)], 'oscar':[(.701,.458),(.254,.381)],
 'felix':[(.749,.512),(.242,.368)], 'jasper':[(.702,.498),(.233,.392)],
 'cleo':[(.677,.470),(.287,.431)], 'bruno':[(.761,.482),(.192,.361)],
 'otis':[(.766,.460),(.180,.364)], 'theo':[(.734,.492),(.164,.382)],
 'arthur':[(.757,.494),(.226,.357)], 'ziggy':[(.783,.515),(.228,.387)],
 'rory':[(.796,.518),(.219,.367)], 'kit':[(.752,.479),(.286,.393)],
 'poppy':[(.711,.520),(.206,.435)]}
result={}
for p in Path('public/characters/office-seating-v2').glob('*.png'):
 im=Image.open(p);a=np.array(im)[:,:,3];labs,n=label(a>180);counts=np.bincount(labs.ravel());objects=find_objects(labs);boxes=[]
 for i in sorted(range(1,n+1),key=lambda i:counts[i],reverse=True)[:4]:
  ys,xs=objects[i-1];boxes.append([xs.start,ys.start,xs.stop-xs.start,ys.stop-ys.start])
 boxes.sort(key=lambda b:b[1]+b[3]/2);boxes=sorted(boxes[:2])+sorted(boxes[2:])
 frames=[]
 for k,(x,y,w,h) in enumerate(boxes):
  rear=k>=2;pair=boxes[2:] if rear else boxes[:2];scale=95/max(b[3] for b in pair)
  hx,hy=contacts.get(p.stem,[(.78,.45),(.22,.33)])[int(rear)];tx,ty=(-30.2,-66.1) if rear else (20.2,-40.9)
  frames.append(dict(x=x,y=y,w=w,h=h,anchorX=hx*w-tx/scale,anchorY=hy*h-ty/scale,pixelScale=scale,mirror=1))
 result[p.stem]=dict(url='/characters/office-seating-v2/'+p.name,frames=frames)
open('src/characters/chairSheets.ts','w').write("import type {SeatedFrame} from './seatedSheets'\n/** Occupied chairs and characters share a single drawing and rigid transform. */\nexport const chairSheets:Record<string,{url:string;frames:SeatedFrame[]}>= "+json.dumps(result,indent=1)+'\n')
