import type { Activity, ActivityPoint, LivingRoomDefinition } from './types'
import { atelierAmbient, atelierForeground, conservatoryAmbient, conservatoryForeground, gardenerMasks, printmakerMasks } from './roomLayers.ts'
import { officeRoom } from './officeData.ts'

const point = (id: string, x: number, y: number, activity?: Activity, facing = 1): ActivityPoint => ({
  id, foot: { x, y }, activity, facing,
  task: activity === 'READING' ? 'study' : activity === 'OBSERVING' ? 'observe' : 'handle',
})

/** Feet are authored in plate pixels, then transformed with the room's existing isometric origin. */
export const livingRooms: LivingRoomDefinition[] = [officeRoom, {
  roomId:'botanists-conservatory',sheet:'/assets/living/conservatory-characters.png',
  repair:{source:'/assets/living/gardener-repair-source.png',masks:gardenerMasks},
  points:[point('potting-bench',666,681,'WORKING'),point('seed-shelves',454,607,'INSPECTING',-1),
    point('plant-area',319,723,'INSPECTING',-1),point('botanical-table',1019,796,'READING',-1),
    point('watering-area',1167,662,'WORKING'),point('left-aisle',532,736),point('front-aisle',789,895)],
  edges:[['potting-bench','left-aisle'],['seed-shelves','left-aisle'],['plant-area','left-aisle'],
    ['left-aisle','front-aisle'],['front-aisle','botanical-table'],['botanical-table','watering-area']],
  characters:[
    {id:'conservatory-man',gender:'man',start:'potting-bench',preferences:['potting-bench','potting-bench','seed-shelves','plant-area','botanical-table'],height:262},
    {id:'conservatory-woman',gender:'woman',start:'watering-area',preferences:['watering-area','botanical-table','botanical-table','seed-shelves','potting-bench','plant-area'],height:250},
  ],
  foreground:conservatoryForeground,ambient:conservatoryAmbient,
}, {
  roomId:'printmakers-atelier',sheet:'/assets/living/atelier-characters.png',
  repair:{source:'/assets/living/printmaker-repair-source.png',masks:printmakerMasks},
  points:[point('printing-press',615,710,'WORKING'),point('ink-station',1093,680,'WORKING'),
    point('drying-rack',431,689,'INSPECTING',-1),point('paper-table',829,917,'READING',-1),
    point('storage',1314,802,'INSPECTING'),point('left-aisle',535,785),point('front-aisle',922,886),point('right-aisle',1072,792)],
  edges:[['printing-press','left-aisle'],['drying-rack','left-aisle'],['left-aisle','paper-table'],
    ['paper-table','front-aisle'],['front-aisle','right-aisle'],['right-aisle','ink-station'],['right-aisle','storage']],
  characters:[
    {id:'atelier-man',gender:'man',start:'printing-press',preferences:['printing-press','printing-press','drying-rack','paper-table','storage'],height:325},
    {id:'atelier-woman',gender:'woman',start:'ink-station',preferences:['ink-station','ink-station','storage','paper-table','drying-rack'],height:281},
  ],
  foreground:atelierForeground,ambient:atelierAmbient,
}]
