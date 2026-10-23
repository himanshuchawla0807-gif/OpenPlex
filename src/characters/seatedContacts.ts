import {project,type Station} from '../procedural/model.ts'
/** Keyboard center relative to a floor seat anchor, mirrored at the opposing row. */
export function keyboardContact(station:Pick<Station,'i'|'j'|'reverse'>){
 const reverse=Boolean(station.reverse),p=project(station.i,station.j),target=project(station.i+(reverse?-.63:.63),station.j+.125,1.40)
 return {x:target.x-p.x,y:target.y-p.y}
}
