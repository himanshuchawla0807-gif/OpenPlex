import {createPlayer,checkCoverage} from '@clayzo/webgl-player'
import {createCharacterDocument,CELL,characterStyles,CHARACTER_COUNT} from '../src/procedural/characters.ts'

// Development-only review page: exercises the same authorized browser playback
// package used by the office. This does not use the signed-in CLI render service.
const documentModel=createCharacterDocument(),coverage=await checkCoverage(documentModel)
if(!coverage.supported)throw new Error(coverage.reasons.join(', '))
const source=document.createElement('canvas'),sheet=document.querySelector<HTMLCanvasElement>('#review')!
sheet.width=1024;sheet.height=800
const ctx=sheet.getContext('2d')!
ctx.fillStyle='#eee9de';ctx.fillRect(0,0,1024,800)
const errors:string[]=[]
const player=await createPlayer({canvas:source,document:documentModel,resolution:1,interactive:false,pauseWhenOffscreen:false,onError:error=>errors.push(error.message)})
const ticks=[0,30,60,90,120,180,720,959]
for(let column=0;column<ticks.length;column++) {
  await player.seek(ticks[column])
  ctx.fillStyle='#44566b';ctx.font='12px monospace';ctx.fillText((ticks[column]/240).toFixed(2)+'s',column*128+12,20)
  for(let person=0;person<2;person++)for(let mode=0;mode<3;mode++) {
    ctx.drawImage(source,person*5*CELL,mode*CELL,CELL,CELL,column*128,32+(person*3+mode)*128,CELL,CELL)
  }
}
document.body.dataset.review=JSON.stringify({revision:documentModel.revision,coverage,ticks,errors,modeRows:['walk','seated','idle'],employees:['anika','arjun']})
const gallery=document.createElement('canvas');gallery.id='wardrobe';gallery.width=896;gallery.height=Math.ceil(CHARACTER_COUNT/7)*300
const g=gallery.getContext('2d')!;g.fillStyle='#eee9de';g.fillRect(0,0,gallery.width,gallery.height)
await player.seek(60)
for(let person=0;person<CHARACTER_COUNT;person++){
  const x=(person%7)*128,y=Math.floor(person/7)*300
  g.fillStyle='#44566b';g.font='12px monospace';g.fillText(characterStyles[person].id,x+30,y+18)
  g.drawImage(source,person*CELL,0,CELL,CELL,x,y+25,CELL,CELL)
  g.drawImage(source,person*CELL,CELL,CELL,CELL,x,y+155,CELL,CELL)
}
document.body.append(gallery)
player.dispose()

// Control measurement: after disposing the player, only requestAnimationFrame
// remains. This separates host/browser scheduling from scene rendering cost.
const intervals:number[]=[]
let previous=0
function measure(timestamp:number) {
  if(previous)intervals.push(timestamp-previous)
  previous=timestamp
  if(intervals.length<120)requestAnimationFrame(measure)
  else document.body.dataset.frameBaseline=JSON.stringify({fps:Math.round(120000/intervals.reduce((a,b)=>a+b,0)),p95:intervals.sort((a,b)=>a-b)[113],sceneDisposed:true})
}
requestAnimationFrame(measure)
