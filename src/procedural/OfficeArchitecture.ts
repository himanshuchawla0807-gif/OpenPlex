import { project } from './model.ts';
import type { Furniture, OfficeDefinition, Vec } from './model.ts';

type Context = CanvasRenderingContext2D;
type Point3 = [number, number, number];
const INK = '#273342';
function shade(hex: string, amount: number): string {
  const channels = hex.startsWith('rgb') ? hex.match(/[\d.]+/g)?.slice(0,3).map(Number) : undefined;
  const n = parseInt(hex.replace('#', ''), 16);
  const [r,g,b] = channels ?? [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${Math.max(0, Math.min(255, r + amount))},${Math.max(0, Math.min(255, g + amount))},${Math.max(0, Math.min(255, b + amount))})`;
}

function mixInk(a:string,b:string,weight:number):string {
  const rgb=(color:string)=>color.startsWith('rgb')?color.match(/[\d.]+/g)!.slice(0,3).map(Number):[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  const x=rgb(a),y=rgb(b);return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*weight)).join(',')})`;
}

/** Original procedural illustration primitives. All positions are local world
 * coordinates; the caller supplies the campus origin/camera transform. */
export class OfficeArchitecture {
  private patterns = new Map<string, CanvasPattern>();
  private variant = 0;
  private dark=false;
  setAppearance(dark:boolean){if(this.dark!==dark){this.dark=dark;this.patterns.clear()}}
  private material(fill:string){if(!this.dark||fill.startsWith('rgba'))return fill;const values=fill.startsWith('rgb')?fill.match(/[\d.]+/g)!.slice(0,3).map(Number):[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16));if(values.some(v=>!Number.isFinite(v)))return fill;return `rgb(${values.map((v,i)=>Math.round(v*.62+[18,24,34][i])).join(',')})`}
  private printLevel=0;
  // Keep the print above a fine 1.4px screen pitch when zoomed out. Buckets avoid
  // rebuilding cached rooms on every wheel event while keeping dots consistent.
  setScreenScale(scale:number):void {
    const level=Math.round(Math.log2(Math.min(.45,Math.max(.05,scale))/.45)*4);
    if(level!==this.printLevel){this.printLevel=level;this.patterns.clear()}
  }
  get screenLevel():number { return this.printLevel; }
  private get printScale():number {return .2/Math.pow(2,this.printLevel/4)}

  /** Reference screen specification: 3.1px pitch, 5x supersampling, eight-cell
   * tiles, twenty density steps and three independently registered impressions.
   * Modern neutral inks retain the same opaque dot / knockout construction. */
  private pattern(ctx: Context, color: string): CanvasPattern | undefined {
    if (color.startsWith('rgba')) return undefined;
    const bank=this.patterns;
    const key = `${color}:${this.variant}:${this.screenLevel}`;
    const cached = bank.get(key); if (cached) return cached;
    const channels = color.startsWith('rgb') ? color.match(/[\d.]+/g)?.slice(0,3).map(Number) : undefined;
    const n = parseInt(color.replace('#', ''),16);
    const rgb = channels ?? [n >> 16,(n >> 8)&255,n&255];
    const light = (rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255;
    const tone = Math.round((light>.86?.15:light>.62?.3:light>.42?.5:.8)*20)/20;
    const fine=this.printLevel<0, cells=fine?16:8;
    const cell = 3.1*5, size = cell*cells;
    // Break the regular screen lattice below inspection zoom. Two rotated dot
    // screens otherwise beat against the cache pixels and form giant moiré dots.
    const jitterWidth=fine?cell*.95:.8;
    const tile = document.createElement('canvas'); tile.width=size; tile.height=size;
    const paint = tile.getContext('2d'); if (!paint) return undefined;
    const contrast=1;
    const dark=(light>.8?110:light>.62?116:light>.42?86:40)*contrast;
    const base = this.dark ? shade(color,8) : mixInk(shade(color,Math.min(24,dark*tone/(1-tone))),light>.62?'#f3ebdd':shade(color,Math.min(105,dark*tone/(1-tone))),.65); 
    paint.fillStyle=base; paint.fillRect(0,0,size,size);
    paint.fillStyle=this.dark ? shade(color,-38) : mixInk(shade(color,-42),light>.8?'#4a627f':light>.62?'#465f78':light>.42?'#3e596f':'#293e57',.65);
    let seed = (n ^ (this.variant+1)*2654435761) >>> 0;
    const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    if(tone<=.5) {
      for(let y=0;y<cells;y++) for(let x=0;x<cells;x++) {
        const radius=cell*Math.sqrt(tone/Math.PI)*(.86+random()*.24);
        paint.beginPath();paint.arc((x+.5)*cell+(random()-.5)*jitterWidth,(y+.5)*cell+(random()-.5)*jitterWidth,radius,0,Math.PI*2);paint.fill();
      }
    } else {
      paint.fillRect(0,0,size,size);paint.fillStyle=base;
      for(let y=0;y<=cells;y++)for(let x=0;x<=cells;x++) {
        const radius=cell*Math.sqrt((1-tone)/Math.PI)*(.86+random()*.24);
        paint.beginPath();paint.arc(x*cell+(fine?(random()-.5)*jitterWidth:0),y*cell+(fine?(random()-.5)*jitterWidth:0),radius,0,Math.PI*2);paint.fill();
      }
    }
    paint.fillStyle=base;
    for(let k=0;k<Math.round(size*size/230);k++) {
      paint.globalAlpha=.25+random()*.65;const fleck=.6+random()*1.2;
      paint.fillRect(random()*size,random()*size,fleck,fleck);
    }
    const pattern=ctx.createPattern(tile,'repeat');
    if(pattern) {
      const angle=light>.8?45:light>.55?15:75;
      const jitter=[[-.6,.45],[.55,-.3],[-.45,-.55]][this.variant];
      pattern.setTransform(new DOMMatrix().translateSelf(jitter[0],jitter[1]).rotateSelf(angle).scaleSelf(this.printScale));
      bank.set(key,pattern);
    }
    return pattern??undefined;
  }

  private accentPattern(ctx:Context,color:string):CanvasPattern|undefined {
    if(color.startsWith('rgba'))return undefined;
    const bank=this.patterns;
    const key=`accent:${color}:${this.variant}`;const cached=bank.get(key);if(cached)return cached;
    const cv=document.createElement('canvas');cv.width=124;cv.height=124;const c=cv.getContext('2d');if(!c)return undefined;
    const n=parseInt(color.replace('#',''),16),warm=((n>>16)&255)>(n&255)+12;
    c.fillStyle=warm?'#bd775c':'#438e8c';
    const pitch=15.5,radius=pitch*Math.sqrt((warm?.11:.075)/Math.PI);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const d=((x*7+y*11+this.variant*3)%9)/9;c.beginPath();c.arc((x+.5+(this.printLevel<0?(((x*23+y*31)%17)/17-.5)*.95:0))*pitch,(y+.5+(this.printLevel<0?(((x*13+y*19)%23)/23-.5)*.95:0))*pitch,radius*(.88+d*.22),0,Math.PI*2);c.fill();}
    const result=ctx.createPattern(cv,'repeat');if(result){const shift=[[-.6,.45],[.55,-.3],[-.45,-.55]][this.variant];result.setTransform(new DOMMatrix().translateSelf(shift[0],shift[1]).rotateSelf(warm?75:45).scaleSelf(this.printScale));bank.set(key,result);}return result??undefined;
  }

  /** A separate, tiny animated ink impression; static rooms and their tile cache
   * never rebuild, and neither furniture outlines nor character artwork move. */
  drawLivingGrain(ctx:Context,def:OfficeDefinition,time:number,reduced:boolean):void {
    if(reduced)return;
    let grain=this.patterns.get('living-grain');
    if(!grain){
      const tile=document.createElement('canvas');tile.width=tile.height=64;const g=tile.getContext('2d')!;
      let seed=3817;g.fillStyle='#465f78';
      for(let n=0;n<180;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%64;seed=(Math.imul(seed,1664525)+1013904223)>>>0;g.fillRect(x,seed%64,.65,.65)}
      grain=ctx.createPattern(tile,'repeat')??undefined;if(!grain)return;this.patterns.set('living-grain',grain);
    }
    const phase=Math.floor(time*3)%3,shift=[[-.25,.15],[.2,-.15],[0,.25]][phase];
    grain.setTransform(new DOMMatrix().translateSelf(shift[0],shift[1]));
    ctx.save();ctx.beginPath();
    for(const points of [
      [project(0,0),project(def.width,0),project(def.width,def.depth),project(0,def.depth)],
      [project(0,0),project(0,def.depth),project(0,def.depth,def.wallHeight),project(0,0,def.wallHeight)],
      [project(0,0),project(def.width,0),project(def.width,0,def.wallHeight),project(0,0,def.wallHeight)]
    ]){points.forEach((p,n)=>n?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
    ctx.clip();ctx.fillStyle=grain;ctx.globalAlpha*=.18;
    ctx.fillRect(-def.depth*40-2,-def.wallHeight*40-2,(def.width+def.depth)*40+4,(def.width+def.depth)*20+def.wallHeight*40+4);ctx.restore();
  }

  private inkPath(ctx: Context, points: Vec[], closed: boolean, width: number): void {
    const list=closed?[...points,points[0]]:points;
    ctx.beginPath();
    for(let k=0;k<list.length-1;k++) {
      const a=list[k],b=list[k+1],length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(length/2.5));
      for(let m=0;m<=steps;m++) {
        const t=m/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        const phase=this.variant*2.17+a.x*.017+a.y*.023;
        const wiggle=Math.min(.8,width*.18+.2)*(.65*Math.sin(t*5.1+phase)+.35*Math.sin(t*8.3+phase*.7));
        const px=x-(b.y-a.y)/(length||1)*wiggle,py=y+(b.x-a.x)/(length||1)*wiggle;
        if(k===0&&m===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
    }
    if(closed)ctx.closePath();
  }
  private poly(ctx: Context, points: Vec[], fill: string, texture = true, line = 1): void {
    if (!points.length) return;
    fill=this.material(fill);
    ctx.beginPath();
    for (let k=0;k<points.length;k++) { const p=points[k];if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y); }
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    // Subpixel printing screens alias at campus scale. Fade their contrast into
    // the material colour instead of making the dots larger as we zoom out.
    const strength=.74;
    const print=texture?this.pattern(ctx,fill):undefined;
    if(print){ctx.save();ctx.globalAlpha*=strength;ctx.fillStyle=print;ctx.fill();ctx.restore();}
    const plate=texture?this.accentPattern(ctx,fill):undefined;if(plate){ctx.save();ctx.globalAlpha*=.34*strength;ctx.fillStyle=plate;ctx.fill();ctx.restore();}
    if(line) { this.inkPath(ctx,points,true,line);ctx.strokeStyle=this.dark?'#30465c':INK;ctx.lineWidth=line;ctx.lineJoin='round';ctx.stroke(); }
  }
  private face(ctx: Context, points: Point3[], fill: string, texture = true, line = 1): void {
    this.poly(ctx, points.map(([i, j, z]) => project(i, j, z)), fill, texture, line);
  }
  private line(ctx: Context, a: Point3, b: Point3, color = INK, width = 1): void {
    const p = project(...a), q = project(...b);
    this.inkPath(ctx,[p,q],false,width);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
  }
  private box(ctx: Context, i: number, j: number, w: number, d: number, z: number, h: number, color: string): void {
    this.face(ctx, [[i, j + d, z], [i + w, j + d, z], [i + w, j + d, z + h], [i, j + d, z + h]], shade(color, -12));
    this.face(ctx, [[i + w, j, z], [i + w, j + d, z], [i + w, j + d, z + h], [i + w, j, z + h]], shade(color, -27));
    this.face(ctx, [[i, j, z + h], [i + w, j, z + h], [i + w, j + d, z + h], [i, j + d, z + h]], color);
  }
  private surface(ctx: Context, i: number, j: number, w: number, d: number, z: number, color: string, line = .7): void {
    this.face(ctx, [[i,j,z], [i+w,j,z], [i+w,j+d,z], [i,j+d,z]], color, true, line);
  }
  private disc(ctx: Context, i: number, j: number, z: number, radius: number, color: string): void {
    const p = project(i,j,z);
    ctx.beginPath(); ctx.ellipse(p.x,p.y,radius,radius*.5,0,0,Math.PI*2);
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = .7; ctx.stroke();
  }
  private shadow(ctx: Context, f: Furniture): void {
    this.surface(ctx, f.i+.15,f.j+.12,f.w+.05,f.d+.05,.005,'rgba(28,43,57,.10)',0);
  }

  drawBase(ctx: Context, def: OfficeDefinition, variant: number): void {
    this.variant = variant % 3;
    const {width: w, depth: d, wallHeight: h} = def;
    // Floating architectural plinth, cream page margins remain transparent.
    this.box(ctx, -.08,-.08,w+.16,d+.16,-.27,.27,'#aab1b9');
    this.surface(ctx,0,0,w,d,.01,def.floor,1.25);
    for(let i=1;i<w;i++) this.line(ctx,[i,0,.02],[i,d,.02],'rgba(49,65,80,.11)',.55);
    for(let j=1;j<d;j++) this.line(ctx,[0,j,.02],[w,j,.02],'rgba(49,65,80,.10)',.55);
    // Subtle broad carpet tiles rather than greenery or rustic ornament.
    for(let i=0;i<w;i+=2) for(let j=0;j<d;j+=2) if((i+j)%4===0) this.surface(ctx,i,j,Math.min(2,w-i),Math.min(2,d-j),.025,'rgba(255,255,255,.045)',0);
    // Broad perimeter inlay reads as architecture at overview scale, with no
    // extra high-frequency checker pattern or obstacles in the walking lanes.
    for(const inset of [.42,.57]) {
      const ink=inset===.42?'rgba(54,76,95,.24)':'rgba(248,245,232,.7)';
      this.line(ctx,[inset,inset,.03],[w-inset,inset,.03],ink,1.2);
      this.line(ctx,[w-inset,inset,.03],[w-inset,d-inset,.03],ink,1.2);
      this.line(ctx,[w-inset,d-inset,.03],[inset,d-inset,.03],ink,1.2);
      this.line(ctx,[inset,d-inset,.03],[inset,inset,.03],ink,1.2);
    }
    this.face(ctx, [[0,0,0],[0,d,0],[0,d,h],[0,0,h]],shade(def.wall,-8));
    this.face(ctx, [[0,0,0],[w,0,0],[w,0,h],[0,0,h]],def.wall);
    this.line(ctx,[0,d,.14],[0,0,.14],'#6d7780',2.5);
    this.line(ctx,[0,0,.14],[w,0,.14],'#6d7780',2.5);
    this.line(ctx,[0,d,h],[0,0,h],'#fffdf8',4);
    this.line(ctx,[0,0,h],[w,0,h],'#fffdf8',4);
    this.windows(ctx,def);
    this.wallBoard(ctx,def);
    this.wallDetails(ctx,def);
    // Recessed linear lighting with quiet warm highlight.
    this.line(ctx,[.018,1.3,h-.32],[.018,d-1.3,h-.32],'#b1b9c1',4);
    this.line(ctx,[.02,1.3,h-.31],[.02,d-1.3,h-.31],'#fff8dc',1.65);
    for(const f of def.furniture) if(f.kind==='rug') {
      this.surface(ctx,f.i,f.j,f.w,f.d,.035,f.color??'#a8b4c0',.45);
      for(let j=f.j+.15;j<f.j+f.d;j+=this.screenLevel===0?.66:.22) this.line(ctx,[f.i+.1,j,.04],[f.i+f.w-.1,j,.04],'rgba(248,248,245,.13)',.45);
      this.surface(ctx,f.i+.1,f.j+.1,f.w-.2,f.d-.2,.045,'rgba(255,255,255,.015)',.35);
    }
    if((def.templateId??def.id)==='connected-office'){
      // A lengthwise aisle separates the uninterrupted four-person rows.
      for(let j=3;j<17;j+=1.3)this.line(ctx,[7.65,j,.055],[7.65,j+.5,.055],'rgba(71,122,171,.25)',1.8);
      this.surface(ctx,15.3,2.7,.07,16.2,.055,'rgba(71,122,171,.18)',0);
    } else {
      // A restrained accent lane leads toward each department’s task island.
      this.line(ctx,[10.8,3,.055],[10.8,11.3,.055],def.accent,1.1);
      for(let k=0;k<3;k++)this.surface(ctx,10.59,10.8+k*.22,.42,.08,.056,def.accent,0);
    }
  }

  private wallDetails(ctx:Context,def:OfficeDefinition):void {
    // Full-height acoustic fins, framed reliefs and concealed lighting give each
    // department a recognizable finish without taking up circulation space.
    const start=Math.min(12.5,def.depth-5.5),end=def.depth-1.5;
    this.face(ctx,[[.028,start,1.55],[.028,end,1.55],[.028,end,3.35],[.028,start,3.35]],'#d2d5d3',true,.8);
    for(let j=start+.12;j<end;j+=.24) {
      this.line(ctx,[.065,j,1.6],[.065,j,3.3],(def.templateId??def.id)==='design-studio'?'#a78d78':'#8695a2',2.4);
      this.line(ctx,[.075,j+.055,1.6],[.075,j+.055,3.3],'#e0e3dc',.7);
    }
    this.line(ctx,[.08,start,3.4],[.08,end,3.4],'#fff3cf',2);
    const j=start+.65;
    this.face(ctx,[[.1,j,2],[.1,j+1.45,2],[.1,j+1.45,3.05],[.1,j,3.05]],'#344858',true,1.6);
    this.face(ctx,[[.12,j+.09,2.09],[.12,j+1.36,2.09],[.12,j+1.36,2.96],[.12,j+.09,2.96]],'#f0eadd',true,.4);
    this.face(ctx,[[.14,j+.17,2.18],[.14,j+.78,2.18],[.14,j+.78,2.82],[.14,j+.17,2.82]],def.accent,true,.5);
    this.face(ctx,[[.15,j+.72,2.18],[.15,j+1.24,2.18],[.15,j+1.24,2.57],[.15,j+.72,2.57]],'#bd9c7e',true,.5);
    // Flush wall panels and a continuous reveal beneath the city windows.
    this.face(ctx,[[1.1,.045,.3],[def.width-5.1,.045,.3],[def.width-5.1,.045,.68],[1.1,.045,.68]],'#d5dce0',false,0);
    this.line(ctx,[1.1,.055,.7],[def.width-5.1,.055,.7],def.accent,1.5);
    for(let i=1.1;i<def.width-5.1;i+=1.9)this.line(ctx,[i,.06,.32],[i,.06,.66],'#aebac2',.7);
    // Window pelmet, sill seams and floor-level cable trunking.
    this.box(ctx,.8,.015,def.width-1.6,.12,3.47,.12,'#d1d7d9');
    this.line(ctx,[.8,.15,3.46],[def.width-.8,.15,3.46],'#fff5d7',1.3);
    this.line(ctx,[.04,.4,.25],[.04,def.depth-.4,.25],'#b0b8bc',1);
    for(let k=0;k<3;k++) {
      const x=2.4+k*(def.width-4.8)/3;
      this.face(ctx,[[x,.06,.27],[x+.45,.06,.27],[x+.45,.06,.48],[x,.06,.48]],'#e9e9e2',false,.6);
      for(let q=0;q<2;q++)this.line(ctx,[x+.12+q*.2,.075,.33],[x+.12+q*.2,.075,.41],'#66798a',.8);
    }
  }

  private windows(ctx: Context, def: OfficeDefinition): void {
    const start = 1.1, end = def.width-5.1, bottom=.9, top=3.35;
    this.face(ctx,[[start,0,bottom],[end,0,bottom],[end,0,top],[start,0,top]],'#b1ccdd',false,2.4);
    // Layered skyline is geometric, and stays inside each window pane.
    for(let i=start+.12,k=0;i<end-.2;i+=.48,k++) {
      const height=.5+((k*7)%9)*.17;
      this.face(ctx,[[i,.012,bottom],[i+.35,.012,bottom],[i+.35,.012,bottom+height],[i,.012,bottom+height]], k%2?'#90afc4':'#7e9fb7',false,.3);
      for(let z=bottom+.16;z<bottom+height-.12;z+=.19) {
        this.line(ctx,[i+.07,.018,z],[i+.14,.018,z],'#d8e8ee',.7);
        this.line(ctx,[i+.23,.018,z],[i+.29,.018,z],'#c9dce7',.7);
      }
    }
    for(let i=start;i<=end;i+=(end-start)/3) this.line(ctx,[i,.035,bottom],[i,.035,top],'#354c60',3.2);
    this.line(ctx,[start,.04,bottom],[end,.04,bottom],'#354c60',3.4);
    this.line(ctx,[start,.04,top],[end,.04,top],'#354c60',3.4);
    this.line(ctx,[start,.05,2.72],[end,.05,2.72],'rgba(242,251,255,.55)',.9);
    this.face(ctx,[[start+.12,.03,bottom+.1],[start+.6,.03,bottom+.1],[start+2.7,.03,top-.1],[start+2.2,.03,top-.1]],'rgba(247,252,255,.12)',false,0);
    this.box(ctx,start,-.015,end-start,.19,.79,.12,'#d8dce0');
    // Slatted acoustic panel on the remaining wall space.
    for(let i=end+.5;i<def.width-.3;i+=.17) this.line(ctx,[i,.018,.45],[i,.018,3.45],'#a49584',2.7);
  }

  private wallBoard(ctx: Context, def: OfficeDefinition): void {
    const a=2.1,b=Math.min(def.depth-2,8.7),z=1.72,t=3.02;
    this.face(ctx,[[.025,a,z],[.025,b,z],[.025,b,t],[.025,a,t]],'#354655',true,2);
    this.face(ctx,[[.04,a+.1,z+.1],[.04,b-.1,z+.1],[.04,b-.1,t-.1],[.04,a+.1,t-.1]],'#f5f3ed',true,.6);
    if((def.templateId??def.id)==='design-studio') {
      for(let col=0;col<5;col++) for(let row=0;row<2;row++) {
        const j=a+.42+col*.98, zz=z+.3+row*.48;
        this.face(ctx,[[.06,j,zz],[.06,j+.63,zz],[.06,j+.63,zz+.32],[.06,j,zz+.32]],['#7396b0','#c9a585','#d9c895','#b7c9ce','#978eab'][col],true,.4);
      }
    } else if((def.templateId??def.id)==='research-lab'||(def.templateId??def.id)==='collaboration-suite') {
      for(let n=0;n<6;n++){const jj=a+.65+(n%3)*1.6,zz=z+.4+Math.floor(n/3)*.5;this.face(ctx,[[.065,jj-.16,zz-.1],[.065,jj+.16,zz-.1],[.065,jj+.16,zz+.1],[.065,jj-.16,zz+.1]],def.accent,true,.7);if(n<5)this.line(ctx,[.07,jj+.16,zz],[.07,jj+1.35,zz+.12],'#829e9f',1.2);}
    } else if((def.templateId??def.id)==='marketing-studio'||(def.templateId??def.id)==='operations-hub'||(def.templateId??def.id)==='learning-room') {
      for(let col=0;col<5;col++)for(let row=0;row<3;row++){const jj=a+.45+col*1.1,zz=z+.26+row*.3;this.face(ctx,[[.06,jj,zz],[.06,jj+.67,zz],[.06,jj+.67,zz+.2],[.06,jj,zz+.2]],(col+row)%3?def.accent:'#d8c18d',true,.4);}
    } else {
      for(let k=0;k<5;k++) {
        const j=a+.5+k*.91, bar=.22+(k%3)*.18;
        this.face(ctx,[[.06,j,z+.24],[.06,j+.49,z+.24],[.06,j+.49,z+.24+bar],[.06,j,z+.24+bar]],k%2?shade(def.accent,35):def.accent,true,.4);
        this.line(ctx,[.06,j,z+.95],[.06,j+.62,z+.95],'#a3b1bd',1.2);
      }
      this.line(ctx,[.07,a+.3,z+.17],[.07,b-.3,z+.17],'#9eabb4',.8);
    }
    this.box(ctx,.02,b+.65,.1,.7,2.1,.7,'#f2f0e9');
    // A wall-mounted document rail and practical finish details fill the larger
    // perimeter while leaving the office floor available for circulation.
    for(let k=0;k<3;k++) {
      const j=b+1.8+k*.75;
      if(j+.57>=def.depth-.4)break;
      this.face(ctx,[[.035,j,1.65],[.035,j+.55,1.65],[.035,j+.55,2.5],[.035,j,2.5]],'#f2eee4',true,.9);
      this.face(ctx,[[.055,j+.06,2.14],[.055,j+.49,2.14],[.055,j+.49,2.4],[.055,j+.06,2.4]],k%2?'#a7bcc5':def.accent,true,.3);
      for(let row=0;row<3;row++)this.line(ctx,[.06,j+.1,1.81+row*.09],[.06,j+.43,1.81+row*.09],'#95a4ad',.65);
    }
    this.box(ctx,.025,def.depth-1,.09,.4,.57,.28,'#e3e5df');
    this.line(ctx,[.13,def.depth-.92,.64],[.13,def.depth-.92,.77],'#6c7b88',1);
    this.line(ctx,[.13,def.depth-.76,.64],[.13,def.depth-.76,.77],'#6c7b88',1);
    this.line(ctx,[.14,b+.77,2.28],[.14,b+1.14,2.68],def.accent,2);
    // A small physical clock, not overlay text.
    const c=project(.07,1.1,2.7);
    ctx.beginPath();ctx.ellipse(c.x,c.y,11,15,-.48,0,Math.PI*2);ctx.fillStyle='#f7f6ef';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.4;ctx.stroke();
    ctx.beginPath();ctx.moveTo(c.x,c.y-8);ctx.lineTo(c.x,c.y);ctx.lineTo(c.x+5,c.y+2);ctx.stroke();
  }

  /** Painter key of a footprint's centre. Rugs already live in the base;
   * workstation chairs sort just behind their actor. For precise seated
   * occlusion callers can use chair-back / chair-front passes (see methods). */
  depth(item: Furniture): number {
    if(item.kind==='chair') return item.i+item.j+(item.w+item.d)/2+(item.reverse?.025:-.025);
    return item.i+item.j+(item.w+item.d)/2;
  }

  drawFurniture(ctx: Context, def: OfficeDefinition, item: Furniture, variant: number): void {
    if(item.kind==='rug') return;
    this.variant=variant%3;
    const south=item.orientation==='south';
    const f=south?{...item,i:item.j,j:item.i,w:item.d,d:item.w}:item;
    ctx.save();if(south)ctx.scale(-1,1);
    this.shadow(ctx,f);
    switch(f.kind) {
      case 'bench': this.bench(ctx,def,f);break;
      case 'desk': case 'labdesk': case 'designdesk': this.desk(ctx,def,f);break;
      case 'conference': this.conference(ctx,def,f);break;
      case 'chair': this.chair(ctx,f);break;
      case 'cabinet': case 'printer': case 'coffeebar': this.cabinet(ctx,def,f);break;
      case 'bookcase': this.bookcase(ctx,def,f);break;
      case 'server': this.server(ctx,def,f);break;
      case 'glass': this.glass(ctx,f);break;
      case 'sofa': case 'armchair': this.sofa(ctx,f);break;
      case 'coffee': this.coffee(ctx,f);break;
      case 'prototype': this.prototype(ctx,def,f);break;
      case 'kitchenette': this.kitchenette(ctx,def,f);break;
      case 'lockers': this.lockers(ctx,f);break;
      case 'foosball': this.foosball(ctx,def,f);break;
      case 'watercooler': this.watercooler(ctx,f);break;
      case 'mediaconsole': this.media(ctx,def,f);break;
      case 'displaytable': this.displayTable(ctx,def,f);break;
      case 'flatfiles': this.flatfiles(ctx,f);break;
      case 'contentrig': this.contentRig(ctx,def,f);break;
      case 'campaignboard': case 'planningboard': this.planningBoard(ctx,def,f);break;
    }
    ctx.restore();
  }

  private contentRig(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    // A recording desk, waveform monitor, boom microphone and tripod camera.
    this.table(ctx,f,1.3,'#c4ad95');
    this.screen(ctx,f.i+f.w-.7,f.j+.2,1,1.33,def.accent,true);
    this.surface(ctx,f.i+.3,f.j+.3,.85,.6,1.34,'#344657',.5);
    for(let k=0;k<5;k++)this.line(ctx,[f.i+.35+k*.13,f.j+.4,1.35],[f.i+.35+k*.13,f.j+.7,1.35],def.accent,1.2);
    const i=f.i+.65,j=f.j+f.d-.35;
    this.disc(ctx,i,j,1.34,6,'#344657');
    this.line(ctx,[i,j,1.34],[i,j,2.25],'#344657',2);
    this.line(ctx,[i,j,2.25],[i+.45,j,2.45],'#344657',2);
    this.box(ctx,i+.38,j-.08,.23,.16,2.28,.3,'#455868');
    const x=f.i+f.w-.5,y=f.j+f.d-.4;
    for(const [di,dj] of [[-.3,-.25],[.35,-.25],[0,.3]])this.line(ctx,[x+di,y+dj,.04],[x,y,1.12],'#415463',2);
    this.box(ctx,x-.22,y-.16,.45,.32,1.12,.35,'#344657');
    this.disc(ctx,x-.23,y,1.3,4,'#8bb1c5');
  }
  private planningBoard(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    const x=f.i+f.w*.55,y=f.j;
    for(const j of [y+.2,y+f.d-.2]) {
      this.box(ctx,x-.35,j-.1,.7,.2,.04,.12,'#596c79');
      this.line(ctx,[x,j,.15],[x,j,2.85],'#596c79',2);
    }
    this.face(ctx,[[x,y,1.35],[x,y+f.d,1.35],[x,y+f.d,3.1],[x,y,3.1]],'#344657',false,1.3);
    this.face(ctx,[[x-.02,y+.08,1.43],[x-.02,y+f.d-.08,1.43],[x-.02,y+f.d-.08,3.02],[x-.02,y+.08,3.02]],'#f3eee1',false,.5);
    if(f.kind==='campaignboard') {
      // Campaign funnel plus three creative cards.
      for(let row=0;row<3;row++) {
        const w=(f.d-.4)*(1-row*.2),start=y+(f.d-w)/2,z=2.72-row*.34;
        this.face(ctx,[[x-.04,start,z],[x-.04,start+w,z],[x-.04,start+w,z+.2],[x-.04,start,z+.2]],row%2?'#d7b78d':def.accent,false,.4);
      }
    } else {
      const middle=y+f.d/2;
      this.face(ctx,[[x-.04,middle-.22,2.6],[x-.04,middle+.22,2.6],[x-.04,middle+.22,2.9],[x-.04,middle-.22,2.9]],def.accent,false,.4);
      for(let n=0;n<3;n++) {
        const j=y+.18+n*(f.d-.55)/3;
        this.line(ctx,[x-.05,middle,2.6],[x-.05,j+.15,2.25],def.accent,1);
        this.face(ctx,[[x-.06,j,1.85],[x-.06,j+.3,1.85],[x-.06,j+.3,2.25],[x-.06,j,2.25]],'#9bafad',false,.4);
      }
    }
  }

  private table(ctx:Context,f:Furniture,z:number,color:string):void {
    for(const [i,j] of [[f.i+.14,f.j+.14],[f.i+f.w-.23,f.j+.14],[f.i+.14,f.j+f.d-.23],[f.i+f.w-.23,f.j+f.d-.23]]) {
      this.box(ctx,i,j,.1,.1,.03,z-.08,'#747e89');
      this.box(ctx,i-.025,j-.025,.15,.15,.02,.08,'#414e5c');
    }
    this.box(ctx,f.i,f.j,f.w,f.d,z-.1,.12,color);
    this.line(ctx,[f.i+.04,f.j+f.d,z+.04],[f.i+f.w-.04,f.j+f.d,z+.04],'#f5eee0',.8);
  }
  private screen(ctx:Context,i:number,j:number,d:number,z:number,accent:string,code=false):void {
    this.box(ctx,i-.12,j+d*.3,.32,d*.4,z,.045,'#535e6b');
    this.box(ctx,i+.02,j+d*.46,.07,.09,z,.4,'#58626f');
    this.face(ctx,[[i,j,z+.32],[i,j+d,z+.32],[i,j+d,z+1.18],[i,j,z+1.18]],'#263849',false,1.3);
    this.face(ctx,[[i-.02,j+.055,z+.38],[i-.02,j+d-.055,z+.38],[i-.02,j+d-.055,z+1.12],[i-.02,j+.055,z+1.12]],'#e4f0f4',false,.45);
    this.face(ctx,[[i-.03,j+.075,z+.91],[i-.03,j+d-.075,z+.91],[i-.03,j+d-.075,z+1.09],[i-.03,j+.075,z+1.09]],accent,false,0);
    for(let n=0;n<5;n++) this.line(ctx,[i-.04,j+.13,z+.47+n*.075],[i-.04,j+.2+(n%3)*.12,z+.47+n*.075],code?'#50798a':'#7898ac',.85);
    this.line(ctx,[i-.04,j+d*.56,z+.5],[i-.04,j+d*.88,z+.5],'#879ba6',1);
  }
  private keyboard(ctx:Context,i:number,j:number,z:number):void {
    this.box(ctx,i,j,.32,.95,z,.045,'#dce1e3');
    for(let a=0;a<3;a++) for(let b=0;b<8;b++) this.surface(ctx,i+.045+a*.078,j+.065+b*.104,.045,.066,z+.05,'#6c7783',.1);
    this.disc(ctx,i+.16,j+1.15,z+.055,3.5,'#e3e5e5');
  }
  private mug(ctx:Context,i:number,j:number,z:number,color='#55768c'):void {
    this.box(ctx,i,j,.15,.17,z,.25,color);this.disc(ctx,i+.075,j+.085,z+.26,4.1,'#ecede7');this.disc(ctx,i+.075,j+.085,z+.27,2.5,'#69513e');
  }
  private desk(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    // Pedestal is behind the worktop in painter order, rather than appearing
    // as a floating box painted over the desk surface.
    this.box(ctx,f.i+.2,f.j+.14,.6,.48,.18,.86,'#bec6cc');
    this.line(ctx,[f.i+.2,f.j+.39,.4],[f.i+.2,f.j+.39,.8],'#627384',1.2);
    for(let k=0;k<3;k++) {
      this.line(ctx,[f.i+.81,f.j+.16,.35+k*.24],[f.i+.81,f.j+.59,.35+k*.24],'#8e9aa5',.65);
      this.line(ctx,[f.i+.825,f.j+.29,.46+k*.24],[f.i+.825,f.j+.44,.46+k*.24],'#455969',1.2);
    }
    this.line(ctx,[f.i+.2,f.j+.18,1.04],[f.i+f.w-.2,f.j+.18,1.04],'#6f7c89',2.2);
    this.line(ctx,[f.i+1.38,f.j+1.1,.12],[f.i+1.38,f.j+1.1,1.22],'#586776',.7);
    this.table(ctx,f,1.3,f.color??(f.kind==='designdesk'?'#d3ba9c':'#e3d6c2'));
    this.surface(ctx,f.i+.12,f.j+.28,.8,Math.min(f.d-.5,1.9),1.33,'#586779',.4);
    this.keyboard(ctx,f.i+.02,f.j+.95,1.35);
    const workstation=Number(f.id.match(/(\d+)$/)?.[1]??0)
    this.screen(ctx,f.i+1.35,f.j+.35,workstation%3===1?1.35:1.75,1.33,def.accent,f.kind==='labdesk');
    if(workstation%3===1){
      this.surface(ctx,f.i+.9,f.j+1.92,.65,.5,1.35,'#7d8c98',.5)
      this.face(ctx,[[f.i+1.43,f.j+1.92,1.38],[f.i+1.43,f.j+2.42,1.38],[f.i+1.43,f.j+2.42,1.78],[f.i+1.43,f.j+1.92,1.78]],'#91b3c5',false,.7)
    }
    if(workstation%3===2){
      this.box(ctx,f.i+.98,f.j+f.d-.6,.4,.38,1.34,.12,'#dbc6a1')
      this.surface(ctx,f.i+1,f.j+f.d-.58,.36,.32,1.47,'#f4eee0',.25)
      this.line(ctx,[f.i+1.05,f.j+f.d-.5,1.48],[f.i+1.3,f.j+f.d-.5,1.48],'#728391',.6)
    }
    if(f.kind==='labdesk') this.screen(ctx,f.i+1.44,f.j+1.55,.8,1.33,'#4c7e92',true);
    this.mug(ctx,f.i+.25,f.j+f.d-.35,1.34);
    // Layered notebook, stitched cover, bookmark, pen and a phone dock.
    this.box(ctx,f.i+.8,f.j+.12,.48,.42,1.34,.055,'#71859a');
    this.surface(ctx,f.i+.82,f.j+.14,.43,.36,1.402,'#f4efe3',.35);
    for(let k=0;k<3;k++)this.line(ctx,[f.i+.88,f.j+.2+k*.08,1.407],[f.i+1.18,f.j+.2+k*.08,1.407],'#a9b2b8',.45);
    this.line(ctx,[f.i+.83,f.j+.19,1.42],[f.i+1.18,f.j+.48,1.42],def.accent,1.4);
    this.box(ctx,f.i+1.77,f.j+.2,.22,.33,1.34,.035,'#394958');
    this.surface(ctx,f.i+1.79,f.j+.23,.18,.25,1.38,'#a4bbc8',.2);
    this.box(ctx,f.i+1.92,f.j+f.d-.24,.13,.16,1.34,.28,'#8b9aa4');
    for(let k=0;k<3;k++)this.line(ctx,[f.i+1.95+k*.025,f.j+f.d-.17,1.59],[f.i+1.91+k*.05,f.j+f.d-.17,1.87],k%2?def.accent:'#d7c39f',.95);
    // Desk lamp: grounded base, angled stem and an illuminated shade.
    this.disc(ctx,f.i+1.6,f.j+f.d-.3,1.34,7,'#5c6875');
    this.line(ctx,[f.i+1.6,f.j+f.d-.3,1.34],[f.i+1.6,f.j+f.d-.3,2.1],'#536374',2);
    this.line(ctx,[f.i+1.6,f.j+f.d-.3,2.1],[f.i+1.05,f.j+f.d-.3,2.28],'#536374',2);
    this.box(ctx,f.i+.88,f.j+f.d-.45,.35,.3,2.12,.16,'#56697c');
    this.line(ctx,[f.i+.97,f.j+f.d-.46,2.1],[f.i+1.2,f.j+f.d-.46,2.1],'#fff2c4',2);
    if(f.kind==='designdesk') {
      this.surface(ctx,f.i+.28,f.j+1.95,1,.62,1.34,'#f4f1e7');
      for(let k=0;k<4;k++) this.surface(ctx,f.i+.38+k*.18,f.j+2.07,.13,.22,1.35,['#7695ad','#c5a083','#a9b1a7','#cfb980'][k],.35);
      this.line(ctx,[f.i+.45,f.j+2.47,1.36],[f.i+1.05,f.j+2.47,1.36],'#73879a',.7);
    }
  }
  /** One continuous worktop, paired keyboards and back-to-back screens. */
  private bench(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.line(ctx,[f.i+.5,f.j+.2,.75],[f.i+f.w-.5,f.j+.2,.75],'#596879',3);
    this.line(ctx,[f.i+.5,f.j+f.d-.2,.75],[f.i+f.w-.5,f.j+f.d-.2,.75],'#596879',3);
    this.table(ctx,f,1.3,f.color??'#ddd5c7');
    const center=f.i+f.w/2;
    if(!f.singleSided)this.box(ctx,center-.035,f.j+.14,.07,f.d-.28,1.34,.46,'#6d8191');
    if(!f.singleSided)this.line(ctx,[center,f.j+.14,1.82],[center,f.j+f.d-.14,1.82],'#bac7cd',1.1);
    for(let n=0;n<(f.singleSided?4:Math.round(f.d/2.7));n++) {
      const j=f.j+n*(f.singleSided?3.9:2.7);
      for(const reverse of (f.singleSided?[Boolean(f.reverse)]:[false,true])) {
        const edge=reverse?f.i+f.w-.34:f.i+.02;
        this.surface(ctx,reverse?f.i+f.w-.95:f.i+.08,j+.55,.87,1.75,1.335,'#6d7b87',.4);
        this.keyboard(ctx,edge,j+.95,1.35);
        const screen=f.singleSided?(f.reverse?f.i+.65:f.i+1.45):reverse?center+.38:center-.38;
        this.screen(ctx,screen,j+.48,1.5,1.35,def.accent,(def.templateId??def.id)==='research-lab');
        this.mug(ctx,reverse?f.i+f.w-.48:f.i+.35,j+.35,1.34,reverse?'#9d806a':'#526d88');
        const book=reverse?f.i+f.w-1.4:f.i+.95;
        this.box(ctx,book,j+2.05,.48,.38,1.34,.07,reverse?'#ad8971':'#57798d');
        this.surface(ctx,book+.025,j+2.075,.43,.33,1.415,'#f1eee4',.3);
        for(let k=0;k<3;k++)this.line(ctx,[book+.08,j+2.14+k*.07,1.42],[book+.37,j+2.14+k*.07,1.42],'#93a0ab',.5);
        this.line(ctx,[book+.1,j+2.09,1.43],[book+.39,j+2.37,1.43],def.accent,1.2);
      }
      this.box(ctx,center-.17,j+2.4,.34,.16,1.35,.055,'#455668');
      for(let k=0;k<3;k++)this.surface(ctx,center-.11+k*.08,j+2.44,.04,.07,1.411,'#c7d1d5',0);
    }
  }
  private conference(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.table(ctx,f,1.3,'#e5ddd0');
    for(let n=0;n<Math.floor(f.d/2);n++) {
      const j=f.j+.3+n*2;
      this.surface(ctx,f.i+.12,j,.7,.9,1.34,'#f5f3ec');
      this.line(ctx,[f.i+.25,j+.17,1.35],[f.i+.68,j+.17,1.35],'#9ba8b1',.7);
      this.mug(ctx,f.i+.9,j+.1,1.34,def.accent);
      this.keyboard(ctx,f.i+.02,f.j+.95+n*2.1,1.35);
      this.screen(ctx,f.i+1.15,j+.4,.9,1.33,'#839cac');
    }
    this.disc(ctx,f.i+2.12,f.j+3,1.34,12,'#434f5c');
    this.disc(ctx,f.i+2.12,f.j+3,1.35,8,'#5a6673');
    this.box(ctx,f.i+2.1,f.j+1,.43,.6,1.34,.04,'#e6e9e6');
    for(let k=0;k<4;k++)this.surface(ctx,f.i+2.15,f.j+1.09+k*.1,.24,.035,1.39,'#a8b8c1',0);
    this.box(ctx,f.i+2.05,f.j+4.9,.4,.62,1.34,.045,'#728399');
    this.surface(ctx,f.i+2.08,f.j+4.94,.34,.52,1.39,'#ebe8df',.3);
    this.line(ctx,[f.i+2.52,f.j+4.99,1.4],[f.i+2.53,f.j+5.45,1.4],def.accent,1.4);
    this.disc(ctx,f.i+2.12,f.j+3,1.36,2.8,'#82acb5');
  }
  /** Near-facing chair back and armrest occlude the sitter's lower back. */
  drawChairForeground(ctx:Context,f:Furniture):void {
    if(!f.reverse)return
    const back=f.i+f.w-.17,color=f.color??'#3d5977'
    this.box(ctx,back,f.j+.05,.16,f.d-.1,.87,.91,color)
    this.box(ctx,f.i+.2,f.j+f.d-.04,.57,.085,1.08,.065,'#445564')
    for(let k=0;k<6;k++)this.line(ctx,[back+.17,f.j+.13,1.02+k*.105],[back+.17,f.j+f.d-.13,1.02+k*.105],'rgba(195,211,221,.32)',.55)
  }
  private chair(ctx:Context,f:Furniture):void {
    const i=f.i+f.w/2,j=f.j+f.d/2;
    this.line(ctx,[i,j,.12],[i,j,.85],'#46515f',3);
    for(const [di,dj] of [[.44,0],[-.44,0],[0,.44],[0,-.44],[.3,.3]]) {
      this.line(ctx,[i,j,.13],[i+di,j+dj,.08],'#4c5867',2.5);
      const p=project(i+di,j+dj,.08);ctx.beginPath();ctx.ellipse(p.x,p.y,3,2.2,0,0,Math.PI*2);ctx.fillStyle='#2c3541';ctx.fill();
    }
    this.box(ctx,f.i+.04,f.j+.04,f.w-.08,f.d-.08,.74,.15,f.color??'#3d5977');
    const back=f.reverse?f.i+f.w-.17:f.i+.01;
    this.box(ctx,back,f.j+.05,.16,f.d-.1,.87,.91,f.color??'#3d5977');
    this.line(ctx,[f.i+.22,f.j,.9],[f.i+.78,f.j,1.11],'#334658',2);
    this.line(ctx,[f.i+.22,f.j+f.d,.9],[f.i+.78,f.j+f.d,1.11],'#334658',2);
    for(let k=0;k<6;k++)this.line(ctx,[back+.17,f.j+.13,1.02+k*.105],[back+.17,f.j+f.d-.13,1.02+k*.105],'rgba(195,211,221,.32)',.55);
    this.line(ctx,[f.i+.19,f.j+.13,1.11],[f.i+.19,f.j+f.d-.13,1.11],'#b3bdc5',1.1);
    this.box(ctx,f.i+.2,f.j-.045,.57,.085,1.08,.065,'#445564');
    this.box(ctx,f.i+.2,f.j+f.d-.04,.57,.085,1.08,.065,'#445564');
    this.line(ctx,[f.i+.23,f.j+.1,.905],[f.i+f.w-.15,f.j+.1,.905],'#788b9d',.6);
    this.disc(ctx,i,j,.22,3.5,'#929da7');
  }
  private cabinet(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.box(ctx,f.i,f.j,f.w,f.d,.1,1.18,f.color??'#74818c');
    this.box(ctx,f.i-.03,f.j-.03,f.w+.06,f.d+.06,1.28,.09,'#ded9cc');
    const n=Math.max(1,Math.floor(Math.max(f.w,f.d)/.8));
    if(f.d>f.w) for(let k=1;k<n;k++) this.line(ctx,[f.i+f.w+.01,f.j+f.d*k/n,.16],[f.i+f.w+.01,f.j+f.d*k/n,1.23],'#4f5e6c',.8);
    else for(let k=1;k<n;k++) this.line(ctx,[f.i+f.w*k/n,f.j+f.d+.01,.16],[f.i+f.w*k/n,f.j+f.d+.01,1.23],'#4f5e6c',.8);
    for(let k=0;k<n;k++) {
      if(f.d>f.w)this.line(ctx,[f.i+f.w+.025,f.j+(k+.5)*f.d/n-.1,.86],[f.i+f.w+.025,f.j+(k+.5)*f.d/n+.1,.86],'#d9dbd5',1.4);
      else this.line(ctx,[f.i+(k+.5)*f.w/n-.1,f.j+f.d+.025,.86],[f.i+(k+.5)*f.w/n+.1,f.j+f.d+.025,.86],'#d9dbd5',1.4);
    }
    this.box(ctx,f.i+.1,f.j+.13,.43,.32,1.38,.07,'#d8d4c9');
    this.box(ctx,f.i+.12,f.j+.15,.39,.29,1.46,.045,'#ecede5');
    for(let k=0;k<Math.min(n,4);k++) {
      const i=f.i+.12+(f.w>f.d?k*.42:0),j=f.j+.12+(f.d>f.w?k*.42:0);
      this.box(ctx,i,j,.16,.28,1.39,.48,k%2?'#e7e7df':'#3d4b5b');
      this.line(ctx,[i+.165,j+.05,1.52],[i+.165,j+.23,1.52],'#acb6bd',.7);
    }
    if(f.kind==='printer') {
      this.box(ctx,f.i+.1,f.j+.2,.8,.7,1.38,.4,'#d8dee0');
      this.box(ctx,f.i+.08,f.j+.18,.84,.7,1.77,.1,'#4c5b6b');
      this.surface(ctx,f.i+.2,f.j+.25,.53,.48,1.89,'#f6f4eb');
      this.line(ctx,[f.i+.92,f.j+.28,1.6],[f.i+.92,f.j+.6,1.6],def.accent,2);
    }
    if(f.kind==='coffeebar') {
      this.box(ctx,f.i+.07,f.j+1.3,.73,.9,1.38,.9,'#334351');
      this.box(ctx,f.i+.81,f.j+1.45,.05,.54,1.58,.5,'#8b9aa7');
      this.line(ctx,[f.i+.88,f.j+1.57,2.05],[f.i+.88,f.j+1.95,2.05],'#afbfcb',2);
      this.mug(ctx,f.i+.8,f.j+1.7,1.4,'#ddd8cb');
      this.mug(ctx,f.i+.5,f.j+3.1,1.4,'#c5bcaa');
    }
  }
  private bookcase(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    const h=f.height??2.85, color=f.color??'#667987';
    // Open-backed custom joinery with recessed shelves, varied book spines,
    // magazine files, storage boxes, labels and small ceramic display pieces.
    this.box(ctx,f.i,f.j,f.w,f.d,.08,h,color);
    this.face(ctx,[[f.i+f.w+.015,f.j+.08,.18],[f.i+f.w+.015,f.j+f.d-.08,.18],[f.i+f.w+.015,f.j+f.d-.08,h-.08],[f.i+f.w+.015,f.j+.08,h-.08]],'#3c4e60',true,.6);
    const levels=4, gap=(h-.24)/levels;
    const colors=['#ddd6c7','#688397','#b88c75','#c3bda8','#91a8ae','#e9e5da','#69768b'];
    for(let row=0;row<levels;row++) {
      const z=.18+row*gap;
      this.box(ctx,f.i+.04,f.j+.04,f.w+.01,f.d-.08,z,.055,shade(color,25));
      let j=f.j+.16;
      for(let k=0;j<f.j+f.d-.2;k++) {
        const width=.12+((k*7+row*3)%4)*.032;
        const height=gap*(.57+((k+row*3)%5)*.065);
        const spine=colors[(k+row*2)%colors.length];
        this.box(ctx,f.i+.16,j,f.w-.18,width,z+.06,height,spine);
        this.line(ctx,[f.i+f.w+.006,j+.025,z+.13],[f.i+f.w+.006,j+width-.025,z+.13],'#f0e9d9',.7);
        this.line(ctx,[f.i+f.w+.008,j+.035,z+height-.055],[f.i+f.w+.008,j+width-.035,z+height-.055],'#46596a',.65);
        if(k%3===0)this.line(ctx,[f.i+f.w+.01,j+width*.5,z+.22],[f.i+f.w+.01,j+width*.5,z+height-.1],'#e1ded1',.55);
        j+=width+.025;
      }
      this.line(ctx,[f.i+f.w+.035,f.j+.07,z+.07],[f.i+f.w+.035,f.j+f.d-.07,z+.07],'#d6d4c7',.8);
    }
    this.box(ctx,f.i-.025,f.j-.025,f.w+.05,f.d+.05,h+.08,.09,'#c9c9bd');
    this.box(ctx,f.i+.15,f.j+.3,.45,.65,h+.18,.1,def.accent);
    this.box(ctx,f.i+.16,f.j+.33,.43,.59,h+.29,.065,'#e7dfcb');
    this.mug(ctx,f.i+.36,f.j+f.d-.45,h+.18,'#d4c3ab');
  }
  private server(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    const h=f.height??2.9;
    this.box(ctx,f.i,f.j,f.w,f.d,.08,h,'#394956');
    this.face(ctx,[[f.i+f.w+.01,f.j+.07,.25],[f.i+f.w+.01,f.j+f.d-.07,.25],[f.i+f.w+.01,f.j+f.d-.07,h-.1],[f.i+f.w+.01,f.j+.07,h-.1]],'#263846',true,.6);
    for(let k=0;k<8;k++) {
      const z=.34+k*.29;
      this.line(ctx,[f.i+f.w+.02,f.j+.14,z],[f.i+f.w+.02,f.j+f.d-.14,z],'#677a88',1);
      this.line(ctx,[f.i+f.w+.03,f.j+.2,z+.1],[f.i+f.w+.03,f.j+.26,z+.1],k%3?'#78b9b3':def.accent,2.2);
      this.line(ctx,[f.i+f.w+.03,f.j+.37,z+.1],[f.i+f.w+.03,f.j+.43,z+.1],'#b3c7cf',1.3);
    }
  }
  private glass(ctx:Context,f:Furniture):void {
    const i=f.i,j=f.j,h=3.5;
    this.face(ctx,[[i,j,0],[i,j+f.d,0],[i,j+f.d,h],[i,j,h]],'rgba(151,192,215,.10)',false,1.7);
    for(let k=0;k<=3;k++) this.line(ctx,[i,j+k*f.d/3,0],[i,j+k*f.d/3,h],'#3b5268',2.5);
    this.line(ctx,[i,j,1.75],[i,j+f.d,1.75],'rgba(227,242,248,.7)',2);
    this.face(ctx,[[i+.01,j+.15,.15],[i+.01,j+.6,.15],[i+.01,j+f.d-.15,3.2],[i+.01,j+f.d-.6,3.2]],'rgba(248,252,255,.1)',false,0);
  }
  private sofa(ctx:Context,f:Furniture):void {
    const color=f.color??'#4f6d88';
    for(const [i,j]of[[f.i+.15,f.j+.15],[f.i+f.w-.2,f.j+f.d-.2]])this.box(ctx,i,j,.12,.12,.02,.24,'#4c535b');
    this.box(ctx,f.i,f.j,f.w,f.d,.23,.52,shade(color,-14));
    this.box(ctx,f.i,f.j,.27,f.d,.7,.85,color);
    const n=f.kind==='armchair'?1:3;
    for(let k=0;k<n;k++)this.box(ctx,f.i+.26,f.j+.14+k*(f.d-.28)/n,f.w-.4,(f.d-.35)/n,.75,.16,shade(color,12));
    this.box(ctx,f.i,f.j,f.w,.2,.7,.49,color);
    this.box(ctx,f.i,f.j+f.d-.2,f.w,.2,.7,.49,color);
    for(let k=0;k<n;k++) {
      const j=f.j+.18+k*(f.d-.28)/n;
      this.line(ctx,[f.i+.31,j,.93],[f.i+f.w-.18,j,.93],'rgba(222,228,231,.45)',.65);
      this.line(ctx,[f.i+.28,j+.06,1.28],[f.i+.28,j+(f.d-.35)/n-.07,1.28],'rgba(222,228,231,.28)',.6);
    }
    if(f.kind==='sofa')this.box(ctx,f.i+.3,f.j+.4,.34,.55,.93,.38,'#c8b59d');
    for(let k=1;k<n;k++)this.line(ctx,[f.i+.06,f.j+f.d*k/n,.87],[f.i+.06,f.j+f.d*k/n,1.45],'rgba(230,236,239,.25)',.65);
  }
  private coffee(ctx:Context,f:Furniture):void {
    this.table(ctx,f,.72,'#d0b999');
    this.surface(ctx,f.i+.23,f.j+.24,.78,.88,.76,'#f4f0e6');
    this.line(ctx,[f.i+.3,f.j+.35,.77],[f.i+.85,f.j+.35,.77],'#7e96aa',1.3);
    this.line(ctx,[f.i+.3,f.j+.53,.77],[f.i+.7,f.j+.53,.77],'#aab1b5',.8);
    this.surface(ctx,f.i+.25,f.j+.38,.62,.1,.78,'#5d7c95',.2);
    for(let k=0;k<4;k++)this.line(ctx,[f.i+.31,f.j+.62+k*.08,.78],[f.i+.7,f.j+.62+k*.08,.78],'#a1a8aa',.5);
    this.box(ctx,f.i+.29,f.j+1.43,.58,.66,.75,.06,'#8c9eaa');
    this.surface(ctx,f.i+.32,f.j+1.47,.51,.57,.82,'#e8e2d2',.4);
    this.mug(ctx,f.i+.72,f.j+1.75,.76,'#e1dbcf');
    this.disc(ctx,f.i+.72,f.j+1.75,.76,10,'#747a80');
  }
  private prototype(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.box(ctx,f.i,f.j,f.w,f.d,.05,1.05,'#b9c1c6');
    this.box(ctx,f.i-.03,f.j-.03,f.w+.06,f.d+.06,1.1,.08,'#e5e2d9');
    const i=f.i+.45,j=f.j+.5;
    if((def.templateId??def.id)==='research-lab') {
      // A small observatory model: a brass orbit, glass planet and sample vials.
      this.box(ctx,i,j,.7,.7,1.2,.18,'#718f8a');
      this.disc(ctx,i+.35,j+.35,1.65,17,'#8ebcba');
      this.disc(ctx,i+.35,j+.35,1.69,10,'#c8daca');
      this.line(ctx,[i+.05,j+.35,1.5],[i+.65,j+.35,2.12],'#d6b97e',2);
      for(let k=0;k<3;k++)this.box(ctx,f.i+1.55,f.j+.35+k*.4,.2,.2,1.2,.38,['#afcba9','#d2ac88','#b8a0bf'][k]);
    } else if((def.templateId??def.id)==='collaboration-suite') {
      // The team's little diagnostics robot, parked on its maintenance plinth.
      this.box(ctx,i,j,.64,.65,1.2,.52,'#9eb8bd');
      this.box(ctx,i-.08,j-.04,.8,.74,1.75,.5,'#d7d8c8');
      this.box(ctx,i+.73,j+.08,.025,.48,1.87,.23,'#345c68');
      for(let k=0;k<2;k++)this.disc(ctx,i+.77,j+.18+k*.25,2.02,2.2,'#b8d7af');
      this.line(ctx,[i+.32,j+.32,2.25],[i+.32,j+.32,2.52],'#657b8e',1.4);
      this.disc(ctx,i+.32,j+.32,2.53,3,'#dfaa6e');
      this.box(ctx,i-.15,j+.22,.15,.2,1.42,.25,def.accent);
    } else if((def.templateId??def.id)==='design-studio') {
      for(let k=0;k<3;k++)this.box(ctx,i+k*.36,j+k*.14,.48,.48,1.2,.38+k*.27,['#9aafb4','#d5b38c','#b68c9a'][k]);
      this.disc(ctx,i+.8,j+.6,2.45,11,'#d8c19b');
    } else if((def.templateId??def.id)==='operations-hub') {
      for(let k=0;k<4;k++)this.box(ctx,i+(k%2)*.65,j+Math.floor(k/2)*.6,.54,.5,1.2,.35+(k%2)*.2,['#c9aa80','#b2c0b4'][k%2]);
      this.surface(ctx,i+.12,j+.1,.2,.3,1.76,'#f2eddd');
    } else if((def.templateId??def.id)==='learning-room') {
      this.screen(ctx,i,j,1.3,1.2,def.accent,true);
      for(let k=0;k<3;k++)this.box(ctx,i+.2,j+.4+k*.37,.8,.3,1.2,.06,['#d3b075','#94aaa0','#b396aa'][k]);
    } else {
      this.box(ctx,i,j,.65,.65,1.2,.6,def.accent);
      this.box(ctx,i+.16,j+.16,.35,.35,1.8,.45,'#c6d1d7');
      this.line(ctx,[i+.33,j+.32,2.26],[i+.33,j+.32,2.51],'#657b8e',1.5);
      this.disc(ctx,i+.33,j+.32,2.52,4,'#e0bb83');
    }
    this.surface(ctx,f.i+.2,f.j+f.d-.5,.5,.28,1.2,'#f6f2e9');
  }
  private kitchenette(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.cabinet(ctx,def,{...f,kind:'coffeebar'});
    // Tall refrigerator with two recessed doors, dispenser and brushed handles.
    const j=f.j+f.d-1.08;
    this.box(ctx,f.i,j,f.w,1.02,.08,2.82,'#b9c5cc');
    for(const z of [1.02,2.2])this.line(ctx,[f.i+f.w+.02,j+.1,z],[f.i+f.w+.02,j+.92,z],'#667d8e',1);
    this.line(ctx,[f.i+f.w+.04,j+.18,1.2],[f.i+f.w+.04,j+.18,1.92],'#394e5f',2.5);
    this.line(ctx,[f.i+f.w+.04,j+.18,2.36],[f.i+f.w+.04,j+.18,2.65],'#394e5f',2.5);
    this.face(ctx,[[f.i+f.w+.03,j+.36,1.35],[f.i+f.w+.03,j+.77,1.35],[f.i+f.w+.03,j+.77,1.95],[f.i+f.w+.03,j+.36,1.95]],'#405868',true,.7);
    // Inset sink, silver tap, draining rack and wall-mounted crockery shelves.
    this.surface(ctx,f.i+.12,f.j+.16,.64,.72,1.39,'#667d8b',.9);
    this.surface(ctx,f.i+.2,f.j+.23,.46,.55,1.4,'#b0c4cd',.7);
    this.line(ctx,[f.i+.13,f.j+.5,1.45],[f.i+.13,f.j+.5,1.95],'#b1c4d0',2.4);
    this.line(ctx,[f.i+.13,f.j+.5,1.95],[f.i+.47,f.j+.5,1.95],'#b1c4d0',2.4);
    this.line(ctx,[f.i+.47,f.j+.5,1.95],[f.i+.47,f.j+.5,1.76],'#b1c4d0',2.4);
    for(let r=0;r<2;r++) {
      this.box(ctx,f.i+.03,f.j+.1,.5,Math.min(2.2,f.d-1.3),2.35+r*.55,.075,'#b8a58f');
      for(let k=0;k<4;k++)this.mug(ctx,f.i+.15,f.j+.22+k*.44,2.44+r*.55,k%2?'#f2ecdc':def.accent);
    }
  }
  private lockers(ctx:Context,f:Furniture):void {
    const h=f.height??2.6,n=Math.max(2,Math.floor(f.d/.65));
    this.box(ctx,f.i,f.j,f.w,f.d,.05,h,'#8e9eaa');
    for(let k=0;k<n;k++)for(let r=0;r<2;r++) {
      const j=f.j+k*f.d/n+.035,z=.14+r*(h-.1)/2;
      this.face(ctx,[[f.i+f.w+.02,j,z],[f.i+f.w+.02,j+f.d/n-.07,z],[f.i+f.w+.02,j+f.d/n-.07,z+(h-.22)/2],[f.i+f.w+.02,j,z+(h-.22)/2]],'#c4cbd0',true,.75);
      for(let v=0;v<3;v++)this.line(ctx,[f.i+f.w+.035,j+.13,z+.73+v*.055],[f.i+f.w+.035,j+f.d/n-.17,z+.73+v*.055],'#718491',.65);
      this.line(ctx,[f.i+f.w+.04,j+.13,z+.32],[f.i+f.w+.04,j+.13,z+.51],'#344e62',1.6);
      this.face(ctx,[[f.i+f.w+.04,j+.27,z+.41],[f.i+f.w+.04,j+.43,z+.41],[f.i+f.w+.04,j+.43,z+.52],[f.i+f.w+.04,j+.27,z+.52]],'#ede9dc',false,.3);
    }
  }
  private foosball(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.table(ctx,f,1.25,'#a48c70');
    this.box(ctx,f.i+.1,f.j+.1,f.w-.2,f.d-.2,1.27,.18,'#314f62');
    this.surface(ctx,f.i+.18,f.j+.18,f.w-.36,f.d-.36,1.47,'#638f88',.6);
    this.surface(ctx,f.i+f.w*.48,f.j+.2,.04,f.d-.4,1.48,'#e7e7d7',0);
    for(let n=0;n<6;n++) {
      const i=f.i+.4+n*(f.w-.8)/5;
      this.line(ctx,[i,f.j-.2,1.58],[i,f.j+f.d+.2,1.58],'#d3dadd',1.3);
      this.box(ctx,i-.055,f.j-.35,.11,.2,1.53,.11,'#354958');
      for(let k=0;k<3;k++){const j=f.j+.38+k*(f.d-.76)/2;this.box(ctx,i-.05,j,.1,.1,1.43,.26,n%2?def.accent:'#cc8f6c');}
    }
    this.disc(ctx,f.i+f.w*.57,f.j+f.d*.62,1.49,3,'#f8f1d8');
    for(const i of [f.i+.04,f.i+f.w-.1])this.box(ctx,i,f.j+.59,.06,.62,1.45,.24,'#eee6d5');
  }
  private watercooler(ctx:Context,f:Furniture):void {
    this.box(ctx,f.i,f.j,f.w,f.d,.04,1.4,'#e7e7e0');
    this.box(ctx,f.i+.12,f.j+.1,f.w-.24,f.d-.2,1.44,.7,'#93b8ce');
    for(let k=0;k<3;k++)this.line(ctx,[f.i+.14,f.j+.11,1.58+k*.17],[f.i+f.w-.14,f.j+.11,1.58+k*.17],'#c4dae5',.9);
    this.face(ctx,[[f.i+f.w+.02,f.j+.13,.59],[f.i+f.w+.02,f.j+f.d-.13,.59],[f.i+f.w+.02,f.j+f.d-.13,1.13],[f.i+f.w+.02,f.j+.13,1.13]],'#506d80',true,.65);
    this.line(ctx,[f.i+f.w+.05,f.j+.22,1.06],[f.i+f.w+.05,f.j+.22,.94],'#bd6c64',2.4);
    this.line(ctx,[f.i+f.w+.05,f.j+.43,1.06],[f.i+f.w+.05,f.j+.43,.94],'#639ab6',2.4);
    this.mug(ctx,f.i+f.w-.11,f.j+.23,.62,'#e7ddd0');
  }
  private media(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.cabinet(ctx,def,f);
    if(f.d>f.w)this.screen(ctx,f.i+.6,f.j+.22,f.d-.44,1.4,def.accent);
    else {this.box(ctx,f.i+.28,f.j+.15,f.w-.56,.12,1.4,1.75,'#273d50');this.face(ctx,[[f.i+.36,f.j+.285,1.53],[f.i+f.w-.36,f.j+.285,1.53],[f.i+f.w-.36,f.j+.285,3.04],[f.i+.36,f.j+.285,3.04]],'#a6c6d8',false,.8);for(let k=0;k<4;k++)this.face(ctx,[[f.i+.52+k*.65,f.j+.3,1.69],[f.i+.96+k*.65,f.j+.3,1.69],[f.i+.96+k*.65,f.j+.3,2.08+k*.2],[f.i+.52+k*.65,f.j+.3,2.08+k*.2]],def.accent,true,.4);}
  }
  private displayTable(ctx:Context,def:OfficeDefinition,f:Furniture):void {
    this.table(ctx,f,1.24,f.color??'#d1b99a');
    const i=f.i,j=f.j,z=1.29;
    this.surface(ctx,i+.14,j+.14,f.w-.28,f.d-.28,z,'#eee9da',.55);
    if((def.templateId??def.id)==='research-lab') {
      // Microscope, specimen dishes and a colour-coded sample rack.
      this.box(ctx,i+.3,j+.4,.6,.7,z,.12,'#576e78');
      this.line(ctx,[i+.6,j+.7,z+.15],[i+.6,j+.7,z+.8],'#687b83',5);
      this.line(ctx,[i+.6,j+.7,z+.8],[i+.93,j+.7,z+.98],'#405d6b',5);
      this.box(ctx,i+.77,j+.62,.3,.16,z+.85,.22,'#9db8bd');
      this.surface(ctx,i+.45,j+.35,.55,.65,z+.43,'#405965',.8);
      for(let k=0;k<4;k++) {
        const x=i+1.35+k*.37;
        this.box(ctx,x,j+.32,.19,.25,z,.45,'#b9d6d7');
        this.box(ctx,x+.025,j+.345,.14,.2,z+.04,.17,['#d4ad6c','#8cbbac','#a68cba','#7fa6c2'][k]);
        this.box(ctx,x-.015,j+.31,.22,.27,z+.46,.055,def.accent);
      }
      for(let k=0;k<3;k++){this.disc(ctx,i+1.6+k*.5,j+1.45,z,9,'#9eb9bb');this.disc(ctx,i+1.6+k*.5,j+1.45,z+.02,6,'#d8d9a0');}
    } else if((def.templateId??def.id)==='collaboration-suite') {
      // Small repair bench: open chassis, diagnostic screen and cable spools.
      this.box(ctx,i+.3,j+.3,1.1,.85,z,.21,'#496675');
      this.surface(ctx,i+.38,j+.38,.92,.67,z+.23,'#6f9e8f',.5);
      for(let k=0;k<5;k++)this.box(ctx,i+.47+k*.15,j+.49,.09,.33,z+.24,.06,'#d8c897');
      this.screen(ctx,i+2,j+.32,.9,z,def.accent,true);
      for(let k=0;k<3;k++){this.disc(ctx,i+.7+k*.5,j+1.7,z,7,'#778f96');this.disc(ctx,i+.7+k*.5,j+1.7,z+.02,3,'#d7d2b5');}
    } else if((def.templateId??def.id)==='marketing-studio') {
      // Campaign boards, packages and a small product photography sweep.
      for(let k=0;k<4;k++) {
        const x=i+.23+k*.5;
        this.surface(ctx,x,j+.27,.4,1.3,z+.02,['#dfc28e','#d196a8','#9abac5','#b1c29a'][k],.6);
        this.surface(ctx,x+.06,j+.38,.28,.46,z+.03,'#f3eee2',.3);
        for(let r=0;r<3;r++)this.line(ctx,[x+.07,j+1+r*.12,z+.04],[x+.31,j+1+r*.12,z+.04],'#8e8591',.7);
      }
      this.box(ctx,i+2.7,j+.45,.55,.65,z,.5,def.accent);
      this.box(ctx,i+2.83,j+.58,.29,.39,z+.51,.09,'#edd4a5');
    } else if((def.templateId??def.id)==='operations-hub') {
      for(let k=0;k<5;k++) {
        const x=i+.25+(k%3)*.94,y=j+.25+Math.floor(k/3)*.9,h=.3+(k%3)*.11;
        this.box(ctx,x,y,.72,.66,z,h,['#c8a679','#aebdbb','#d2b28f'][k%3]);
        this.surface(ctx,x+.22,y+.02,.12,.62,z+h+.01,'#ece4cc',.2);
        this.surface(ctx,x+.43,y+.17,.2,.25,z+h+.02,'#f6f0df',.3);
      }
    } else if((def.templateId??def.id)==='team-lounge') {
      this.disc(ctx,i+.9,j+.8,z,19,'#b6c2bd');
      for(let k=0;k<4;k++)this.disc(ctx,i+.6+(k%2)*.5,j+.5+Math.floor(k/2)*.5,z+.04,7,'#d5a56e');
      for(let k=0;k<3;k++)this.mug(ctx,i+2+k*.43,j+.6,z,['#b77662','#789da1','#b9aa71'][k]);
      this.box(ctx,i+2.1,j+1.35,.65,.5,z,.25,'#b98b65');
    } else if((def.templateId??def.id)==='strategy-room') {
      this.surface(ctx,i+.3,j+.3,f.w-.6,f.d-.6,z+.02,'#aabbb4',.5);
      for(let k=0;k<7;k++)this.box(ctx,i+.5+(k%4)*.62,j+.5+Math.floor(k/4)*.78,.34,.38,z+.04,.2+(k%3)*.3,['#e0d6bf','#9dafb2','#9fafa1'][k%3]);
      this.line(ctx,[i+.35,j+1.1,z+.05],[i+f.w-.35,j+1.1,z+.05],'#e7dbb9',3);
    } else {
      // Design swatches, training exercise sheets and people-team welcome kits.
      for(let k=0;k<6;k++){const x=i+.27+(k%3)*.5,y=j+.28+Math.floor(k/3)*.58;this.surface(ctx,x,y,.4,.45,z+.02,['#89a6ae','#c5a781','#b27e68','#89987e','#7491ac','#e1c77e'][k],.4);}
      this.box(ctx,i+f.w-.85,j+.3,.52,.6,z,.09,def.accent);
      this.box(ctx,i+f.w-.82,j+.33,.46,.54,z+.1,.055,'#eee8db');
      this.mug(ctx,i+f.w-.65,j+f.d-.6,z,def.accent);
    }
  }
  private flatfiles(ctx:Context,f:Furniture):void {
    this.box(ctx,f.i,f.j,f.w,f.d,.1,1.15,'#8b9da7');
    for(let k=0;k<5;k++) {
      const z=.2+k*.2;this.line(ctx,[f.i+.06,f.j+f.d+.02,z],[f.i+f.w-.06,f.j+f.d+.02,z],'#4c6374',.8);
      for(const offset of [.28,.69])this.line(ctx,[f.i+f.w*offset-.12,f.j+f.d+.04,z+.095],[f.i+f.w*offset+.12,f.j+f.d+.04,z+.095],'#dde0d7',1.5);
    }
    this.surface(ctx,f.i+.12,f.j+.2,f.w-.3,f.d-.4,1.27,'#eee9dc',.5);
    for(let k=0;k<3;k++)this.line(ctx,[f.i+.3,f.j+.32+k*.14,1.28],[f.i+f.w-.5,f.j+.32+k*.14,1.28],'#9aafb9',.6);
    this.box(ctx,f.i+f.w-.42,f.j+.1,.15,.42,1.28,.15,'#b58e73');
  }

}
