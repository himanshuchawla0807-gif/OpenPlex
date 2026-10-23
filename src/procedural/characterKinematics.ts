export interface Point2 { x:number; y:number }
export interface TwoBoneSolution { upperDegrees:number; lowerDegrees:number; elbow:Point2; wrist:Point2 }
/** Down-axis joint convention used by the authored Clayzo skeleton. Positive bend
 * keeps elbows/knees below their target, instead of folding hands through bodies. */
export function solveTwoBone(shoulder:Point2,target:Point2,upperLength:number,lowerLength:number,bend=1):TwoBoneSolution {
  const dx=target.x-shoulder.x,dy=target.y-shoulder.y,raw=Math.hypot(dx,dy)
  const distance=Math.max(Math.abs(upperLength-lowerLength)+1e-5,Math.min(upperLength+lowerLength-1e-5,raw))
  const ux=raw?dx/raw:0,uy=raw?dy/raw:1
  const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance)
  const height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along))*bend
  const elbow={x:shoulder.x+ux*along-uy*height,y:shoulder.y+uy*along+ux*height}
  const wrist={x:shoulder.x+ux*distance,y:shoulder.y+uy*distance}
  const upperDegrees=Math.atan2(-(elbow.x-shoulder.x),elbow.y-shoulder.y)*180/Math.PI
  let lowerDegrees=Math.atan2(-(wrist.x-elbow.x),wrist.y-elbow.y)*180/Math.PI-upperDegrees
  while(lowerDegrees>180)lowerDegrees-=360
  while(lowerDegrees< -180)lowerDegrees+=360
  return {upperDegrees,lowerDegrees,elbow,wrist}
}
export function typingHandTarget(near:boolean,tick:number,phase=0):Point2 {
  // Projected desk contacts: chair is .45 units behind the front edge,
  // keyboard spans desk i+.02..+.34 and j+.95..+1.90 at z1.35.
  // Wrist travel stays within half a source pixel; fingers do the typing.
  return {x:(near?33:22)+Math.sin(tick/240*Math.PI*2+phase)*.22,y:(near?-9:-11)+Math.sin(tick/120*Math.PI*2+phase)*.18}
}
export function walkingFootTarget(tick:number,phase=0):Point2 {
  const cycle=tick/240*Math.PI*2+phase
  return {x:Math.cos(cycle)*9,y:49-Math.max(0,Math.sin(cycle))*6}
}
