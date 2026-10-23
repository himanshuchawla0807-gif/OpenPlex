"""Register four-figure refinements, preserving every generated source pixel."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects
root=Path(__file__).resolve().parents[1]
path=root/'src/characters/uniqueCastSheets.ts'
prefix,body=path.read_text().split('export const uniqueCastSheets:Record<string,UniqueCastSheet>=',1)
manifest=json.loads(body)
profile_path=root/'src/data/uniqueCastProfiles.ts'
profile_prefix,profile_body=profile_path.read_text().split('>=',1)
profiles=json.loads(profile_body)
inventory=json.loads((root/'docs/character-generation/refinements.json').read_text())
report=[]
for item in inventory:
    rgba=np.asarray(Image.open(root/'public'/item['url'].lstrip('/')).convert('RGBA'))
    height,width=rgba.shape[:2];frames=[]
    labels,_=label(rgba[:,:,3]>64)
    components=sorted(((n,b) for n,b in enumerate(find_objects(labels),1) if b),key=lambda nb:int((labels[nb[1]]==nb[0]).sum()),reverse=True)[:4]
    assert len(components)==4,item['id']
    components.sort(key=lambda nb:((nb[1][0].start+nb[1][0].stop)/2>height/2,(nb[1][1].start+nb[1][1].stop)/2))
    for n,box in components:
        y,x=box;left=max(0,x.start-2);top=max(0,y.start-2);right=min(width,x.stop+2);bottom=min(height,y.stop+2)
        if item['kind']=='static':
            shoe_y=y.stop-max(4,round((y.stop-y.start)*.07));_,xs=np.nonzero(labels[shoe_y:y.stop,x.start:x.stop]==n)
        else:
            head_end=y.start+max(6,round((y.stop-y.start)*.22));_,xs=np.nonzero(labels[y.start:head_end,x.start:x.stop]==n)
        frames.append(dict(x=left,y=top,w=right-left,h=bottom-top,anchorX=round(float(xs.mean()+x.start-left),2),url=item['url'],isolate=True))
    entry=manifest[item['id']];target=108 if item['id']=='jasper' else 100
    scale=target/(frames[0]['h'] if item['kind']=='static' else sum(f['h'] for f in frames)/4)
    for frame in frames:frame['pixelScale']=scale
    if item['kind']=='static':
        for i,f in zip([0,5,6,7],frames):entry['frames'][i]=f
        entry['url']=item['url'];entry['pixelScale']=scale
        profiles[item['id']].update(image=item['url'],outfit=item['appearance'],description=item['appearance'])
    else:
        key='walkFront' if item['kind']=='front' else 'walkRear';entry[key]=frames
        for i,f in zip([1,2] if item['kind']=='front' else [3,4],frames):entry['frames'][i]=f
    report.append(dict(id=item['id'],kind=item['kind'],size=[width,height],frameHeights=[f['h'] for f in frames]))
prefix=prefix.replace('anchorX:number;url:string;pixelScale:number}', 'anchorX:number;url:string;pixelScale:number;isolate?:boolean}')
prefix=prefix.replace('frames:UniqueCastFrame[]}', 'frames:UniqueCastFrame[];walkFront?:UniqueCastFrame[];walkRear?:UniqueCastFrame[]}')
path.write_text(prefix+'export const uniqueCastSheets:Record<string,UniqueCastSheet>='+json.dumps(manifest,indent=1)+'\n')
profile_path.write_text(profile_prefix+'>='+json.dumps(profiles,indent=1)+'\n')
(root/'docs/character-generation/refinement-registration.json').write_text(json.dumps(report,indent=2)+'\n')
print('Registered',len(inventory),'four-figure source images')
