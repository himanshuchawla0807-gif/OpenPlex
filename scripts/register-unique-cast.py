"""Read generated PNG alpha to register game frames. No image pixels are modified."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects
root=Path(__file__).resolve().parents[1]
items=json.loads((root/'docs/character-generation/inventory.json').read_text())
manifest={};qa=[]
for item in items:
 path=root/'reference-lab/rejected-cast-v2'/f"{item['key']}.png"
 rgba=np.asarray(Image.open(path).convert('RGBA'));height,width=rgba.shape[:2]
 labels,n=label(rgba[:,:,3]>64)
 cells={}
 for number,box in enumerate(find_objects(labels),1):
  if box is None:continue
  y,x=box;count=int((labels[box]==number).sum())
  if count<300:continue
  row=min(3,int((y.start+y.stop)/2/height*4));column=min(7,int((x.start+x.stop)/2/width*8))
  if count>cells.get((row,column),(0,None))[0]:cells[(row,column)]=(count,(number,box))
 if len(cells)!=32:raise ValueError(f'{path}: expected 32 separate sprites, found {len(cells)}')
 for row,(id,name,appearance,role) in enumerate(item['rows']):
  frames=[];alphaCounts=[]
  for column in range(8):
   count,(number,box)=cells[row,column];y,x=box
   left=max(0,x.start-2);top=max(0,y.start-2);right=min(width,x.stop+2);bottom=min(height,y.stop+2)
   # Floor anchor is the alpha-weighted centre of the shoe region, not the crop centre.
   shoe_y=y.stop-max(3,round((y.stop-y.start)*.07));shoe=labels[shoe_y:y.stop,x.start:x.stop]==number
   _,xs=np.nonzero(shoe);anchor=float(xs.mean()+x.start-left) if len(xs) else (right-left)/2
   frames.append(dict(x=left,y=top,w=right-left,h=bottom-top,anchorX=round(anchor,2)))
   alphaCounts.append(count)
  target=108 if any(word in appearance.lower() for word in ['very tall','lanky','tall']) else 100
  scale=target/frames[0]['h']
  manifest[id]=dict(url=f"/characters/unique-cast-v2/{item['key']}.png",pixelScale=scale,frames=frames)
  qa.append(dict(id=id,atlas=item['key'],imageSize=[width,height],alphaPixels=alphaCounts,standingHeight=target,seatedHeights=[round(frames[c]['h']*scale,2) for c in [5,6]]))
(root/'src/characters/uniqueCastSheets.ts').write_text('''// Alpha-registered generated sprite frames; stable IDs preserve existing projects.\nimport type {SpriteRect} from './motionSheets'\nexport interface UniqueCastFrame extends SpriteRect {anchorX:number}\nexport interface UniqueCastSheet {url:string;pixelScale:number;frames:UniqueCastFrame[]}\nexport const uniqueCastSheets:Record<string,UniqueCastSheet>='''+json.dumps(manifest,indent=1)+'\n')
(root/'docs/character-generation/registration.json').write_text(json.dumps(qa,indent=2)+'\n')
print(f'Registered {len(manifest)} unique characters / {len(manifest)*8} directional poses, without editing PNG pixels.')
