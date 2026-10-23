import { LivingWorld } from '../src/living/LivingWorld.ts'
import { livingRooms } from '../src/living/roomActivities.ts'

let seed=290926
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const world=new LivingWorld(livingRooms,random)
const departures:{second:number;id:string;from:string;to:string;purpose:string;dwell:number;duration:number}[]=[]
const meetings:{second:number;room:string;location:string}[]=[]
const activeSeconds=new Map<string,number>()
for(let step=0;step<36000;step++){
  const before=world.characters.map(a=>a.trips)
  const previousMeetings=[...world.conversationMemory.values()].map(m=>m.lastAt)
  world.update(0.1)
  world.characters.forEach((a,i)=>{
    if(a.trips!==before[i])departures.push({second:Math.round(world.time),id:a.id,from:a.pointId,
      to:a.journey!.destination,purpose:a.journey!.purpose,dwell:Math.round(world.time-a.arrivedAt),duration:Number(a.journey!.duration.toFixed(1))})
  })
  ;[...world.conversationMemory].forEach(([room,m],i)=>{
    if(m.lastAt!==previousMeetings[i])meetings.push({second:Math.round(world.time),room,location:m.recentLocations.at(-1)!})
  })
  for(const [room,events]of world.ambient)for(const e of events)if(e.active){
    const key=room+'/'+e.definition.id;activeSeconds.set(key,(activeSeconds.get(key)??0)+0.1)
  }
  if(step===5999)console.log(JSON.stringify({window:'first 10 simulated minutes',
    characters:world.characters.map(a=>({id:a.id,trips:a.trips,talks:a.talks,stationaryPercent:Number((100-a.walkingSeconds/world.time*100).toFixed(1))})),
    departures:[...departures],meetings:[...meetings],
    ambient:[...world.ambient].map(([room,events])=>({room,events:events.map(e=>({id:e.definition.id,starts:e.starts,activePercent:Number(((activeSeconds.get(room+'/'+e.definition.id)??0)/world.time*100).toFixed(1))}))})),
  },null,2))
}
console.log(JSON.stringify({window:'one simulated hour',
  characters:world.characters.map(a=>({id:a.id,trips:a.trips,talks:a.talks,stationaryPercent:Number((100-a.walkingSeconds/world.time*100).toFixed(1))})),
  meetings,travelDurationRange:[Math.min(...departures.map(d=>d.duration)),Math.max(...departures.map(d=>d.duration))],
},null,2))
