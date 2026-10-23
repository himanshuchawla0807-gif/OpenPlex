import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { OfficeSimulation } from '../src/living/OfficeSimulation.ts'
import { prepareTeamArtwork, drawOfficeTeam } from '../src/living/OfficeTeamRenderer.ts'

// Offline Canvas rendering of the actual population renderer; does not automate a browser.
const require = createRequire(resolve(process.argv[2], 'package.json'))
const { createCanvas, loadImage } = require('@napi-rs/canvas')
const sheet = await loadImage(resolve('public/assets/living/office-team.png'))
const plate = await loadImage(resolve('public/assets/rooms/connected-office.png'))
const art = prepareTeamArtwork(sheet, plate, createCanvas)
let seed=54
const world=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296})
mkdirSync('output/office-team-review',{recursive:true})
const captures = new Set([0, 30, 65, 110, 135, 180])
let capturedBriefing=false
for(let frame=0;frame<=600*30;frame++) {
  if(frame)world.update(1/30)
  const seconds=frame/30
  const firstBriefing=world.phase==='briefing'&&!capturedBriefing
  if(captures.has(seconds)||firstBriefing) {
    const canvas=createCanvas(1536,1024),ctx=canvas.getContext('2d')
    ctx.fillStyle='#f3eddf';ctx.fillRect(0,0,1536,1024);ctx.drawImage(plate,0,0)
    drawOfficeTeam(ctx,world,art)
    const label=firstBriefing?'briefing':seconds+'s'
    writeFileSync(`output/office-team-review/office-${label}.png`,canvas.toBuffer('image/png'))
    if(firstBriefing) {
      capturedBriefing=true
      const overview=createCanvas(1100,760),ov=overview.getContext('2d')
      ov.fillStyle='#f3eddf';ov.fillRect(0,0,1100,760);ov.drawImage(canvas,55,45,990,660)
      writeFileSync('output/office-team-review/overview.png',overview.toBuffer('image/png'))
      const detail=createCanvas(1200,800),dc=detail.getContext('2d')
      dc.imageSmoothingEnabled=false;dc.drawImage(canvas,590,180,600,400,0,0,1200,800)
      writeFileSync('output/office-team-review/detail.png',detail.toBuffer('image/png'))
      captures.add(seconds+45)
    }
    console.log(seconds,world.phase,world.actors.map(a=>`${a.id}:${a.state}:${a.spot}`).join(' '))
  }
}
console.log('Portrait sizes',art.portraits.map(f=>`${f.width}x${f.height}`))
console.log({briefings:world.briefings,conversations:world.conversations})
