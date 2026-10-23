import {sampleBrunoRoutine} from './brunoRoutine.ts'
/** Whole-pose artwork registration. No limbs are stretched or rotated. */
export type BrunoPose = 'idle' | 'walk' | 'sit' | 'type'
export const deskAtlas = {url:'/characters/bruno-prototype/desk-atlas.png',width:1254,height:1254,cell:627} as const
export const idleArtwork='/characters/bruno-prototype/idle-v2.png'
export const walkAtlas = {url:'/characters/bruno-prototype/walk-v3.png',width:1246,height:1263} as const
export const deskContacts = {seat:[225,432],keyboard:[428,302],floor:[334,607],screen:[531,242]} as const
// Measured opaque artwork bounds. Normalize the full pose, keeping soles on the floor.
export const walkFrames = [
 {x:180,y:18,w:406,h:605},{x:719,y:17,w:382,h:606},
 {x:181,y:624,w:438,h:606},{x:718,y:625,w:374,h:611},
] as const
export function sampleBrunoSprite(time:number,pose:BrunoPose){
  const safe=Math.max(0,time),cycle=safe%4.8
  return {walkFrame:Math.floor(safe/.17)%4,handFrame:Math.floor(safe/.22)%2===0?1:3,blink:(pose==='type'||pose==='sit')&&cycle>3.9&&cycle<4.03,typing:pose==='type'}
}
export function brunoOfficeState(time:number,reduced=false){return sampleBrunoRoutine(time,reduced)}
