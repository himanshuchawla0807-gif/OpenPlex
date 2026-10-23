import {solveTwoBone,type Point2} from '../procedural/characterKinematics.ts'
export type RigPose='idle'|'walk'|'sit'|'type'
export interface RigState {pose:RigPose;time:number;facing:number;joints:boolean}
export interface RigBones {hip:Point2;head:Point2;shoulders:Point2[];arms:ReturnType<typeof solveTwoBone>[];hips:Point2[];legs:ReturnType<typeof solveTwoBone>[];feet:Point2[];armLengths:readonly (readonly [number,number])[]}
const ink='#513344',teal='#82b5b3',skin='#f0c69b',trousers='#bd996f',gold='#e7bc65'
const armLengths=[[60,53],[52,46]] as const
const textures=new WeakMap<CanvasRenderingContext2D,CanvasPattern>()
export function sampleBrunoRig(pose:RigPose,time:number):RigBones{
  const seated=pose==='sit'||pose==='type',walk=pose==='walk',phase=time*Math.PI*2/.96
  const bob=walk?Math.cos(phase*2)*.8:Math.sin(time*1.7)*.35
  const hip={x:seated?-18:0,y:(seated?-68:-117)+bob}
  const hips=seated?[{x:-24,y:hip.y},{x:-10,y:hip.y+1}]:[{x:-22,y:hip.y},{x:22,y:hip.y}]
  const shoulders=seated?[{x:-22,y:hip.y-94},{x:22,y:hip.y-91}]:[{x:-54,y:hip.y-97},{x:54,y:hip.y-94}]
  const feet=hips.map((h,k)=>{const c=((time/.96+k*.5)%1+1)%1;const stride=c<.6?16-c/.6*32:-16+(c-.6)/.4*32;return seated?{x:45+k*19,y:-10}:{x:h.x+(walk?stride:1),y:-10-(walk&&c>.6?Math.sin((c-.6)/.4*Math.PI)*10:0)}})
  const legs=hips.map((h,k)=>solveTwoBone(h,feet[k],56,54,-1))
  const arms=shoulders.map((s,k)=>{
    const swing=walk?Math.sin(phase+k*Math.PI)*19:Math.sin(time*1.6+k)*.7
    const target=pose==='type'?{x:k?99:76,y:-127+Math.sin(time*12+k*2)*.3}:seated?{x:k?43:27,y:hip.y+.5+Math.sin(time*1.4)*.2}:{x:s.x+swing+(k?-1:-8),y:-128-Math.abs(swing)*.12}
    return solveTwoBone(s,target,armLengths[k][0],armLengths[k][1],seated?1:k? -1:1)
  })
  return {hip,hips,shoulders,feet,legs,arms,armLengths,head:{x:seated?13:2,y:hip.y-(seated?143:143)}}
}

/** Purpose-drawn vector puppet. Every surface is attached to a shared anatomical
 * joint, with continuous silhouettes across elbows/knees. No cropped PNG limbs. */
export function drawBruno(ctx:CanvasRenderingContext2D,_atlas:HTMLImageElement|null,state:RigState){
  const b=sampleBrunoRig(state.pose,state.time),seated=state.pose==='sit'||state.pose==='type',typing=state.pose==='type'
  let texture=textures.get(ctx)
  if(!texture){const tile=document.createElement('canvas');tile.width=tile.height=12;const t=tile.getContext('2d')!;t.fillStyle=ink;for(let k=0;k<23;k++){t.beginPath();t.arc((k*7.13)%12,(k*4.71)%12,.22+(k%3)*.13,0,Math.PI*2);t.fill()}texture=ctx.createPattern(tile,'repeat')!;textures.set(ctx,texture)}
  const path=(d:string,fill:string,stroke=ink,width=1.5)=>{const p=new Path2D(d);ctx.fillStyle=fill;ctx.fill(p);ctx.save();ctx.globalAlpha=.075;ctx.fillStyle=texture!;ctx.fill(p);ctx.restore();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(p)}}
  const line=(points:Point2[],color:string,width=1)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
  const oval=(x:number,y:number,rx:number,ry:number,fill:string,stroke=ink,w=1.3)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}}
  // Tapered capsule: a closed, curved silhouette; adjacent pieces share an anchor.
  function segment(a:Point2,z:Point2,r1:number,r2:number,fill:string){const dx=z.x-a.x,dy=z.y-a.y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l;path(`M${a.x+nx*r1} ${a.y+ny*r1} Q${a.x-dx*.16} ${a.y-dy*.16} ${a.x-nx*r1} ${a.y-ny*r1} L${z.x-nx*r2} ${z.y-ny*r2} Q${z.x+dx*.14} ${z.y+dy*.14} ${z.x+nx*r2} ${z.y+ny*r2} Z`,fill)}
  function trousersLeg(k:number){const h=b.hips[k],l=b.legs[k],a=l.wrist
    // Draw a continuous bent trouser silhouette, rather than overlapping cut edges.
    line([h,l.elbow,a],ink,32);line([h,l.elbow,a],k?trousers:'#a88b6a',28)
    line([{x:h.x-3,y:h.y+9},{x:l.elbow.x-3,y:l.elbow.y},{x:a.x-3,y:a.y-8}],'#8e7058',.85)
    line([{x:l.elbow.x-6,y:l.elbow.y-5},{x:l.elbow.x+5,y:l.elbow.y-1},{x:l.elbow.x-2,y:l.elbow.y+6}],'#866950',.9)
    ctx.save();ctx.translate(a.x,a.y);path('M-10 -5 Q0 -8 9 -3 L17 1 Q29 3 30 9 Q10 15 -11 10 Z','#79544a');path('M-11 9 Q10 13 30 8 L30 13 Q7 17 -11 13 Z','#463b40',ink,.8);line([{x:3,y:0},{x:11,y:1},{x:5,y:3},{x:15,y:4}],'#b29577',.8);ctx.restore()
  }
  function hand(wrist:Point2,k:number){ctx.save();ctx.translate(wrist.x,wrist.y);const typingAngle=typing?-.06:seated?.7:1.35;ctx.rotate(typingAngle)
    const tap=typing?Math.sin(state.time*15+k*1.6)*.65:0
    path('M-3 -5 Q4 -8 10 -5 L15 -3 Q19 -2 18 1 L9 3 Q5 6 0 4 L-4 2 Z',skin)
    for(let i=0;i<4;i++){const x=8+i*2.5,y=-2+i*1.3;path(`M${x} ${y} Q${x+5} ${y-1} ${x+8} ${y+tap} Q${x+9} ${y+2+tap} ${x+5} ${y+2.2+tap} L${x-1} ${y+2.4}`,skin,ink,.65)}
    path('M2 1 Q6 6 11 6 Q14 5 12 3 L8 0',skin,ink,.8);ctx.restore()
  }
  function arm(k:number){const s=b.shoulders[k],a=b.arms[k]
    // One continuous skin surface covers the elbow, no visible socket or seam.
    line([s,a.elbow,a.wrist],ink,21);line([s,a.elbow,a.wrist],k?skin:'#dcad89',18)
    const cuff={x:s.x+(a.elbow.x-s.x)*.86,y:s.y+(a.elbow.y-s.y)*.86}
    segment(s,cuff,k?17:15,12,k?teal:'#719b9d')
    const axis={x:a.elbow.x-s.x,y:a.elbow.y-s.y},len=Math.hypot(axis.x,axis.y),nx=-axis.y/len,ny=axis.x/len
    line([{x:cuff.x+nx*12,y:cuff.y+ny*12},{x:cuff.x-nx*12,y:cuff.y-ny*12}],'#d5dfcb',5)
    line([{x:cuff.x+nx*12,y:cuff.y+ny*12},{x:cuff.x-nx*12,y:cuff.y-ny*12}],ink,.8)
    for(const t of [.32,.53,.67]){const c={x:s.x+axis.x*t,y:s.y+axis.y*t};line([{x:c.x+nx*8,y:c.y+ny*8},{x:c.x+nx*2+axis.x*.07,y:c.y+ny*2+axis.y*.07},{x:c.x-nx*5,y:c.y-ny*5}],'#496f79',.9)}
    line([{x:a.elbow.x+2,y:a.elbow.y+3},{x:a.wrist.x+2,y:a.wrist.y-7}],'#b68070',.8)
    if(k){ctx.save();ctx.translate(a.wrist.x,a.wrist.y);ctx.rotate(Math.atan2(a.wrist.y-a.elbow.y,a.wrist.x-a.elbow.x));path('M-9 -10 L-3 -10 L-3 10 L-9 10 Z','#755343');oval(-6,0,5,6,'#e4c779',ink,.9);line([{x:-6,y:0},{x:-6,y:-3} ],ink,.8);ctx.restore()}
    hand(a.wrist,k)
  }
  ctx.save();ctx.scale(state.facing,1)
  if(seated){path('M-65 -155 Q-68 -168 -55 -169 L-37 -167 Q-26 -164 -27 -151 L-28 -66 L-60 -66 Z','#496b74');path('M-57 -59 L14 -59 Q22 -58 23 -51 L-53 -50 Z','#425c68');line([{x:-19,y:-50},{x:-19,y:-13},{x:-49,y:1},{x:-19,y:-13},{x:12,y:1}],'#3e4a56',4);oval(-49,2,4,3,'#303a43');oval(12,2,4,3,'#303a43')}
  trousersLeg(0);trousersLeg(1)
  ctx.save();ctx.translate(b.hip.x,b.hip.y);ctx.scale(1.15,1)
  path(seated?'M-30 -27 Q-4 -32 26 -18 L49 10 Q30 23 8 13 L-24 11 Q-39 7 -37 -8 Z':'M-36 -23 Q0 -32 36 -23 L33 13 Q18 20 2 8 Q-16 19 -35 12 Z',trousers)
  path('M-34 -24 Q0 -31 35 -22 L34 -16 Q0 -22 -34 -18 Z','#634c43',ink,.8);path('M-4 -26 L9 -26 L9 -16 L-4 -16 Z','#d5b86a',ink,.7)
  line([{x:4,y:-13},{x:4,y:1},{x:11,y:7}],'#7c624e',.85)
  ctx.restore()
  // Far sleeve first; the waistcoat covers the inside of its attachment.
  arm(0)
  ctx.save();ctx.translate(b.hip.x,b.hip.y);ctx.scale(seated?1.05:1.2,1)
  const torso=seated?'M-35 -111 Q-6 -120 23 -106 Q48 -80 48 -46 Q45 -22 32 -18 L3 -22 L-32 -20 Q-49 -54 -42 -84 Z':'M-37 -113 Q0 -123 37 -113 Q53 -98 47 -67 L39 -21 L3 -17 L-39 -21 Q-53 -67 -48 -94 Z'
  path(torso,'#4e6864');ctx.save();ctx.clip(new Path2D(torso));for(let x=-65;x<75;x+=16){line([{x,y:-124},{x:x+9,y:-10}],'#9caf8c',1.2);line([{x:x+3,y:-124},{x:x+12,y:-10}],'#344d4f',.55)}for(let y=-115;y<-15;y+=17){line([{x:-60,y},{x:65,y:y+5}],'#9caf8c',1.1);line([{x:-60,y:y+4},{x:65,y:y+9}],'#33494b',.7)}ctx.restore()
  path('M-18 -119 L3 -111 L20 -119 L10 -88 L0 -72 L-17 -100 Z','#b1cebf',ink,1.1);path('M-18 -119 L3 -111 L-3 -96 L-23 -107 Z',teal);path('M3 -111 L20 -119 L23 -103 L9 -94 Z',teal)
  path('M1 -91 L7 -89 L11 -21 L2 -19 Z','#53625c',ink,.7);for(let y=-80;y<-23;y+=13)oval(6,y,2.1,2.1,'#c9b086',ink,.6)
  path('M-32 -76 L-10 -74 L-11 -55 Q-23 -50 -33 -57 Z','#596f66',ink,.9);path('M17 -72 L37 -70 L36 -53 L18 -53 Z','#596f66',ink,.9);path('M21 -78 L35 -77 L35 -70 L21 -71 Z','#eee2c6',ink,.7)
  path('M-31 -40 L-9 -39 L-10 -29 L-31 -30 Z','#53685f',ink,.8);path('M20 -39 L37 -36 L35 -27 L19 -29 Z','#53685f',ink,.8)
  ctx.restore()
  if(typing){ctx.save();ctx.translate(0,26);path('M43 -151 L153 -151 L153 -144 L43 -144 Z','#d9c5a2');line([{x:50,y:-144},{x:50,y:-26},{x:50,y:-144},{x:146,y:-144},{x:146,y:-26}],'#53616a',3);path('M72 -154 L119 -154 L124 -151 L70 -151 Z','#667d80',ink,.6);for(let x=77;x<119;x+=5)line([{x,y:-153},{x:x+2,y:-153}],'#c6d5c7',.65);path('M117 -154 L129 -207 Q130 -210 134 -210 L164 -209 L152 -155 Z','#394c5a');path('M126 -162 L135 -202 L157 -201 L148 -162 Z','#91b4b8',ink,.7);path('M130 -165 L140 -197 L152 -197 L144 -165 Z','#a9c8c4','');ctx.restore();}
  arm(1)
  if(typing)hand(b.arms[0].wrist,0)
  ctx.save();ctx.translate(b.head.x,b.head.y);ctx.rotate(seated?.16:Math.sin(state.time*1.35)*.012)
  if(seated){
    // Authored right-facing profile. Nose, pupils and chin all face the screen.
    path('M-20 -29 Q-15 -54 11 -51 Q35 -51 37 -29 L37 -12 L48 -3 Q51 2 43 3 L35 5 Q38 20 28 30 L13 39 L-6 29 L-15 9 Z',skin)
    path('M-19 -26 Q-29 -36 -16 -51 Q-5 -65 11 -60 Q31 -65 37 -47 L31 -30 Q17 -46 1 -36 L-8 -15 Z',gold)
    for(let i=0;i<5;i++)path(`M${-14+i*8} -43 Q${-12+i*8} -59 ${5+i*6} -54`,gold, '#896248',1)
    oval(-12,-11,8,11,skin);path('M-15 -15 Q-7 -18 -9 -8',skin,'#ac7c63',1)
    path('M-5 -3 Q10 7 35 2 L43 12 Q42 33 18 43 Q-7 35 -12 17 Z',gold)
    for(let i=0;i<6;i++)path(`M${-5+i*6} 13 Q${-5+i*6} 26 ${4+i*5} 31`,gold,'#bc8c48',.6)
    path('M18 -2 Q27 -5 36 1 L45 2 Q41 11 28 8 Q20 6 14 10 Q14 3 18 -2 Z','#edc86c')
    path('M18 -22 Q26 -26 34 -22',skin,ink,2.5)
    path('M19 -17 Q26 -21 33 -15 Q26 -9 19 -17 Z','#f8ebce',ink,1)
    oval(29,-14,2.3,3,ink,'');oval(29.5,-15, .8,.9,'#fff6dd','')
    line([{x:39,y:6},{x:42,y:6}],ink,.7)
  }else{
    path('M-24 -35 Q-14 -57 12 -52 Q36 -50 34 -24 L39 -7 Q34 17 17 27 L-9 25 Q-31 10 -29 -13 Z',skin)
    oval(-27,-10,8,11,skin);oval(32,-9,6,10,skin)
    path('M-29 -22 Q-39 -38 -22 -50 Q-14 -68 4 -61 Q24 -65 36 -49 L31 -28 Q19 -46 3 -35 L-12 -29 L-21 -13 Z',gold)
    for(let i=0;i<6;i++)path(`M${-24+i*9} -36 Q${-21+i*9} -57 ${-7+i*7} -54`,gold,'#936547',1)
    path('M-26 -2 Q-12 9 1 2 Q20 10 32 -2 L33 19 Q28 43 4 48 Q-25 44 -32 24 Z',gold)
    for(let i=0;i<7;i++)path(`M${-21+i*7} 17 Q${-23+i*7} 31 ${-14+i*6} 36`,gold,'#b98a48',.6)
    path('M-2 -9 Q-13 -7 -20 1 Q-27 7 -34 1 Q-29 15 -10 9 L1 2 Q15 13 30 5 L37 -2 Q28 6 18 -3 Q10 -12 -2 -9 Z','#edc86c')
    path('M-22 -24 Q-14 -29 -6 -25',skin,ink,2.6);path('M9 -25 Q19 -29 27 -23',skin,ink,2.6)
    const blink=(state.time%4.7)>4.56
    for(const [x,y] of [[-14,-19],[18,-19]]){if(blink)line([{x:x-4,y},{x:x+4,y}],ink,1.3);else{oval(x,y,4.5,3.5,'#fff0d5',ink,.8);oval(x+1,y+.5,1.9,2.5,ink,'');oval(x+1.6,y-.5,.65,.8,'#fff6e0','')}}
    path('M1 -22 L-2 -10 Q2 -6 8 -11',skin,ink,1)
  }
  ctx.restore()
  if(state.joints){for(let k=0;k<2;k++)for(const points of [[b.shoulders[k],b.arms[k].elbow,b.arms[k].wrist],[b.hips[k],b.legs[k].elbow,b.legs[k].wrist]]){line(points,'#ef7360',.9);for(const p of points)oval(p.x,p.y,2,2,'#fff7dc','#df6b5b',.8)}}
  ctx.restore();return {bones:b,seated}
}
