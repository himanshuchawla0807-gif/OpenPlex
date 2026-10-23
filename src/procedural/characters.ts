import {
  ANIMATION_DOCUMENT_VERSION, assertValidAnimationDocument, constant, withComputedRevision,
  type AnimationDocument, type Animatable, type Color, type SceneNode, type Transform25D, type Vec3,
} from '@clayzo/animation/authoring'
import {illustrationContour} from './illustrationGeometry.ts'
import { solveTwoBone, typingHandTarget, walkingFootTarget } from './characterKinematics.ts'

// Art direction: inhabit; articulated, three-quarter office silhouettes; chalk,
// ink, denim blue and muted coral. Tailored panels, relaxed denim and shaped
// hands remain legible at office scale; facial construction rewards close zoom.
// No copy or image assets. Static detail rides its parent joint, never a new track.
export const CELL = 128
export const CHARACTER_COUNT = 25
export const CHARACTER_ROWS = 4
export const CHARACTER_DURATION = 960
export const characterStyles = [
  {id:'anika',shirt:'#f3e9d8',pants:'#3f4041',skin:'#f0cfb5',hair:'#2d2927',long:true},
  {id:'maya',shirt:'#c67c67',pants:'#303c56',skin:'#efc8b1',hair:'#34303a',long:true},
  {id:'riya',shirt:'#eae9e1',pants:'#819bb7',skin:'#f4d8c6',hair:'#222e38',long:true},
  {id:'tara',shirt:'#faf5ec',pants:'#849eb5',skin:'#f0d2bc',hair:'#483d38',long:true},
  {id:'leah',shirt:'#d7c9be',pants:'#eee9df',skin:'#edcbb8',hair:'#33303b',long:true},
  {id:'arjun',shirt:'#a9c1cf',pants:'#303e55',skin:'#edccb8',hair:'#30323c',long:false},
  {id:'daniel',shirt:'#f1ede4',pants:'#5a6270',skin:'#f3d8c5',hair:'#4c3b31',long:false},
  {id:'kabir',shirt:'#c5856e',pants:'#434b58',skin:'#eac6b3',hair:'#262d36',long:false},
  {id:'leo',shirt:'#f2eee4',pants:'#91a3ad',skin:'#f0d0b9',hair:'#3b3434',long:false},
  {id:'sam',shirt:'#91a8a0',pants:'#424b59',skin:'#efd3c1',hair:'#2a3039',long:false},
  {id:'ella',shirt:'#fffaf0',pants:'#7594b1',skin:'#f6ddcd',hair:'#b68b54',long:true},
  {id:'oliver',shirt:'#e9e3d7',pants:'#3c4657',skin:'#edd0bc',hair:'#76513a',long:false},
  {id:'sophie',shirt:'#c5cbd1',pants:'#efebe4',skin:'#f4d6c2',hair:'#663f30',long:true},
  {id:'noah',shirt:'#f6f2eb',pants:'#8b9cac',skin:'#f1d0bb',hair:'#a88455',long:false},
  {id:'chloe',shirt:'#f7f3e9',pants:'#8299b2',skin:'#f5decb',hair:'#d0ad76',long:true},
  {id:'james',shirt:'#52677b',pants:'#343f50',skin:'#ebc7b2',hair:'#38322e',long:false},
  {id:'emily',shirt:'#b7b0c4',pants:'#eee9df',skin:'#f3d5c2',hair:'#a76643',long:true},
  {id:'lucas',shirt:'#e7e9e7',pants:'#647e94',skin:'#f0cfbb',hair:'#5b4434',long:false},
  {id:'ava',shirt:'#f5f0e7',pants:'#748ea7',skin:'#f6ddcd',hair:'#382d29',long:true},
  {id:'ethan',shirt:'#9eafa8',pants:'#e9e1d5',skin:'#eecbb7',hair:'#a08358',long:false},
  {id:'isla',shirt:'#d9bfac',pants:'#454c5b',skin:'#f5dac9',hair:'#bd8f60',long:true},
  {id:'florence',shirt:'#747f91',pants:'#e1d8c8',skin:'#f3d9c8',hair:'#655043',long:true},
  {id:'felix',shirt:'#c5b6a4',pants:'#76899c',skin:'#f0d5c2',hair:'#40362e',long:false},
  {id:'alice',shirt:'#e8e2d8',pants:'#4d6278',skin:'#f6ddcd',hair:'#b38751',long:true},
  {id:'theo',shirt:'#c9d2ce',pants:'#484e5a',skin:'#f0d0bd',hair:'#795340',long:false},
]
/** The full wardrobe is available independently of the 21 deployed employees. */
export const characterWardrobe = [
  'Ivory blazer · charcoal tailoring','Terracotta tee · relaxed denim','Indigo overshirt · wide-leg denim',
  'Chalk tee · washed denim','Soft blazer · ivory trousers','Oxford shirt · navy chinos',
  'Linen jacket · slate trousers','Clay shirt · tailored charcoal','Boxy tee · stone denim',
  'Sage shirt · charcoal chinos','Denim jacket · cream tee','Sand blazer · ink tailoring',
  'Grey blazer · ivory trousers','Off-white tee · faded jeans','Light denim jacket · white tee',
  'Midnight blazer · straight trousers','Lilac blouse · pearl trousers','Utility tee · blue denim',
  'Dark denim jacket · relaxed jeans','Sage shirt · ecru chinos','Camel blazer · graphite trousers',
  'Slate waistcoat · pleated ecru trousers','Sand hoodie · indigo cargo jeans',
  'Oat cable knit · navy wide-leg jeans','Sage camp-collar shirt · charcoal trousers',
] as const
const color = (hex:string):Color => ({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255,a:1})
const transform = (x:number,y:number):Transform25D => ({position:constant({x,y,z:0}),anchor:constant({x:0,y:0,z:0}),scale:constant({x:1,y:1,z:1}),rotation:constant({x:0,y:0,z:0}),skew:constant({x:0,y:0})})

/** A single shared, live vector stage: employees × walk / seated / idle / reverse seated.
 * Clayzo evaluates the hierarchical joints at 60fps. No bitmap character assets. */
let cachedCharacterDocument:AnimationDocument|undefined
export function createCharacterDocument():AnimationDocument {
  if(cachedCharacterDocument)return cachedCharacterDocument
  const nodes:Record<string,SceneNode> = {}
  const roots:string[] = []
  const base = (id:string,x:number,y:number) => ({id,name:id,visible:true,inTick:0,outTick:CHARACTER_DURATION,opacity:constant(1),transform:transform(x,y),blendMode:'normal' as const})
  const put = (node:SceneNode) => {nodes[node.id]=node;return node.id}
  const style = (fill:string,stroke=true) => ({fill:{color:constant(color(fill)),opacity:constant(1)},...(stroke?{stroke:{color:constant(color('#403b38')),opacity:constant(.85),width:constant(.32),lineCap:'round' as const,lineJoin:'round' as const,miterLimit:2}}:{})})
  const rect = (id:string,x:number,y:number,w:number,h:number,fill:string,r=2) => put({...base(id,x,y),type:'rect',size:constant({width:w,height:h}),cornerRadius:constant(r),style:id.endsWith('-glasses')?{...style(fill,true),fill:{color:constant(color(fill)),opacity:constant(.12)}}:style(fill,false)})
  const ellipse = (id:string,x:number,y:number,w:number,h:number,fill:string,stroke=false) => put({...base(id,x,y),type:'ellipse',size:constant({width:w,height:h}),style:style(fill,stroke)})
  const polygon = (id:string,points:number[][],fill:string) => put({...base(id,0,0),type:'path',path:constant({contours:[{closed:true,vertices:points.map(([x,y])=>({point:{x,y},inTangent:{x:0,y:0},outTangent:{x:0,y:0}}))}]}),style:style(fill,false)})
  // Merge related stitching / facial marks into one static path, so richer
  // illustration does not add an animated node for every tiny detail.
  const lines = (id:string,contours:number[][][],ink:string,width=.5) => put({...base(id,0,0),type:'path',path:constant({contours:contours.map(points=>({closed:false,vertices:points.map(([x,y])=>({point:{x,y},inTangent:{x:0,y:0},outTangent:{x:0,y:0}}))}))}),style:{stroke:{color:constant(color(ink)),opacity:constant(1),width:constant(width),lineCap:'round',lineJoin:'round',miterLimit:2}}})
  // Cubic tangents round shoulders, jawlines, hems and trouser folds at every zoom.
  const richStyle=(id:string,points:number[][],fill:string)=>{
    const result=style(fill,!/seam|fold|cuff|hem|cheek|shine|mouth|plane|strand|finger|thumb|eyewhite|far-eye/.test(id))
    if(/-(face|nose|hair|rear-head-skin|rear-hair|hairback)$/.test(id)&&result.stroke)result.stroke.width=constant(.18)
    if(id.endsWith('-cheek-shine'))return {...result,fill:undefined,gradientFill:{kind:'radial' as const,start:constant({x:2.7,y:2}),end:constant({x:4.6,y:2}),opacity:constant(1),stops:constant([{position:0,color:{...color(fill),a:.5}},{position:1,color:{...color(fill),a:0}}])}}
    if(!/-(face|torso|hair)$/.test(id))return result
    const tint=(amount:number)=>'#'+[1,3,5].map(k=>Math.max(0,Math.min(255,parseInt(fill.slice(k,k+2),16)+amount)).toString(16).padStart(2,'0')).join('')
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1])
    return {...result,fill:undefined,gradientFill:{kind:'linear' as const,start:constant({x:Math.min(...xs),y:Math.min(...ys)}),end:constant({x:Math.max(...xs),y:Math.max(...ys)}),opacity:constant(1),stops:constant([{position:0,color:color(tint(13))},{position:.42,color:color(fill)},{position:1,color:color(tint(-17))}])}}
  }
  const curved = (id:string,points:number[][],fill:string,tension=.15) => put({...base(id,0,0),type:'path',path:constant({contours:[{closed:true,vertices:/-(face|hair|hairback|rear-hair|swept-hair|temple-lock|loose-side-lock|torso)$/.test(id)?illustrationContour(points,tension).map(point=>({point,inTangent:{x:0,y:0},outTangent:{x:0,y:0}})):points.map(([x,y],k)=>{const before=points[(k+points.length-1)%points.length],after=points[(k+1)%points.length];const dx=(after[0]-before[0])*tension,dy=(after[1]-before[1])*tension;return {point:{x,y},inTangent:{x:-dx,y:-dy},outTangent:{x:dx,y:dy}}})}]}),style:richStyle(id,points,fill)})
  const rotation = (id:string,fn:(t:number)=>number,_period:number):Animatable<Vec3> => ({kind:'keyframed',keyframes:Array.from({length:61},(_,k)=>{
    const tick=k*16;return {id:id+'-'+k,tick,value:{x:0,y:0,z:Number(fn(tick===CHARACTER_DURATION?0:tick).toFixed(6))||0},interpolation:tick===CHARACTER_DURATION?'hold' as const:'linear' as const}
  })})
  const group = (id:string,x:number,y:number,children:string[],track?:Animatable<Vec3>) => put({...base(id,x,y),type:'group',children,transform:{...transform(x,y),...(track?{rotation:track}:{})}})

  for(let row=0;row<CHARACTER_ROWS;row++)for(let index=0;index<CHARACTER_COUNT;index++) {
    const s=characterStyles[index],prefix=s.id+'-'+row,reverse=row===3,work=row===1||reverse,walk=row===0
    const phase=index*.63,period=240
    const angle=(amount:number,offset=0)=>(tick:number)=>Math.sin(tick/period*Math.PI*2+phase+offset)*amount
    const casual=[1,2,3,8,10,13,14,17,18,22,23].includes(index), feminine=s.long, blazer=[0,4,6,11,12,15,20].includes(index)
    const shade=(hex:string,delta:number)=>'#'+[1,3,5].map(k=>Math.max(0,Math.min(255,parseInt(hex.slice(k,k+2),16)+delta)).toString(16).padStart(2,'0')).join('')
    const limb=(id:string,x:number,y:number,length:number,lowerLength:number,upperColor:string,lowerColor:string,upper:Animatable<Vec3>,lower:Animatable<Vec3>,leg=false,wristTrack?:Animatable<Vec3>) => {
      const width=leg?(casual?12:10.4):(casual?8:7.4),lw=leg?(casual?10.8:9):4.4
      const shoe=casual?'#eeeae1':feminine?'#514137':'#353736'
      const tip=leg?group(id+'-foot',0,lowerLength,[
        curved(id+'-shoe',[[-4,-1],[3,-2],[8,1],[10,4],[8,6],[-5,6]],shoe,.12),
        curved(id+'-shoe-quarter',[[-4,-1],[0,-2],[3,0],[1,3],[-4,4]],shade(shoe,-23),.12),
        curved(id+'-toe-cap',[[5,1],[8,2],[10,4],[8,4.8],[4,4]],shade(shoe,9),.14),
        curved(id+'-sole',[[-5,4],[1,4.7],[8.8,4.4],[10,5.1],[8,6],[-5,6]],casual?'#c8c7be':'#292a29',.08),
        lines(id+'-shoe-stitch',[[[-3,3],[-1,3],[1,1]],[[5,4],[8,4]],[[0,5.8],[3,5.8],[6,5.8]]],shade(shoe,-35),.45),
        ...(casual?[lines(id+'-laces',[[[1,-.3],[4,.4]],[[2,1],[5,1.7]],[[3,2.2],[6,2.8]]],'#909b9f',.7)]:[rect(id+'-heel',-2.8,6.3,4,1.6,'#29313b',.4)]),
      ]):group(id+'-fingers',0,lowerLength+1,[
        ...(index===0&&!work&&id.endsWith('neararm')?[
          curved(id+'-tablet',[[1,-7],[7,-7],[8,12],[2,12]],'#a8a79f',.04),
          curved(id+'-tablet-edge',[[6,-6],[7,-6],[8,11],[7,11]],'#70746d',.02),
          lines(id+'-tablet-bevel',[[[1.7,-5.5],[2.6,10.5],[6.6,10.5]]],'#dedbd0',.22),
          ellipse(id+'-tablet-camera',5.4,-5.5,.65,.65,'#555a58'),
        ]:[]),
        curved(id+'-palm',[[-2.5,-1.4],[1.8,-1.4],[2.7,.4],[2.2,3.6],[.9,4.4],[-1.9,3.7],[-2.7,1.3]],s.skin,.13),
        curved(id+'-palm-shine',[[-1.9,-.7],[-.2,-1],[1.6,.1],[1,2.9],[-1.1,2.6]],shade(s.skin,10),.13),
        curved(id+'-thumb',[[1.7,-.1],[3.3,.8],[4.1,2.5],[3.6,3.5],[2.6,2.8],[1.9,1.9]],shade(s.skin,-6),.14),
        ...[0,1,2,3].map(k=>{
          const x=-1.65+k*1.02,length=[2.25,2.9,2.7,2.1][k]
          const finger=curved(id+'-finger-'+k,[[x-.38,2.7],[x+.38,2.7],[x+.4,4],[x+.3,3+length],[x,3.3+length],[x-.3,3+length],[x-.4,4]],s.skin,.1)
          if(work){
            const taps=[0,120,136,152,320,336,352,600,616,632,960]
            nodes[finger]={...nodes[finger],transform:{...nodes[finger].transform,position:{kind:'keyframed',keyframes:taps.map((tick,n)=>({id:finger+'-tap-'+n,tick,value:{x:0,y:([2,5,8].includes(n)?-.38+(k*.05):0),z:0},interpolation:tick===960?'hold' as const:'linear' as const}))}}}
          }
          return finger
        }),
        lines(id+'-hand-anatomy',[[[-1.7,.4],[-.2,1.1],[.2,2.6]],[[1.5,.2],[.7,1]],[[2.8,1.5],[3.3,2.1]],...[-1.85,-.69,.47,1.63].map(x=>[[x-.2,3.4],[x+.23,3.5]])],shade(s.skin,-22),.18),
        lines(id+'-nails',[[[-2.05,5.1],[-1.65,5.2]],[[-.89,6],[-.49,6.1]],[[.27,5.75],[.67,5.85]],[[1.43,4.9],[1.83,5]]],shade(s.skin,15),.5),
        rect(id+'-wrist-crease',0,-.55,3,.18,shade(s.skin,-23),.2),
      ],wristTrack)
      if(leg)nodes[tip]={...nodes[tip],transform:{...nodes[tip].transform,scale:constant({x:.8,y:1,z:1})}}
      const low=group(id+'-lower',0,length,[
        curved(id+'-fore',[[-lw/2,-1],[lw/2,-1],[lw/2+1,lowerLength*.65],[lw/2-.8,lowerLength],[-lw/2,lowerLength],[-lw/2-1,lowerLength*.7]],lowerColor,.12),
        ...(leg?[
          polygon(id+'-inseam',[[lw/2-1,2],[lw/2,lowerLength-2],[lw/2-1.5,lowerLength-2],[lw/2-2,3]],shade(lowerColor,-24)),
          rect(id+'-cuff',0,lowerLength-1,lw+1,2.5,shade(lowerColor,13),.7),
          ...(casual?[
            polygon(id+'-denim-fold',[[-lw/2,lowerLength-8],[lw/2-2,lowerLength-5],[-lw/2,lowerLength-6]],shade(lowerColor,-18)),
            lines(id+'-denim-topstitch',[[[-lw/2+1.1,2],[-lw/2+.6,lowerLength-4]],[[lw/2-1.7,1],[lw/2-1,lowerLength-5]],[[ -lw/2+.8,lowerLength-.4],[lw/2-.8,lowerLength-.4]],[[1,lowerLength-10],[3,lowerLength-8],[0,lowerLength-7]]],shade(lowerColor,26),.45),
          ]:[lines(id+'-trouser-crease',[[[.3,2],[.5,lowerLength-4]]],shade(lowerColor,21),.6)]),
        ]:[
          curved(id+'-forearm-plane',[[-lw/2+.7,3],[-.5,2],[-.8,lowerLength-2],[-lw/2+.7,lowerLength-1]],shade(s.skin,-12),.12),
          curved(id+'-rolled-cuff',[[-4.8,-1],[4.6,-1],[4.9,3.6],[3.7,5],[-4.2,4.6],[-5.2,2]],shade(s.shirt,5),.08),lines(id+'-cuff-finish',[[[-4.8,.2],[0,1],[4.5,.7]],[[-4,3.7],[.5,4.1],[4,3.5]]],shade(s.shirt,-30),.25),ellipse(id+'-elbow-shade',0,3,3,2,shade(s.skin,-15)),
          ...(!casual?[rect(id+'-cuff-button',lw/2-1,1.1,.9,.9,'#c5bca6',.4)]:[]),
          ...(id.endsWith('neararm')&&index%3===0?[
            rect(id+'-watch-strap',0,lowerLength-1,lw+.5,2.7,'#414f5d',.7),
            rect(id+'-watch-face',.4,lowerLength-1,3.1,3.4,'#c1c7c8',1),
            rect(id+'-watch-glass',.4,lowerLength-1,2.1,2.5,'#334d63',.6),
          ]:[]),
        ]),tip,
      ],lower)
      return group(id,x,y,[
        curved(id+'-upper',[[-width/2,0],[width/2,0],[width/2+1,length*.7],[width/2-.7,length+1],[-width/2+1,length+1],[-width/2-1,length*.55]],upperColor,.13),
        ...(leg?[
          polygon(id+'-pocket',[[0,3],[width/2-1,3],[width/2-1,8],[1,9]],shade(upperColor,-13)),
          curved(id+'-thigh-plane',[[-width/2+.7,2],[-width/2+2.5,3],[-width/2+2,length*.8],[-width/2+.6,length-2]],shade(upperColor,14),.08),
          lines(id+'-pocket-stitch',[[[1,3.6],[width/2-1.6,3.6],[width/2-1.6,7.4],[1.4,8.2]],[[width/2-1,length-5],[1,length-3],[width/2-1,length-2]]],shade(upperColor,casual?24:-16),.5),
        ]:[
          curved(id+'-sleeve-seam',[[-width/2,length-3],[width/2,length-3],[width/2,length-1],[-width/2,length-1]],shade(upperColor,-16),.05),
          curved(id+'-sleeve-shine',[[-width/2+1,2],[-1,1],[-1.8,length-4],[-width/2+1,length-4]],shade(upperColor,12),.08),
          lines(id+'-sleeve-crease',[[[width/2-1,6],[width/2-2.5,8],[width/2-.8,9]],[[width/2-1,length-5],[1,length-4]]],shade(upperColor,-27),.45),
        ]),low,
      ],upper)
    }
    const c=(angle:number)=>constant({x:0,y:0,z:angle})
    const hipY=work?80:64
    const farLeg=limb(prefix+'-farleg',-5.5,0,work?21:26,work?28:26,s.pants,s.pants,
      work?c(reverse?-107:-69):walk?rotation(prefix+'-legb',t=>solveTwoBone({x:0,y:0},walkingFootTarget(t,phase+Math.PI),26,26,-1).upperDegrees,period):c(2),work?c(reverse?107:69):walk?rotation(prefix+'-kneeb',t=>solveTwoBone({x:0,y:0},walkingFootTarget(t,phase+Math.PI),26,26,-1).lowerDegrees,period):c(-2),true)
    const nearLeg=limb(prefix+'-nearleg',5,0,work?21:26,work?28:26,s.pants,s.pants,
      work?c(reverse?-111:-73):walk?rotation(prefix+'-lega',t=>solveTwoBone({x:0,y:0},walkingFootTarget(t,phase),26,26,-1).upperDegrees,period):c(-3),work?c(reverse?111:73):walk?rotation(prefix+'-kneea',t=>solveTwoBone({x:0,y:0},walkingFootTarget(t,phase),26,26,-1).lowerDegrees,period):c(3),true)
    const arms = (near:boolean) => {
      const shoulder={x:near?9:-5,y:-23}
      const solved=(t:number)=>{
        const target=index===9?{x:near?33:17,y:near?-10:-14}:typingHandTarget(near,t,phase)
        return solveTwoBone(shoulder,{x:target.x,y:target.y-(reverse?28:0)},17,18)
      }
      const pocket=solveTwoBone(shoulder,{x:-7,y:1},17,18)
      return limb(prefix+(near?'-neararm':'-fararm'),shoulder.x,shoulder.y,17,18,s.shirt,s.skin,
        work?rotation(prefix+(near?'-typea':'-typeb'),t=>solved(t).upperDegrees,240):walk?rotation(prefix+(near?'-swinga':'-swingb'),angle(index===0&&near?3:12,near?Math.PI:0),period):c(index===0&&!near?pocket.upperDegrees:near?-7:8),
        work?rotation(prefix+(near?'-wrista':'-wristb'),t=>solved(t).lowerDegrees,240):walk?rotation(prefix+(near?'-elbow-a':'-elbow-b'),t=>(index===0&&near?-5:-14)+Math.sin(t/240*Math.PI*2+phase)*2,240):c(index===0&&!near?pocket.lowerDegrees:-8),false,work?rotation(prefix+(near?'-palm-a':'-palm-b'),t=>-90-solved(t).upperDegrees-solved(t).lowerDegrees,240):undefined)
    }
    const farArm=arms(false)
    const torso=curved(prefix+'-torso',feminine?
      [[-5,-29],[5,-29],[12,-25],[12,-17],[9,-8],[11,0],[-11,0],[-10,-10],[-13,-21],[-10,-26]]:
      [[-5,-29],[5,-29],[13,-25],[14,-17],[11,0],[-12,0],[-13,-18],[-11,-26]],s.shirt,.12)
    const seam=curved(prefix+'-seam',[[9,-24],[12,-21],[10,-3],[7,-1],[8,-12]],shade(s.shirt,-18),.1)
    const collar=polygon(prefix+'-collar',[[-5,-29],[3,-29],[5,-25],[1,-21],[-5,-25]],casual?shade(s.shirt,-12):'#fffaf0')
    const tailoring:string[]=[]
    if(blazer)tailoring.push(
      curved(prefix+'-shirt-inset',[[-3,-29],[3,-29],[5,-23],[2,-9],[-2,-9],[-5,-23]],'#fbf7ed',.08),
      polygon(prefix+'-lapel-left',[[-5,-29],[-9,-25],[-5,-17],[0,-12],[-2,-24]],shade(s.shirt,-25)),
      polygon(prefix+'-lapel-right',[[4,-29],[8,-25],[5,-18],[0,-12],[2,-24]],shade(s.shirt,12)),
      rect(prefix+'-jacket-pocket',-6,-7,5,1.2,shade(s.shirt,-35),.3),
      rect(prefix+'-jacket-pocket2',7,-7,4,1.2,shade(s.shirt,-35),.3),
      lines(prefix+'-tailor-stitch',[[[-8,-24],[-5,-18],[-1,-13]],[[7,-24],[4,-18],[1,-13]],[[ -10,-5],[-4,-5]],[[6,-5],[10,-5]],[[.7,-10],[.4,-3]]],shade(s.shirt,-33),.45),
      ...(feminine?[polygon(prefix+'-silk-scarf',[[-4,-28],[0,-25],[3,-28],[5,-24],[1,-21],[-3,-23]],index%2?'#8d6675':'#687e9c')]:index%2?[polygon(prefix+'-tie',[[0,-25],[2,-24],[3,-15],[1,-12],[-.5,-15]],'#596d86')]:[]),
    )
    if(casual)tailoring.push(
      curved(prefix+'-hem',[[-11,-3],[-2,-2],[10,-3],[11,0],[-11,0]],shade(s.shirt,-15),.08),
      polygon(prefix+'-fabric-fold',[[-9,-14],[-5,-10],[-8,-5]],shade(s.shirt,-16)),
      polygon(prefix+'-fabric-fold2',[[5,-18],[8,-12],[5,-14]],shade(s.shirt,-14)),
      curved(prefix+'-tee-neck-binding',[[-5,-29],[-1,-26],[3,-27],[5,-29],[4,-26],[0,-24],[-5,-27]],shade(s.shirt,-24),.12),
      lines(prefix+'-cotton-stitch',[[[-9,-2],[-2,-1.5],[8,-2]],[[ -8,-23],[-4,-21]],[[5,-23],[9,-21]]],shade(s.shirt,-30),.38),
    )
    if(casual)tailoring.push(
      curved(prefix+'-denim-waist',[[-11,-1],[-5,1],[7,1],[11,-1],[10,3],[-10,3]],shade(s.pants,-12),.05),
      polygon(prefix+'-pocket-stitch',[[-9,2],[-4,3],[-5,9],[-8,10]],shade(s.pants,23)),
      rect(prefix+'-fly',1,4,.65,6,shade(s.pants,-30),.3),
      curved(prefix+'-chest-fold',[[-5,-20],[2,-19],[7,-21],[4,-18],[-3,-18]],shade(s.shirt,-10),.07),
      ...([2,10,14,18].includes(index)?[
        curved(prefix+'-denim-overshirt-left',[[-6,-28],[-11,-24],[-12,-8],[-9,-3],[-5,-3],[-5,-21]],shade(s.pants,-9),.1),
        curved(prefix+'-denim-overshirt-right',[[5,-28],[11,-24],[11,-6],[8,-3],[5,-3],[4,-21]],shade(s.pants,7),.1),
        polygon(prefix+'-denim-lapel',[[-6,-28],[-3,-26],[-5,-20],[-8,-24]],shade(s.pants,21)),
        lines(prefix+'-denim-jacket-stitch',[[[-10,-22],[-10,-7],[-6,-7]],[[-9,-20],[-6,-20],[-6,-16],[-9,-16],[-9,-20]],[[6,-21],[9,-20],[9,-16],[6,-16]],[[5.5,-14],[5.5,-5]]],shade(s.pants,36),.5),
        ...[0,1,2].map(k=>ellipse(prefix+'-denim-rivet-'+k,5.7,-20+k*6,.85,.85,'#bba273')),
      ]:[]),
    )
    if(!casual&&!blazer)tailoring.push(
      lines(prefix+'-shirt-placket',[[[1,-24],[1,-3]],[[3,-24],[3,-3]],[[-8,-22],[-4,-20],[-1,-24]],[[ -8,-15],[-3,-15],[-3,-10],[-8,-10],[-8,-15]]],shade(s.shirt,-24),.45),
      polygon(prefix+'-shirt-collar-right',[[2,-28],[6,-26],[6,-22],[2,-24]],'#fffaf0'),
    )
    // Clothes have construction, rather than a flat colour block: shoulder
    // seams, rolled hems, textile ribs, pockets and individual small accessories.
    tailoring.push(lines(prefix+'-shoulder-seams',[[[-10,-24],[-6,-26]],[ [6,-26],[10,-24]],[[-9,-9],[-6,-7],[-8,-5]],[[7,-11],[9,-8],[7,-6]]],shade(s.shirt,-23),.4))
    if(index===21)tailoring.push(
      curved(prefix+'-waistcoat-left',[[-5,-28],[-10,-23],[-9,-2],[-2,1],[0,-18]],shade(s.shirt,-15),.09),
      curved(prefix+'-waistcoat-right',[[4,-28],[10,-23],[9,-1],[3,1],[0,-18]],shade(s.shirt,9),.09),
      lines(prefix+'-waistcoat-welts',[[[-8,-9],[-3,-8]],[[4,-8],[8,-9]],[[0,-17],[0,-3]]],'#414b5d',.6),
    )
    if(index===22)tailoring.push(
      curved(prefix+'-hood',[[-6,-29],[-10,-27],[-7,-21],[0,-23],[6,-22],[8,-27],[3,-30]],shade(s.shirt,-21),.17),
      curved(prefix+'-kangaroo-pocket',[[-7,-12],[-4,-15],[5,-15],[8,-11],[6,-5],[-6,-5]],shade(s.shirt,-8),.12),
      lines(prefix+'-hoodie-finishes',[[[-4,-24],[-3,-16]],[[3,-24],[4,-17]],[[-7,-3],[-7,-1]],[[-4,-3],[-4,-1]],[[0,-3],[0,-1]],[[4,-3],[4,-1]],[[8,-3],[8,-1]]],shade(s.shirt,-36),.55),
    )
    if(index===23)tailoring.push(
      curved(prefix+'-knit-neck',[[-5,-29],[-2,-26],[2,-26],[5,-29],[4,-25],[0,-23],[-4,-25]],shade(s.shirt,-27),.13),
      lines(prefix+'-cable-knit',Array.from({length:5},(_,k)=>{const x=-7+k*3.3;return [[x,-21],[x+1,-19],[x-1,-17],[x+1,-15],[x-1,-13],[x+1,-11],[x-1,-9],[x,-6]]}),shade(s.shirt,-25),.55),
      lines(prefix+'-ribbed-hem',Array.from({length:10},(_,k)=>[[-9+k*2,-3],[-9+k*2,-.5]]),shade(s.shirt,-30),.5),
    )
    if(index===24)tailoring.push(
      polygon(prefix+'-camp-collar-left',[[-5,-29],[0,-25],[-2,-19],[-7,-24]],shade(s.shirt,15)),
      polygon(prefix+'-camp-collar-right',[[4,-29],[0,-25],[3,-20],[8,-24]],shade(s.shirt,-14)),
      lines(prefix+'-linen-weave',[[[-8,-17],[-3,-17]],[[-8,-13],[-4,-13]],[[5,-16],[9,-16]],[[-7,-6],[-2,-6]],[[4,-8],[8,-8]]],shade(s.shirt,-17),.35),
    )
    if([3,13,17,22].includes(index))tailoring.push(
      curved(prefix+'-cargo-pocket',[[5,3],[11,3],[11,11],[6,12]],shade(s.pants,-10),.05),
      lines(prefix+'-cargo-flap',[[[5,4],[11,4],[10,6],[6,6],[5,4]],[[6,7],[6,10],[10,10]]],shade(s.pants,27),.5),
      ellipse(prefix+'-cargo-snap',8,5,.9,.9,'#b7b3a5'),
    )
    if([1,4,12,16,21].includes(index))tailoring.push(
      curved(prefix+'-silk-pocket',[[-8,-20],[-4,-20],[-4,-16],[-8,-16]],shade(s.shirt,-14),.06),
      polygon(prefix+'-pocket-square',[[-7.7,-20],[-7,-22],[-5.8,-20.5],[-4.4,-22],[-4.2,-20]],'#f9f2e6'),
    )
    if([2,10,18,23].includes(index)&&!reverse)tailoring.push(
      curved(prefix+'-tote',[[-16,-8],[-7,-7],[-6,7],[-17,8]],shade(s.pants,-20),.1),
      lines(prefix+'-tote-handle',[[[-15,-7],[-16,-20],[-13,-23],[-10,-20],[-9,-7]],[[-15,-5],[-14,5],[-8,5]]],shade(s.pants,25),.8),
    )
    tailoring.push(
      curved(prefix+'-fabric-light-left',[[-9,-23],[-6,-25],[-6,-17],[-8,-10],[-7,-6],[-10,-3],[-11,-10]],shade(s.shirt,9),.1),
      curved(prefix+'-waist-fold-a',[[-10,-9],[-4,-6],[0,-2],[-4,-3],[-9,-4]],shade(s.shirt,-22),.08),
      curved(prefix+'-waist-fold-b',[[9,-15],[6,-10],[8,-4],[4,-1],[9,-3],[10,-9]],shade(s.shirt,-17),.1),
      curved(prefix+'-chest-drape',[[-5,-20],[-2,-14],[1,-11],[-3,-13],[-6,-18]],shade(s.shirt,-12),.1),
      lines(prefix+'-fine-fabric-finish',[[[-9,-21],[-8,-17],[-9,-15]],[[8,-22],[7,-19]],[[-8,-3],[-3,-1.5],[1,-1]],[[6,-4],[8,-5],[8,-7]]],shade(s.shirt,-30),.2),
    )
    if(index===0)tailoring.push(
      curved(prefix+'-open-jacket-left',[[-5,-29],[-11,-24],[-12,-13],[-10,0],[-3,0],[-3,-19]],'#e9ddc7',.09),
      curved(prefix+'-open-jacket-right',[[4,-29],[11,-24],[12,-13],[10,0],[4,0],[3,-20]],'#f1e6d1',.09),
      curved(prefix+'-satin-lapel-left',[[-5,-29],[-8,-26],[-6,-22],[-8,-20],[-2,-12],[-3,-23]],'#fff3df',.06),
      curved(prefix+'-satin-lapel-right',[[4,-29],[8,-26],[6,-22],[8,-20],[2,-12],[3,-23]],'#fff5e5',.06),
      lines(prefix+'-jacket-finishing',[[[-7,-26],[-5,-22],[-7,-20],[-2,-13]],[[7,-26],[5,-22],[7,-20],[2,-13]],[[-10,-6],[-5,-6]],[[6,-6],[10,-6]]],'#c5b7a1',.22),
      curved(prefix+'-left-lapel-shadow',[[-5,-23],[-3,-20],[-2,-12],[-4,-16]],'#d3c5b0',.04),
      lines(prefix+'-lanyard',[[[-2,-28],[1,-17],[3,-11]],[[3,-28],[5,-16],[3,-11]]],'#303331',.95),
      rect(prefix+'-badge-clip',3,-11,1.8,2.1,'#b5afa1',.3),
      rect(prefix+'-badge-frame',3,-6.7,6.4,7.6,'#4b4b42',.5),
      rect(prefix+'-badge-card',3,-6.7,5.7,6.9,'#ede9db',.3),
      ellipse(prefix+'-badge-photo',1.8,-7.8,1.8,2.2,'#c3c4ba'),
      lines(prefix+'-badge-print',[[[3.4,-8.6],[4.7,-8.6]],[[3.4,-7.8],[4.5,-7.8]],[[1.1,-5.4],[4.7,-5.4]],[[1.1,-4.6],[3.7,-4.6]]],'#979a8f',.19),
    )
    if(index===0&&!work&&!walk)tailoring.push(curved(prefix+'-pocket-occluder',[[-11,0],[-3,1],[-4,8],[-10,11]],s.pants,.06),lines(prefix+'-relaxed-pocket-edge',[[[-10,.7],[-6,2],[-4.4,4.2]]],shade(s.pants,22),.25))
    const buttons=casual?[]:[0,1,2].map(k=>ellipse(prefix+'-button'+k,1,-17+k*5,1.15,1.15,'#58616b',false))
    const belt=rect(prefix+'-belt',0,0,21,2,'#5d5a56',.5)
    const buckle=rect(prefix+'-buckle',2,0,3,2.4,'#c3b087',.5)
    const neck=curved(prefix+'-neck',[[-3,-35],[4,-35],[4,-29],[7,-27],[0,-24],[-5,-28],[-3,-30]],s.skin,.12)
    const neckShade=curved(prefix+'-neck-plane',[[-3,-34],[3,-34],[1,-30],[-2,-28],[-4,-29]],shade(s.skin,-20),.1)
    const headChildren:string[]=[]
    if(feminine)headChildren.push(curved(prefix+'-hairback',[3,14].includes(index)?
      [[-9,-9],[0,-14],[7,-9],[8,5],[3,16],[-9,17],[-13,9]]:
      [[-9,-9],[1,-13],[7,-8],[5,5],[-1,11],[-10,9],[-12,1]],s.hair,.2))
    headChildren.push(curved(prefix+'-face',[[-5.2,-9],[1.5,-10],[5.8,-7],[6,-2],[7,1],[6.7,4.5],[5.8,7],[1.8,9.2+(index%3)*.3],[-3.8,7],[-6.2,1.5]],s.skin,.19))
    headChildren.push(curved(prefix+'-temple-plane',[[-5,-8],[-2,-9],[-3,-3],[-4,2],[-2,7],[-5,5],[-7,0]],shade(s.skin,-17),.15))
    headChildren.push(curved(prefix+'-cheek',[[5.5,.2],[6.8,1.5],[6.2,6],[1.8,9.1],[.3,7.7],[4.7,5]],shade(s.skin,-13),.13))
    headChildren.push(curved(prefix+'-cheek-shine',[[-.4,.7],[3.3,-.1],[5.3,1],[4.1,3.7],[.5,3.6]],shade(s.skin,9),.15))
    headChildren.push(ellipse(prefix+'-ear',-5.8,1,3.8,5,s.skin))
    headChildren.push(ellipse(prefix+'-inner-ear',-5.6,1,1.3,2.7,shade(s.skin,-28),false))
    headChildren.push(curved(prefix+'-nose',[[5.8,-2.4],[6.7,-.7],[7.1,.6],[8.1,1.8],[7.2,2.5],[6.1,2.1]],s.skin,.1))
    const hairShape=index%4===0?
      [[-7,0],[-10,-5],[-8,-11],[-2,-14],[5,-13],[9,-9],[8,-5],[3,-7],[-1,-7],[-4,-4],[-5,2]]:index%4===1?
      [[-7,1],[-10,-5],[-11,-9],[-7,-13],[-3,-14],[0,-12],[4,-14],[8,-11],[9,-7],[6,-3],[2,-7],[-3,-6],[-5,2]]:index%4===2?
      [[-7,1],[-9,-7],[-6,-12],[1,-14],[7,-11],[9,-6],[7,-3],[3,-5],[1,-8],[-3,-5],[-4,2]]:
      [[-7,0],[-10,-7],[-7,-12],[0,-14],[6,-12],[9,-7],[7,-4],[1,-7],[-4,-4],[-5,2]]
    headChildren.push(curved(prefix+'-hair',hairShape,s.hair,.14))
    headChildren.push(curved(prefix+'-hair-shine',[[-7,-8],[-2,-12],[4,-11],[0,-10],[-5,-6]],shade(s.hair,22),.16))
    if(index===0||index===4||index===12||index===20)headChildren.push(ellipse(prefix+'-bun',-9,-7,8,9,s.hair),rect(prefix+'-hair-tie',-8,-3,5,1.4,'#bdb7a6',.5))
    if(index===1||index===10||index===18)headChildren.push(curved(prefix+'-ponytail',[[-9,-5],[-14,-2],[-13,9],[-9,16],[-8,8],[-6,2]],s.hair,.17))
    if(index===2||index===16)headChildren.push(curved(prefix+'-bob',[[-9,-5],[-8,9],[-2,11],[-3,3],[-4,-1]],s.hair,.13))
    const eye=group(prefix+'-eye',1.8,-1.25,[
      curved(prefix+'-eyewhite',[[-1.8,0],[-.7,-.85],[.7,-.8],[1.9,-.15],[.8,.65],[-.8,.65]],'#faf4e8',.12),
      ellipse(prefix+'-iris',.65,-.02,1.5,1.6,index%3===0?'#708d91':index%3===1?'#6c715b':'#596c80'),
      ellipse(prefix+'-pupil',.88,0,.72,1.13,'#26313f'),
      ellipse(prefix+'-eye-catchlight',.53,-.35,.45,.45,'#fffaf0'),
      lines(prefix+'-eyelid',[[[-1.8,0],[-.8,-.78],[.7,-.8],[1.9,-.15]],[[1.65,-.3],[2.2,-.5]]],shade(s.hair,7),.23),
    ])
    // Brief asymmetric blink, once per four-second loop; the whole rig still loops exactly.
    const blink=300+(index*24)%480
    nodes[eye]={...nodes[eye],transform:{...nodes[eye].transform,scale:{kind:'keyframed',keyframes:[
      {id:prefix+'-blink-rest',tick:0,value:{x:1,y:1,z:1},interpolation:'hold'},
      {id:prefix+'-blink-close',tick:blink,value:{x:1,y:1,z:1},interpolation:'linear'},
      {id:prefix+'-blink-shut',tick:blink+12,value:{x:1,y:.12,z:1},interpolation:'linear'},
      {id:prefix+'-blink-open',tick:blink+28,value:{x:1,y:1,z:1},interpolation:'hold'},
      {id:prefix+'-blink-loop',tick:CHARACTER_DURATION,value:{x:1,y:1,z:1},interpolation:'hold'},
    ]}}}
    headChildren.push(
      curved(prefix+'-far-eye',[[4.5,-1.9],[5.1,-2.5],[5.8,-2.4],[6.2,-1.8],[5.3,-1.45]],'#f6efe5',.1),
      ellipse(prefix+'-far-iris',5.5,-1.95,.6,1.05,'#4e626b'),
      lines(prefix+'-far-brow',[[[4.5,-3.6],[5.3,-3.9],[6.1,-3.6]]],s.hair,.55),
      lines(prefix+'-eyelid-fold',[[[.3,-2.9],[1.6,-3.3],[3.2,-2.9]]],shade(s.skin,-24),.3),
    )
    if(!feminine&&[6,7,11,15,24].includes(index))headChildren.push(
      curved(prefix+'-beard-plane',[[.3,5],[3,6],[7,4.7],[7.3,7],[3,9],[-.5,7.4]],shade(s.skin,-27),.1),
      lines(prefix+'-stubble',[[[1,6],[1.3,6.7]],[[2.5,7],[2.7,7.7]],[[4.1,6.8],[4.3,7.5]],[[5.6,6],[5.7,6.7]]],shade(s.hair,32),.3),
    )
    headChildren.push(eye,curved(prefix+'-brow',[[.2,-3.8],[1.5,-4.4],[3.1,-4.2],[3.8,-3.9],[1.7,-4],[.3,-3.5]],s.hair,.1))
    headChildren.push(ellipse(prefix+'-nostril',6.8,2.5,.5,.3,shade(s.skin,-45)),
      lines(prefix+'-face-construction',[[[5.5,-1],[5.9,.3],[6.5,1]],[[6.8,3],[6,3.2]],[[ -5.7,-.3],[-4.6,.3],[-5.4,1.9]],[[ -1.8,7.2],[1.8,8.8],[3.6,8.2]]],shade(s.skin,-26),.18),
      curved(prefix+'-jaw-shine',[[1,7],[4,7],[6,5],[5,8],[2,9]],shade(s.skin,9),.13),
      curved(prefix+'-hair-strand',[[-8,-7],[-4,-11],[2,-12],[-2,-10],[-6,-6]],shade(s.hair,32),.08),
      curved(prefix+'-hair-strand2',[[-7,-4],[-3,-8],[2,-9],[-1,-7],[-5,-2]],shade(s.hair,15),.08))
    headChildren.push(lines(prefix+'-hair-fibres',[
      [[-8,-6],[-6,-9],[-2,-12],[2,-12.7]],
      [[-6.5,-4],[-4,-7],[-.5,-10.6],[3,-11.6]],
      [[-.2,-12.8],[3,-11],[5.5,-8.2]],
      ...(feminine?[[[-9,1],[-9.5,5],[-8,8]],[[-7.3,4],[-6,7],[-4,8]]]:[]),
    ],shade(s.hair,39),.35))
    headChildren.push(curved(prefix+'-mouth',[[4.8,5.1],[6.6,4.7],[7.1,5.2],[6.2,5.6],[4.9,5.6]],feminine?'#a56965':'#8f6554',.1))
    headChildren.push(lines(prefix+'-lip-detail',[[[4.9,5.2],[6,5.15],[7,5.2]],[[5.3,6],[6.4,6]]],feminine?'#ae7c74':'#a78371',.18))
    if(feminine)headChildren.push(ellipse(prefix+'-earring',-5.5,4,2.2,3.2,'#c4a66d'))
    if([2,6,11,21,23].includes(index))headChildren.push(rect(prefix+'-glasses',5,-1.2,5.2,4.2,'#c1ccd0',1.2),rect(prefix+'-glasses-arm',.5,-2,5,.65,'#3e4652',.2))
    if(feminine)headChildren.push(
      curved(prefix+'-swept-hair',[[-9,1],[-10,-5],[-7,-11],[-1,-14],[5,-12],[7,-9],[3,-7],[-1,-3],[-5,0]],shade(s.hair,4),.12),
      curved(prefix+'-part-highlight',[[-8,-7],[-3,-12],[2,-12.5],[4,-11],[-1,-10],[-5,-6]],shade(s.hair,23),.1),
      curved(prefix+'-swept-mid-tone',[[-7,-2],[-4,-6],[2,-10],[5,-10],[1,-6],[-2,-3]],shade(s.hair,13),.1),
      curved(prefix+'-temple-lock',[[-4,-3],[-3.7,0],[-4.6,3.6],[-3.1,6.3],[-5.4,4.8],[-5.6,1]],s.hair,.13),
      curved(prefix+'-loose-side-lock',[[5,-10],[7,-7],[6.4,-3],[7.1,.2],[6.2,-1],[5.5,-4],[5.9,-7]],s.hair,.12),
      lines(prefix+'-fine-hair-flow',[[[-9,-5],[-6,-9],[-2,-11.5],[2,-12]],[[ -8,-3],[-5,-7],[-1,-10],[4,-11]],[[ -6,-1],[-3,-4],[1,-8]],[[ -3.4,1],[-4,3],[-3.4,4.5]],[[5.6,-9],[6.1,-6.5],[5.9,-4.2]]],shade(s.hair,34),.17),
      lines(prefix+'-flyaway-hair',[[[-10,-7],[-11,-10],[-8,-12]],[[1,-14],[4,-14.7],[6,-13.6]],[[7,-8],[8.2,-5],[7.5,-2]]],shade(s.hair,14),.23),
      ellipse(prefix+'-gold-earring-shadow',-5.2,4.3,1.5,2.5,'#987440'),
      ellipse(prefix+'-gold-earring-light',-5.45,4.05,.65,1.8,'#dec58a'),
    )
    if(reverse) {
      // Far-side seats face into the desk, away from the viewer. A rear skull,
      // nape and a slim cheek profile avoid mirroring a front-facing portrait.
      headChildren.length=0
      headChildren.push(
        curved(prefix+'-rear-head-skin',[[-6,-8],[3,-10],[8,-6],[9,-1],[10,1],[8,3],[7,7],[2,10],[-5,7],[-8,1]],s.skin,.16),
        curved(prefix+'-rear-hair',[[-8,2],[-10,-7],[-7,-12],[0,-14],[6,-11],[8,-7],[6,-2],[3,2],[2,8],[-5,8]],s.hair,.16),
        curved(prefix+'-rear-hair-plane',[[-8,-6],[-5,-11],[0,-12],[3,-10],[-1,-5],[-3,4],[-6,5]],shade(s.hair,16),.13),
        ellipse(prefix+'-rear-ear',5.7,2.7,3.1,4.7,s.skin),
        lines(prefix+'-rear-head-detail',[[[5.9,1.7],[5,2.3],[5.7,3.6]],[[8.1,4.9],[7.5,5.2]],[[-7,-6],[-4,-10],[-1,-11]],[[-5,0],[-3,-5],[1,-10]]],shade(s.hair,35),.38),
        ...(feminine?[
          curved(prefix+'-rear-hair-length',[[-9,-2],[-10,7],[-7,13],[-1,12],[2,8],[2,1],[-2,4],[-4,-1]],s.hair,.13),
          lines(prefix+'-rear-length-strands',[[[-7,3],[-7,8],[-4,11]],[[-3,5],[-2,9],[-3,11]]],shade(s.hair,30),.45),
          ellipse(prefix+'-rear-earring',6,5.4,1.6,2.6,'#c4a66d'),
        ]:[]),
      )
    }
    const head=group(prefix+'-head',1,-39.5,headChildren,rotation(prefix+'-gaze',t=>Math.sin(t/960*Math.PI*2+phase)*1.1,960))
    nodes[head]={...nodes[head],transform:{...nodes[head].transform,scale:constant({x:(feminine?.76:.8)+(index%4)*.014,y:.76+(index%3)*.012,z:1})}}
    const book=work&&index===9?[
      polygon(prefix+'-book-cover',[[15,-18],[25,-15],[35,-19],[35,-9],[25,-5],[15,-9]],'#566d8b'),
      polygon(prefix+'-book-left',[[16,-17],[25,-14],[25,-7],[16,-10]],'#f2eee2'),
      polygon(prefix+'-book-right',[[25,-14],[34,-18],[34,-11],[25,-7]],'#e2dfd4'),
    ]:[]
    const reverseTailoring=reverse?[
      curved(prefix+'-rear-yoke',[[-10,-25],[-5,-28],[4,-28],[10,-25],[6,-22],[-6,-22]],shade(s.shirt,-12),.09),
      lines(prefix+'-rear-garment-stitch',[[[-9,-24],[-4,-23],[4,-23],[10,-25]],[[0,-21],[0,-5]],[[-8,-4],[-2,-3],[7,-4]]],shade(s.shirt,-28),.5),
      curved(prefix+'-rear-drape',[[-8,-20],[-5,-15],[-7,-5],[-3,-1],[-9,-2]],shade(s.shirt,-16),.08),
      curved(prefix+'-rear-drape-light',[[4,-21],[7,-17],[5,-6],[8,-2],[3,-3]],shade(s.shirt,10),.08),
      ...(blazer?[polygon(prefix+'-rear-vent',[[0,-8],[2,-1],[-1,-1]],shade(s.shirt,-29))]:[]),
    ]:[]
    const jewelry=feminine&&!reverse?[
      lines(prefix+'-necklace',[[[-3,-27],[-1,-24],[2,-24],[4,-27]]],'#b9985f',.6),
      ellipse(prefix+'-pendant',.5,-23.5,1.5,1.9,'#c4a66d'),
    ]:[]
    const carryBag=index===0?[
      curved(prefix+'-leather-bag',[[-16,-14],[-9,-11],[-10,12],[-15,17],[-22,12],[-21,-6]],'#4c4036',.12),
      curved(prefix+'-bag-side',[[-21,-6],[-18,-9],[-18,11],[-15,16],[-21,12]],'#3b332d',.08),
      curved(prefix+'-bag-fold',[[-15,-8],[-12,-6],[-14,10],[-17,12]],'#5c4d3e',.08),
      lines(prefix+'-bag-stitch',[[[-19,-5],[-20,9],[-16,13]],[[-12,-8],[-13,9]],[[ -20,2],[-16,3],[-16,7],[-20,6],[-20,2]]],'#8d7659',.23),
    ]:[]
    const bagStrap=index===0?[
      curved(prefix+'-leather-strap',[[-9,-28],[-7,-27],[-12,3],[-15,8],[-16,6],[-14,1]],'#39332e',.06),
      lines(prefix+'-strap-stitch',[[[-8.5,-26],[-13,1],[-14.5,5]]],'#8d765d',.2),
      rect(prefix+'-strap-buckle',-12,0,2.9,3.3,'#a48c60',.4),
    ]:[]
    const upper=group(prefix+'-upperbody',0,0,[...carryBag,farArm,torso,seam,...(reverse?reverseTailoring:[collar,...tailoring,...buttons]),belt,buckle,neck,neckShade,...jewelry,...bagStrap,head,arms(true),...book],work?undefined:rotation(prefix+'-breath',t=>Math.sin(t/960*Math.PI*2+phase)*.3,960))
    const body=group(prefix+'-body',64,hipY,[farLeg,nearLeg,upper])
    roots.push(group(prefix+'-cell',index*CELL,row*CELL,[body]))
  }
  const doc=withComputedRevision({
    version:ANIMATION_DOCUMENT_VERSION,id:'office-employees',revision:'',name:'Office employee articulated motion',
    canvas:{width:CELL*CHARACTER_COUNT,height:CELL*CHARACTER_ROWS,pixelAspectRatio:1,backgroundColor:{r:0,g:0,b:0,a:0}},
    timing:{ticksPerSecond:240,frameRate:{numerator:60,denominator:1},durationTicks:CHARACTER_DURATION,displayStartTick:0},
    assets:{},compositions:{main:{id:'main',name:'Employee motion',width:CELL*CHARACTER_COUNT,height:CELL*CHARACTER_ROWS,durationTicks:CHARACTER_DURATION,nodes,rootNodeIds:roots}},
    rootCompositionId:'main',components:{},markers:[],capabilities:{required:[],optional:[],unsupportedPolicy:'warn'},
  } satisfies AnimationDocument)
  assertValidAnimationDocument(doc)
  cachedCharacterDocument=doc
  return doc
}

export type CharacterMode='walk'|'work'|'idle'|'work-reverse'
/** Keep only reachable live poses; the source document remains the complete gallery. */
export function selectCharacterModes(document:AnimationDocument,modes:readonly (CharacterMode|null)[],compact=false):AnimationDocument {
  const source=document.compositions.main,nodes:Record<string,SceneNode>={}
  const roots=modes.flatMap((mode,index)=>mode===null?[]:[characterStyles[index].id+'-'+(mode==='walk'?0:mode==='work'?1:mode==='work-reverse'?3:2)+'-cell'])
  const visit=(id:string)=>{const node=source.nodes[id];nodes[id]=node;if(node.type==='group')node.children.forEach(visit)}
  roots.forEach(visit)
  if(compact)for(const [column,id] of roots.entries())nodes[id]={...nodes[id],transform:{...nodes[id].transform,position:constant({x:column*CELL,y:0,z:0})}}
  const width=compact?Math.max(1,roots.length)*CELL:document.canvas.width,height=compact?CELL:document.canvas.height
  return withComputedRevision({...document,canvas:{...document.canvas,width,height},compositions:{main:{...source,width,height,nodes,rootNodeIds:roots}}})
}
