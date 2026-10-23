import {smooth} from './sceneMotion.ts'
export type BrunoActivity='typing'|'stand'|'sit'|'walk'|'brew'|'place-cup'|'pick-book'|'place-book'|'read'|'collect-book'|'return-book'
export type CarriedProp='none'|'coffee'|'book'
const desk={i:4.05,j:16},exit={i:3.25,j:16},coffee={i:2.7,j:20},library={i:1.6,j:9.5}
export const brunoStops={desk,exit,coffee,library}
/** All props are socketed in world coordinates on the real shared worktop. */
export const brunoDeskSockets={book:{i:5.18,j:16.55,z:1.44},cup:{i:4.8,j:16.25,z:1.35}}
interface Beat{duration:number;activity:BrunoActivity;from:typeof desk;to?:typeof desk;carry?:CarriedProp;via?:typeof desk[]}
export const brunoRoutine:Beat[]=[
 {duration:18,activity:'typing',from:desk},
 {duration:2,activity:'stand',from:desk,to:exit},
 {duration:8,activity:'walk',from:exit,to:coffee,via:[{i:2.7,j:16}]},
 {duration:4,activity:'brew',from:coffee},
 {duration:6,activity:'walk',from:coffee,to:exit,via:[{i:2.7,j:16}],carry:'coffee'},
 {duration:2,activity:'sit',from:exit,to:desk,carry:'coffee'},
 {duration:2,activity:'place-cup',from:desk,carry:'coffee'},
 {duration:18,activity:'typing',from:desk},
 {duration:2,activity:'stand',from:desk,to:exit},
 {duration:7,activity:'walk',from:exit,to:library,via:[{i:2.7,j:16},{i:2.7,j:9.5}]},
 {duration:3,activity:'pick-book',from:library},
 {duration:9,activity:'walk',from:library,to:exit,via:[{i:2.7,j:9.5},{i:2.7,j:16}],carry:'book'},
 {duration:2,activity:'sit',from:exit,to:desk,carry:'book'},
 {duration:2,activity:'place-book',from:desk,carry:'book'},
 {duration:10,activity:'read',from:desk,carry:'book'},
 {duration:20,activity:'typing',from:desk},
 {duration:2,activity:'collect-book',from:desk,carry:'book'},
 {duration:2,activity:'stand',from:desk,to:exit,carry:'book'},
 {duration:9,activity:'walk',from:exit,to:library,via:[{i:2.7,j:16},{i:2.7,j:9.5}],carry:'book'},
 {duration:3,activity:'return-book',from:library,carry:'book'},
 {duration:9,activity:'walk',from:library,to:exit,via:[{i:2.7,j:9.5},{i:2.7,j:16}]},
 {duration:2,activity:'sit',from:exit,to:desk},
 {duration:22,activity:'typing',from:desk},
]
export const brunoRoutineDuration=brunoRoutine.reduce((sum,b)=>sum+b.duration,0)
export function sampleBrunoRoutine(time:number,reduced=false){
 const t=reduced?0:Math.max(0,Number.isFinite(time)?time:0)%brunoRoutineDuration
 let start=0,index=0
 for(;index<brunoRoutine.length-1;index++){if(t<start+brunoRoutine[index].duration)break;start+=brunoRoutine[index].duration}
 const beat=brunoRoutine[index],progress=(t-start)/beat.duration,to=beat.to??beat.from,activity=beat.activity
 const ease=(p:number)=>p<.1?5*p*p:p>.9?.9-5*(1-p)*(1-p):p-.05
 // Pull the chair back before rising. Reverse that exact sequence to sit.
 const rise=activity==='stand'?smooth((progress-.3)/.7):activity==='sit'?1-smooth(progress/.7):0
 const blend=activity==='stand'?smooth(progress/.3):activity==='sit'?smooth((progress-.7)/.3):beat.to?ease(progress)/.9:0
 const route=[beat.from,...(beat.via??[]),to],lengths=[0]
 for(let n=1;n<route.length;n++)lengths.push(lengths[n-1]+Math.hypot(route[n].i-route[n-1].i,route[n].j-route[n-1].j))
 const distance=blend*lengths.at(-1)!
 let edge=1;while(edge<route.length-1&&lengths[edge]<distance)edge++
 const a=route[edge-1],z=route[edge],u=(distance-lengths[edge-1])/Math.max(.0001,lengths[edge]-lengths[edge-1])
 const i=a.i+(z.i-a.i)*u,j=a.j+(z.j-a.j)*u
 let carry:CarriedProp=beat.carry??'none'
 if(activity==='brew')carry=progress>.65?'coffee':'none'
 if(activity==='pick-book'&&progress>=.55)carry='book'
 if((activity==='return-book'||activity==='place-cup'||activity==='place-book')&&progress>=.65)carry='none'
 if(activity==='collect-book'&&progress<.5)carry='none'
 let coffeeOnDesk=false,bookOnDesk=false,bookOnShelf=true
 for(let n=0;n<=index;n++){
  const b=brunoRoutine[n],p=n<index?1:progress
  if(b.activity==='place-cup'&&p>=.65)coffeeOnDesk=true
  if(b.activity==='pick-book'&&p>=.55)bookOnShelf=false
  if(b.activity==='place-book'&&p>=.65)bookOnDesk=true
  if(b.activity==='collect-book'&&p>=.5)bookOnDesk=false
  if(b.activity==='return-book'&&p>=.65)bookOnShelf=true
 }
 if(activity==='read')bookOnDesk=false
 const working=['typing','read','place-cup','place-book','collect-book'].includes(activity)
 return {i,j,activity,carry,progress,beat:index,distance,di:z.i-a.i,dj:z.j-a.j,rise,
  mode:activity==='walk'?'walk' as const:working?'work' as const:'idle' as const,
  facing:beat.to?((z.i-a.i)-(z.j-a.j)>=0?1:-1):activity==='pick-book'||activity==='return-book'?-1:1,
  coffeeOnDesk,bookOnDesk,bookOnShelf,
 }
}
