import {MIN_ZOOM,MAX_ZOOM} from './Camera.ts'
export const clampZoom=(zoom:number)=>Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,zoom))
export function wheelGesture(deltaX:number,deltaY:number,deltaMode:number,pinch:boolean,pageHeight:number):{kind:'pan';x:number;y:number}|{kind:'zoom';factor:number} {
  const unit=deltaMode===1?16:deltaMode===2?pageHeight:1
  if(pinch)return {kind:'zoom',factor:Math.exp(-Math.max(-50,Math.min(50,deltaY*unit))*0.007)}
  // Trackpad scrolling moves the canvas in screen pixels, independent of scene zoom.
  return {kind:'pan',x:-Math.max(-240,Math.min(240,deltaX*unit))*0.9,y:-Math.max(-240,Math.min(240,deltaY*unit))*0.9}
}
export function pinchFactor(previousDistance:number,nextDistance:number):number {
  return previousDistance>0&&nextDistance>0?Math.pow(nextDistance/previousDistance,1.12):1
}
