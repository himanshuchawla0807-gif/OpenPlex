import type { Point } from '../types/geometry'

export interface TeamMember {
  id: string; name: string; gender: 'woman' | 'man'; age: number
  outfit: string; row: number; home: string; height: number; senior: boolean
}
export interface OfficeSpot extends Point { id: string; kind: 'aisle' | 'seat' | 'task' | 'chat' | 'briefing'; facing?: number }
const spot = (id: string, x: number, y: number, kind: OfficeSpot['kind'] = 'aisle', facing = 1): OfficeSpot => ({ id, x, y, kind, facing })

// Plate-pixel anchors, transformed by the same isometric room origin and camera as the artwork.
export const officeSpots: OfficeSpot[] = [
  spot('west', 444, 398), spot('north-west', 553, 325), spot('north', 824, 303),
  spot('north-east', 906, 355), spot('east-top', 854, 413),
  spot('middle-left', 545, 587), spot('middle', 702, 509), spot('middle-right', 834, 444),
  spot('west-bottom', 596, 653), spot('south-left', 691, 745),
  spot('south-middle', 855, 656), spot('south-right', 1010, 567),
  spot('east', 1157, 578), spot('east-bottom', 1243, 727),
  spot('front-east', 1128, 839), spot('front', 960, 916), spot('front-west', 818, 845),
  spot('desk-1', 609, 538, 'seat'), spot('desk-2', 696, 476, 'seat'), spot('desk-3', 760, 463, 'seat'),
  spot('desk-4', 747, 650, 'seat'), spot('desk-5', 834, 601, 'seat'), spot('desk-6', 934, 581, 'seat'),
  spot('desk-7', 1327, 640, 'seat'), spot('desk-8', 1404, 679, 'seat'),
  spot('desk-9', 304, 648, 'seat', -1), spot('desk-10', 376, 666, 'seat'),
  spot('table-aisle', 435, 685),
  spot('coffee', 807, 279, 'task'), spot('books', 565, 306, 'task'),
  spot('window', 407, 365, 'task'), spot('whiteboard', 1020, 617, 'task', -1),
  spot('collaborative-table', 405, 616, 'task'),
  spot('chat-a', 864, 306, 'chat', -1), spot('chat-b', 907, 329, 'chat'), spot('chat-c', 864, 350, 'chat', -1),
  spot('leader', 874, 283, 'briefing', -1),
  ...Array.from({ length: 4 }, (_, i) => spot(`line-${i}`, 780 + i * 40, 333 + i * 20, 'briefing')),
]
export const officeEdges: [string, string][] = [
  ['west', 'north-west'], ['north-west', 'north'], ['north', 'north-east'], ['north-east', 'east-top'],
  ['west', 'middle-left'], ['middle-left', 'middle'], ['middle', 'middle-right'], ['middle-right', 'east-top'],
  ['middle-left', 'west-bottom'], ['west-bottom', 'south-left'], ['south-left', 'south-middle'],
  ['south-middle', 'south-right'], ['east-top', 'south-right'], ['south-right', 'east'],
  ['east', 'east-bottom'], ['east-bottom', 'front-east'], ['front-east', 'front'],
  ['front', 'front-west'], ['front-west', 'south-left'],
  ['middle-left', 'desk-1'], ['middle', 'desk-2'], ['middle-right', 'desk-3'],
  ['south-left', 'desk-4'], ['south-middle', 'desk-5'], ['south-right', 'desk-6'],
  ['east-bottom', 'desk-7'], ['east-bottom', 'desk-8'],
  ['west-bottom', 'table-aisle'], ['table-aisle', 'desk-9'], ['table-aisle', 'desk-10'],
  ['north', 'coffee'], ['north-west', 'books'], ['west', 'window'], ['south-right', 'whiteboard'],
  ['north', 'chat-a'], ['north-east', 'chat-b'], ['north', 'leader'],
  ...Array.from({ length: 4 }, (_, i): [string, string] => [i < 2 ? 'north' : 'north-east', `line-${i}`]),
]

export const officeTeam: TeamMember[] = [
  { id: 'anika', name: 'Anika', gender: 'woman', age: 38, outfit: 'White formal shirt, charcoal trousers, black shoes', row: 0, home: 'desk-1', height: 83, senior: true },
  { id: 'maya', name: 'Maya', gender: 'woman', age: 34, outfit: 'Coral blouse, navy formal trousers, loafers', row: 1, home: 'desk-2', height: 82, senior: true },
  { id: 'riya', name: 'Riya', gender: 'woman', age: 24, outfit: 'Oversized sage tee, wide beige pants, sneakers', row: 2, home: 'desk-3', height: 80, senior: false },
  { id: 'tara', name: 'Tara', gender: 'woman', age: 25, outfit: 'Oversized lilac tee, wide navy pants, sneakers', row: 3, home: 'desk-4', height: 80, senior: false },
  { id: 'leah', name: 'Leah', gender: 'woman', age: 31, outfit: 'Mustard blouse, tailored grey trousers, formal shoes', row: 4, home: 'desk-5', height: 82, senior: true },
  { id: 'arjun', name: 'Arjun · team lead', gender: 'man', age: 40, outfit: 'Pale blue formal shirt, navy trousers, black shoes', row: 5, home: 'desk-6', height: 87, senior: true },
  { id: 'daniel', name: 'Daniel', gender: 'man', age: 35, outfit: 'White formal shirt, grey trousers, brown shoes', row: 6, home: 'desk-7', height: 86, senior: true },
  { id: 'kabir', name: 'Kabir', gender: 'man', age: 23, outfit: 'Oversized coral tee, wide charcoal pants, sneakers', row: 7, home: 'desk-8', height: 84, senior: false },
  { id: 'leo', name: 'Leo', gender: 'man', age: 25, outfit: 'Oversized mustard tee, wide sage pants, sneakers', row: 8, home: 'desk-9', height: 84, senior: false },
  { id: 'sam', name: 'Sam', gender: 'man', age: 32, outfit: 'Sage formal shirt, charcoal trousers, loafers', row: 9, home: 'desk-10', height: 85, senior: true },
]

// Narrow raster cutouts restore furniture in front of a person; the underlying PNG never changes.
export const officeOccluders = [
  { slope: -0.45, intercept: 750, polygon: [[484,466],[789,338],[813,358],[815,386],[520,516],[486,496]] },
  { slope: -0.45, intercept: 953, polygon: [[644,584],[949,452],[980,482],[979,511],[678,648],[645,622]] },
  { slope: 0.41, intercept: 43, polygon: [[1280,543],[1495,632],[1494,650],[1279,568]] },
  { slope: -0.57, intercept: 809, polygon: [[272,579],[337,548],[395,583],[329,621]] },
  { slope: 0.5, intercept: 470, polygon: [[649,784],[674,763],[798,827],[798,858],[769,890],[650,822]] },
] as const

// Authored atlas boundaries: generation includes outer gutters, so equal-width splitting would cut limbs.
export const atlasColumns = [164, 271, 413, 557, 702, 835, 950]
export const atlasRows = [0, 149, 289, 435, 580, 730, 885, 1036, 1181, 1325, 1448]
