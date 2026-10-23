/** Continuous image mesh: the holding arm/torso stay fixed, the free hand swings.
 * Shared vertices avoid disconnected cutout joints. Units are normalized artwork. */
export function carryVertex(u:number,v:number,phase:number,freeSide=1){
 const ramp=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)}
 const swing=Math.sin(phase*Math.PI*2)
 const arm=ramp(.62,.87,freeSide<0?1-u:u)*ramp(.22,.47,v)*(1-ramp(.58,.66,v))
 const legs=ramp(.62,.95,v),side=Math.tanh((u-.54)*12)
 return {x:u+swing*.075*arm+swing*.035*legs*side,y:v-Math.max(0,swing*side)*.018*legs}
}
