import {createPlayer} from '@clayzo/webgl-player'
import {createCharacterDocument,selectCharacterModes,CELL,CHARACTER_COUNT,type CharacterMode} from '../src/procedural/characters'

// Local browser review of the shipped WebGL player: no CLI/cloud rendering.
const full=createCharacterDocument()
const poses:[number,CharacterMode][]=[[2,'walk'],[21,'work'],[22,'idle'],[23,'work-reverse']]
const modes:(CharacterMode|null)[]=Array(CHARACTER_COUNT).fill(null)
poses.forEach(([index,mode])=>{modes[index]=mode})
const model=selectCharacterModes(full,modes,true),source=document.createElement('canvas')
const player=await createPlayer({canvas:source,document:model,resolution:2,interactive:false,pauseWhenOffscreen:false})
const sheet=document.createElement('canvas');sheet.width=1152;sheet.height=768
const ctx=sheet.getContext('2d')!;ctx.fillStyle='#f3eddf';ctx.fillRect(0,0,sheet.width,sheet.height)
const ticks=[0,30,60,120,240,480,720,900,959]
for(let n=0;n<ticks.length;n++) {
  await player.seek(ticks[n])
  ctx.fillStyle='#526873';ctx.font='11px monospace';ctx.fillText((ticks[n]/240).toFixed(2)+'s',n*128+12,18)
  for(let row=0;row<poses.length;row++)ctx.drawImage(source,row*CELL*2,0,CELL*2,CELL*2,n*128,30+row*180,128,128)
}
player.dispose();document.body.append(sheet)
document.body.dataset.review=JSON.stringify({revision:model.revision,ticks,poses,complete:true})
