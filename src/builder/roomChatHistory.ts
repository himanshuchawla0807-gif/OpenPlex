export interface RoomMessage {id:string;role:'user'|'employee'|'event';name:string;text:string;at:number}
export function roomConversationKey(projectId:string,roomId:string){return 'openplex.room-chat:'+projectId+':'+roomId}
export function parseRoomConversation(value:unknown):RoomMessage[]{
 if(!Array.isArray(value))return []
 let remaining=120000
 return value.slice(-100).reverse().flatMap(m=>{if(!m||typeof m.id!=='string'||!['user','employee','event'].includes(m.role)||typeof m.text!=='string'||typeof m.name!=='string'||!Number.isFinite(m.at)||remaining<=0)return [];const text=m.text.slice(0,Math.min(12000,remaining));remaining-=text.length;return [{id:m.id.slice(0,100),role:m.role,name:m.name.slice(0,80),text,at:m.at} as RoomMessage]}).reverse()
}
export function roomConversationContext(messages:RoomMessage[],notes:string){return ['Shared room notes:',notes.slice(0,12000),'Shared room conversation (participants can see this content):',...messages.slice(-16).map(m=>`${m.name}: ${m.text}`)].join('\n\n').slice(-50000)}
