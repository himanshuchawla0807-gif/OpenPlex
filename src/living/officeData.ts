import type { AmbientDefinition, Cutout, LivingRoomDefinition, Polygon } from './types'

const cut=(id:string,depth:number,polygon:Polygon):Cutout=>({id,depth,polygon})
const event=(id:string,kind:AmbientDefinition['kind'],polygon:Polygon,depth:number,activity?:string):AmbientDefinition=>({
  id,kind,polygon,depth,activity,pivot:{x:polygon[0][0],y:polygon[0][1]},
  amplitude:kind==='leaf'?0.014:kind==='paper'?0.011:1,
  minDelay:kind==='printer'?100:kind==='screen'?35:45,
  maxDelay:kind==='printer'?190:kind==='screen'?85:120,
  duration:kind==='printer'?6.5:kind==='screen'?5:6,
  probability:activity?0.95:0.8,
})

/** Registered to the replacement plate only. Neighbouring room data and schedules are untouched. */
export const officeRoom:LivingRoomDefinition={
  roomId:'illustrated-workshop',sheet:'/assets/living/office-characters.png',
  points:[
    {id:'left-workstation',foot:{x:500,y:658},activity:'WORKING',facing:-1,task:'handle'},
    {id:'right-workstation',foot:{x:1010,y:635},activity:'WORKING',facing:1,task:'handle'},
    {id:'central-table',foot:{x:610,y:720},activity:'READING',facing:1,task:'study'},
    {id:'whiteboard',foot:{x:230,y:690},activity:'WORKING',facing:1,task:'handle'},
    {id:'printer',foot:{x:823,y:873},activity:'WORKING',facing:-1,task:'study'},
    {id:'coffee',foot:{x:1356,y:754},activity:'WORKING',facing:1,task:'handle'},
    {id:'lounge',foot:{x:1007,y:825},activity:'READING',facing:1,task:'study'},
    {id:'left-aisle',foot:{x:507,y:736}},
    {id:'whiteboard-aisle',foot:{x:445,y:695}},
    {id:'front-aisle',foot:{x:848,y:820}},
    {id:'right-aisle',foot:{x:1004,y:710}},
    {id:'far-right-aisle',foot:{x:1299,y:701}},
  ],
  // Task anchors are side branches, never through-routes across an occupied colleague.
  edges:[['left-workstation','left-aisle'],['whiteboard','whiteboard-aisle'],
    ['whiteboard-aisle','left-aisle'],['central-table','left-aisle'],
    ['left-aisle','front-aisle'],['front-aisle','printer'],['front-aisle','lounge'],
    ['front-aisle','right-aisle'],['right-aisle','right-workstation'],
    ['right-aisle','far-right-aisle'],['far-right-aisle','coffee']],
  characters:[
    {id:'workshop-man',gender:'man',start:'left-workstation',preferences:['left-workstation','left-workstation','whiteboard','central-table','printer','coffee','lounge'],height:268},
    {id:'workshop-woman',gender:'woman',start:'right-workstation',preferences:['right-workstation','right-workstation','central-table','printer','whiteboard','coffee','lounge'],height:256},
  ],
  foreground:[
    cut('office-left-desk',645,[[211,491],[499,413],[570,448],[570,549],[547,558],[547,481],[350,558],[345,641],[309,653],[306,547],[212,520]]),
    cut('office-left-chair',632,[[451,449],[494,428],[517,445],[507,524],[491,557],[517,593],[504,610],[463,580],[446,599],[404,609],[398,591],[439,556],[410,541],[408,508],[432,499]]),
    cut('office-table',738,[[630,575],[650,552],[694,529],[751,530],[789,533],[813,529],[849,550],[880,577],[886,614],[869,631],[810,656],[798,704],[779,708],[777,663],[709,661],[700,710],[681,696],[682,647],[644,629]]),
    cut('office-right-desk',684,[[1005,468],[1101,443],[1323,544],[1317,596],[1293,617],[1289,680],[1271,683],[1272,626],[1195,606],[1194,651],[1168,648],[1170,583],[1060,533],[1056,591],[1038,586],[1038,516],[1005,493]]),
    cut('office-right-chair',666,[[1061,476],[1103,474],[1144,496],[1156,549],[1145,585],[1126,601],[1129,632],[1151,647],[1142,661],[1107,638],[1062,655],[1051,648],[1087,624],[1094,600],[1071,583]]),
    cut('office-printer-cart',908,[[638,746],[648,718],[679,721],[699,735],[744,735],[779,749],[798,777],[800,865],[780,902],[751,902],[748,885],[670,846],[661,891],[644,883],[645,827],[627,810]]),
    cut('office-plant-crate',803,[[307,664],[334,639],[356,640],[390,662],[430,730],[431,777],[397,806],[333,772],[331,727],[312,709]]),
    cut('office-lounge',862,[[1040,744],[1107,678],[1142,640],[1208,668],[1223,698],[1208,763],[1210,826],[1193,832],[1191,809],[1131,830],[1120,859],[1104,854],[1102,817],[1048,794]]),
    cut('office-side-table',812,[[957,714],[986,697],[1018,697],[1050,720],[1052,744],[1040,755],[1036,808],[1024,815],[1024,760],[976,747],[974,781],[961,786],[960,736]]),
    cut('office-coffee-cabinet',736,[[1301,573],[1363,548],[1468,596],[1464,710],[1404,738],[1302,688]]),
  ],
  ambient:[
    event('office-left-screen','screen',[[332,408],[395,382],[395,449],[331,468]],646,'left-workstation'),
    event('office-right-screen','screen',[[1190,425],[1243,446],[1243,496],[1190,475]],687,'right-workstation'),
    {...event('office-printer-feed','printer',[[704,760],[786,760],[803,818],[716,822]],911,'printer'),
      sourcePolygon:[[699,834],[731,822],[751,832],[719,845]]},
    event('office-board-note','whiteboard',[[143,372],[158,365],[158,388],[143,395]],644,'whiteboard'),
    {...event('office-leaves','leaf',[[667,232],[686,251],[687,284],[674,297],[664,273]],548),pivot:{x:671,y:230}},
    event('office-project-page','paper',[[731,610],[750,602],[769,612],[750,622]],741,'central-table'),
    event('office-coffee-light','coffee',[[1374,529],[1384,529],[1384,541],[1374,541]],738,'coffee'),
  ],
}
