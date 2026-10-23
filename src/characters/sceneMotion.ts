export const smooth=(u:number)=>{const p=Math.max(0,Math.min(1,u));return p*p*(3-2*p)}
/** Select rear art from floor-axis velocity, never from a body mirror transition. */
export function travelView(di:number,dj:number){const x=di-dj,y=di+dj;return {rear:y<-.0001,mirror:x<0?-1:1}}
export function walkingFrame(distance:number,count:number,stride=1.05){return Math.floor(Math.max(0,distance)/stride*count)%count}
export function riseFrame(progress:number){return Math.min(5,Math.floor(smooth(progress)*6))}
export function chairExit(progress:number){return {backoff:-.8*smooth(progress/.3),rise:smooth((progress-.25)/.75)}}
export function furnitureDepth(i:number,j:number){return i+j}
