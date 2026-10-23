import {useEffect,useState} from 'react'
import {nativeAvailable,nativeCommand} from './agentSessions'
export function useHarnessInventory(){
 const [inventory,setInventory]=useState<Record<string,boolean>>({})
 useEffect(()=>{const receive=(event:Event)=>{const items=(event as CustomEvent).detail?.items;if(Array.isArray(items))setInventory(Object.fromEntries(items.filter(i=>typeof i.id==='string'&&typeof i.installed==='boolean').map(i=>[i.id,i.installed])))};window.addEventListener('openplex-harnesses',receive);if(nativeAvailable())nativeCommand({action:'harness-inventory'});return ()=>window.removeEventListener('openplex-harnesses',receive)},[])
 return inventory
}
