import {useSyncExternalStore} from 'react'
export type Appearance='system'|'light'|'dark'
export type ResolvedAppearance='light'|'dark'
const KEY='openplex.appearance'
const valid=(value:unknown):value is Appearance=>value==='system'||value==='light'||value==='dark'
const media=window.matchMedia('(prefers-color-scheme: dark)')
const listeners=new Set<()=>void>()
let preference:Appearance='system'
try{const native=(window as Window&{__OPENPLEX_APPEARANCE__?:string}).__OPENPLEX_APPEARANCE__,stored=localStorage.getItem(KEY);preference=valid(native)?native:valid(stored)?stored:'system'}catch{/* System appearance works without storage. */}
export const resolvedAppearance=():ResolvedAppearance=>preference==='system'?(media.matches?'dark':'light'):preference
function apply(){document.documentElement.dataset.appearance=resolvedAppearance();document.documentElement.style.colorScheme=resolvedAppearance();for(const listener of listeners)listener();window.dispatchEvent(new CustomEvent('openplex-appearance',{detail:{preference,resolved:resolvedAppearance()}}))}
media.addEventListener('change',apply)
export function setAppearance(next:Appearance){if(!valid(next))return;preference=next;try{localStorage.setItem(KEY,next)}catch{/* Keep the current window usable. */}apply();const bridge=(window as Window&{webkit?:{messageHandlers?:{openplex?:{postMessage:(value:unknown)=>void}}}}).webkit?.messageHandlers?.openplex;bridge?.postMessage({action:'set-appearance',appearance:next})}
window.addEventListener('storage',event=>{if(event.key===KEY){preference=valid(event.newValue)?event.newValue:'system';apply()}})
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener)}
export function useAppearance(){const value=useSyncExternalStore(subscribe,()=>`${preference}:${resolvedAppearance()}`);return {preference:value.split(':')[0] as Appearance,resolved:value.split(':')[1] as ResolvedAppearance,setAppearance}}
apply()
