"""Register two-figure source PNGs without resampling or modifying image pixels."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects

root = Path(__file__).resolve().parents[1]
inventory = json.loads((root/'docs/character-generation/hd-inventory.json').read_text())
manifest, report, profiles = {}, [], {}
for character in inventory:
    frames = [None]*8
    target = 108 if any(w in character['appearance'].lower() for w in ['tall', 'lanky']) else 100
    for source in character['sources']:
        path = root/'public'/source['url'].lstrip('/')
        rgba = np.asarray(Image.open(path).convert('RGBA'))
        height, width = rgba.shape[:2]
        pair = []
        for side in range(2):
            left_edge, right_edge = side*width//2, (side+1)*width//2
            mask = rgba[:,left_edge:right_edge,3] > 64
            labels, _ = label(mask)
            objects = list(enumerate(find_objects(labels),1))
            number, box = max(((n,b) for n,b in objects if b), key=lambda nb:int((labels[nb[1]]==nb[0]).sum()))
            y, x = box
            count = int((labels[box]==number).sum())
            assert count > 20000, (character['id'],source['key'],side,count)
            left, top = max(left_edge,left_edge+x.start-3), max(0,y.start-3)
            right, bottom = min(right_edge,left_edge+x.stop+3), min(height,y.stop+3)
            shoe_y = y.stop-max(4,round((y.stop-y.start)*.07))
            _, xs = np.nonzero(labels[shoe_y:y.stop,x.start:x.stop]==number)
            anchor = float(xs.mean()+left_edge+x.start-left)
            if source['key'].startswith('walk'):
                # A different leading shoe must not shift the whole torso sideways.
                head_bottom=y.start+max(6,round((y.stop-y.start)*.22))
                _, head_x=np.nonzero(labels[y.start:head_bottom,x.start:x.stop]==number)
                anchor=float(head_x.mean()+left_edge+x.start-left)
            pair.append(dict(x=left,y=top,w=right-left,h=bottom-top,anchorX=round(anchor,2),url=source['url']))
        # Calibrate each independently generated image to its standing counterpart;
        # never stretch the seated drawing to standing height.
        reference_height = pair[0]['h'] if source['key']=='master' else pair[1]['h'] if source['key']=='rear-coffee' else sum(f['h'] for f in pair)/2
        scale = target/reference_height
        for column, frame in zip(source['columns'],pair):
            frame['pixelScale'] = scale
            frames[column] = frame
        report.append(dict(id=character['id'],source=source['key'],imageSize=[width,height],figureHeights=[f['h'] for f in pair],worldHeights=[round(f['h']*scale,2) for f in pair],figures=2))
    assert all(frames), character['id']
    manifest[character['id']] = dict(url=frames[0]['url'],pixelScale=frames[0]['pixelScale'],frames=frames)
    profiles[character['id']] = dict(title=character['role'],outfit=character['appearance'],description=character['appearance'],specialties=[character['role'],character['group'].title()],image=frames[0]['url'])

(root/'src/characters/uniqueCastSheets.ts').write_text("// Generated registration; source PNGs are preserved at native resolution.\nimport type {SpriteRect} from './motionSheets'\nexport interface UniqueCastFrame extends SpriteRect {anchorX:number;url:string;pixelScale:number}\nexport interface UniqueCastSheet {url:string;pixelScale:number;frames:UniqueCastFrame[]}\nexport const uniqueCastSheets:Record<string,UniqueCastSheet>="+json.dumps(manifest,indent=1)+'\n')
(root/'src/data/uniqueCastProfiles.ts').write_text("// Distinct identities, with individual high-detail pose sources.\nexport const uniqueCastProfiles:Record<string,{title:string;outfit:string;description:string;specialties:string[];image:string}>="+json.dumps(profiles,indent=1)+'\n')
(root/'docs/character-generation/hd-registration.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'Registered {len(manifest)} identities, {len(report)} two-figure PNGs, {len(manifest)*8} poses.')
