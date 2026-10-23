import {uniqueCastProfiles} from './uniqueCastProfiles.ts'
export type CampusBaseId='oscar'|'bruno'|'cleo'|'gus'|'ziggy'|'poppy'|'mabel'|'hugo'
export interface CampusCharacter {
  id:string
  name:string
  baseId:CampusBaseId
  variant:number
  /** Garment-only palette shift, in degrees; skin and hair keep their original colours. */
  hue:number
  title:string
  outfit:string
  description:string
  specialties:string[]
  source:string
  image:string
}
const bases:Record<CampusBaseId,{names:string[];title:string;outfit:string;description:string;specialties:string[]}>={
  oscar:{names:['Oscar','Felix','Jasper','Theo','Sebastian'],title:'Strategy & operations',outfit:'Tailored suit · bow tie · flower pin',description:'A sharp wit, a well-cut suit and a talent for turning a busy meeting into a useful plan.',specialties:['Strategy','Operations']},
  bruno:{names:['Bruno','Bennett','Arthur','Winston','Magnus'],title:'Engineering & mentoring',outfit:'Plaid waistcoat · rolled sleeves',description:'The gentle giant who makes room for a good question, a fresh coffee and one more code review.',specialties:['Engineering','Mentoring']},
  cleo:{names:['Cleo','Iris','Vera','Margot','Stella'],title:'Design & direction',outfit:'Puff sleeves · flowing midi skirt',description:'An expressive silhouette and a precise eye for the detail that makes the whole design work.',specialties:['Design','Direction']},
  gus:{names:['Gus','Alfie','Otis','Reuben','Walter'],title:'Systems & support',outfit:'Camp shirt · suspenders · satchel',description:'A practical problem solver with a pocket notebook and an excellent memory for how things connect.',specialties:['Systems','Support']},
  ziggy:{names:['Ziggy','Kit','Arlo','Rory','Nico'],title:'Prototyping & experiments',outfit:'Open-collar shirt · skinny trousers',description:'Restless curiosity, improbable ideas and the first working prototype before lunch.',specialties:['Prototyping','Experiments']},
  poppy:{names:['Poppy','Daisy','Piper','Rosie','Hazel'],title:'Marketing & community',outfit:'Polka-dot blouse · pleated skirt',description:'A bright spark who connects people, shapes campaigns and always has a story worth sharing.',specialties:['Marketing','Community']},
  mabel:{names:['Mabel','Edith','Pearl','Sylvie','Agnes'],title:'Knowledge & quality',outfit:'Soft cardigan · wide culottes',description:'Thoughtful questions, formidable judgement and the reference book everyone else forgot existed.',specialties:['Knowledge','Quality']},
  hugo:{names:['Hugo','Percy','Leon','Edmund','Simon'],title:'Research & analysis',outfit:'Textured knit · plaid trousers',description:'A quietly playful researcher who turns careful observations into surprisingly useful discoveries.',specialties:['Research','Analysis']},
}
export const campusWardrobes=[
  {name:'Original',hue:0,colour:'#77a698'},
  {name:'Terracotta',hue:145,colour:'#b96f55'},
  {name:'Blue hour',hue:45,colour:'#678ca9'},
  {name:'Mulberry',hue:100,colour:'#986a91'},
  {name:'Golden hour',hue:235,colour:'#b69955'},
] as const
const baseOrder:CampusBaseId[]=['oscar','bruno','cleo','gus','ziggy','poppy','mabel','hugo']
const roster=baseOrder.flatMap(baseId=>bases[baseId].names.map((name,variant):CampusCharacter=>{
  const base=bases[baseId],wardrobe=campusWardrobes[variant]
  return {id:variant===0?baseId:name.toLowerCase(),name,baseId,variant,hue:wardrobe.hue,title:base.title,outfit:`${wardrobe.name} palette · ${base.outfit}`,description:base.description,specialties:[...base.specialties],source:variant===0?'Original wardrobe':'Wardrobe variation',image:`/characters/cast-v1/${baseId}.png`}
}))
/** Stable scene slots preserve the four original employees' desk assignments. */
const originalSlots:Record<number,CampusBaseId>={0:'oscar',5:'cleo',11:'gus',13:'bruno'}
for(const [slotText,id] of Object.entries(originalSlots)){
  const slot=Number(slotText),from=roster.findIndex(character=>character.id===id)
  ;[roster[slot],roster[from]]=[roster[from],roster[slot]]
}
/** Eight original identities and 32 new, separately drawn directional character sets. */
export const campusCast:CampusCharacter[]=roster.map(character=>{
 const unique=uniqueCastProfiles[character.id]
 return unique?{...character,...unique,variant:0,hue:0,source:'Distinct illustrated character'}:character
})
/** Selection order is independent of saved employee indices and seat assignments. */
const featuredIds=['oscar','gus','felix','jasper','poppy','otis','cleo','kit','bruno','rory','ziggy','theo','mabel','arthur','hugo','daisy','bennett','sylvie','stella','magnus','rosie','pearl','winston','margot','arlo','vera','nico','piper','alfie','edith','hazel','sebastian','walter','agnes','reuben','percy','leon','edmund','simon','iris']
export const catalogOrder=featuredIds.map(id=>campusCast.findIndex(c=>c.id===id)).filter(index=>index>=0)
