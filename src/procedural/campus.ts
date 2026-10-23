import type {Room} from '../types/world'
import {officeDefinitions} from './officeRooms.ts'

/** Active campus. Historical raster rooms remain available in world/roomData. */
export const rooms:Room[]=officeDefinitions.map(def=>({
  id:def.id,name:def.name,origin:def.origin,width:def.width,depth:def.depth,wallHeight:def.wallHeight,objects:[],
  theme:{id:'developer',floorA:def.floor,floorB:def.floor,wallBack:def.wall,wallSide:def.wall,wallLower:'#bcc7ce',trim:'#d0b798',accent:def.accent,label:def.accent},
}))
