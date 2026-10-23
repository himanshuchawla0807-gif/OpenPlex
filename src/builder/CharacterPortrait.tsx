import {useState,type CSSProperties} from 'react'
import {campusCast,catalogOrder} from '../data/campusCast'
export function CharacterPortrait({index,className=''}:{index:number;className?:string}){
 const [missing,setMissing]=useState(false),slot=catalogOrder.indexOf(index),character=campusCast[index]??campusCast[0]
 const atlas=Math.floor(Math.max(0,slot)/4),cell=Math.max(0,slot)%4
 const style={'--portrait-x':`${cell%2*100}%`,'--portrait-y':`${Math.floor(cell/2)*100}%`} as CSSProperties
 return <span role="img" aria-label={`${character.name} face portrait`} data-portrait-slot={slot} className={`character-portrait ${className}`} style={style}>{missing?<span className="portrait-fallback">{character.name.slice(0,1)}</span>:<img src={`/characters/portraits/group-${atlas}.png`} alt="" onError={()=>setMissing(true)}/>}</span>
}
