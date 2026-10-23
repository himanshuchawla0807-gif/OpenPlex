"""Register generated cutouts without changing pixels or deforming anatomy."""
import json
bounds=json.load(open('output/seated-bounds.json'))
# Hand centers measured from each source illustration, in cropped-image units.
contacts={
 'oscar':[(.76,.47),(.20,.43)], 'gus':[(.43,.52),(.22,.34)],
 'felix':[(.77,.49),(.18,.27)], 'jasper':[(.76,.48),(.18,.44)],
 'poppy':[(.77,.48),(.18,.45)], 'otis':[(.77,.49),(.19,.40)],
 'cleo':[(.76,.46),(.75,.32)], 'kit':[(.77,.47),(.22,.37)],
 'bruno':[(.70,.48),(.22,.30)], 'rory':[(.76,.53),(.19,.42)],
 'ziggy':[(.78,.47),(.18,.40)], 'theo':[(.76,.49),(.20,.39)]}
result={}
for id,boxes in bounds.items():
 frames=[]
 for n,(x,y,w,h) in enumerate(boxes):
  rear=n>=2;pair=boxes[2:4] if rear else boxes[:2]
  scale=(105 if rear else 88)/max(b[3] for b in pair)
  hx,hy=contacts[id][int(rear)];mirror=-1 if (id=='gus' and not rear) or (id=='cleo' and rear) else 1
  tx,ty=(-30.2,-66.1) if rear else (20.2,-40.9)
  frames.append(dict(x=x,y=y,w=w,h=h,anchorX=hx*w-tx/(mirror*scale),anchorY=hy*h-ty/scale,pixelScale=scale,mirror=mirror))
 result[id]=dict(url=f'/characters/seated-v1/{id}.png',frames=frames)
open('src/characters/seatedSheets.ts','w').write('''// Generated pose registration. Source pixels and body proportions stay unchanged.
import type {SpriteRect} from './motionSheets'
export interface SeatedFrame extends SpriteRect {anchorX:number;anchorY:number;pixelScale:number;mirror:number}
export const seatedSheets:Record<string,{url:string;frames:SeatedFrame[]}>= '''+json.dumps(result,indent=1)+'\n')
