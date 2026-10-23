import { RenderLayer } from '../../rendering/layers'
import type { RoomArtworkAssetId, RoomArtworkDefinition } from '../../types/roomArtwork'

const officeSilhouette = [
  { x: 0, y: 555 }, { x: 0, y: 462 }, { x: 14, y: 446 },
  { x: 14, y: 371 }, { x: 725, y: 14 }, { x: 1527, y: 413 },
  { x: 1535, y: 556 }, { x: 1490, y: 582 }, { x: 1516, y: 610 },
  { x: 1516, y: 695 }, { x: 1033, y: 980 }, { x: 1000, y: 959 },
  { x: 904, y: 1017 }, { x: 730, y: 902 }, { x: 598, y: 979 },
  { x: 0, y: 574 },
]

function campusArtwork(id: string, scale: number, silhouette: number[][], front: number[][]): RoomArtworkDefinition {
  const points = silhouette.map(([x,y]) => ({x,y}))
  return { base: {id: id+'-base', source: '/assets/rooms/'+id+'-contemporary.png', offset: {x:-768*scale,y:-330*scale},
    displayWidth:1536,displayHeight:1024,scale,clipPolygon:points},depthLayers:[],hitPolygon:points,
    frontEdge:front.map(([x,y])=>({x,y})) }
}

export const roomArtworkManifest: Record<RoomArtworkAssetId, RoomArtworkDefinition> = {
  'collaboration-suite': campusArtwork('collaboration-suite',0.58,
    [[52,576],[62,362],[123,325],[123,303],[704,18],[739,35],[768,23],[1480,400],[1486,680],[1088,889],[1018,839],[799,969],[789,960],[723,999],[359,766],[359,746],[52,597]],
    [[52,597],[359,766],[723,999],[799,969],[1018,839],[1088,889],[1486,680]]),
  'research-lab': campusArtwork('research-lab',0.7,
    [[12,616],[29,410],[804,16],[1524,393],[1525,650],[1285,770],[1239,734],[893,946],[745,834],[441,996],[81,731]],
    [[12,638],[441,996],[745,834],[893,946],[1239,734],[1285,770],[1525,650]]),
  'design-studio': campusArtwork('design-studio',0.65,
    [[25,548],[40,339],[685,10],[1493,393],[1520,639],[1424,692],[1451,720],[1089,949],[1038,919],[857,1023],[572,840],[494,872],[25,564]],
    [[25,564],[494,872],[572,840],[857,1023],[1038,919],[1089,949],[1451,720]]),
  'team-lounge': campusArtwork('team-lounge',0.6,
    [[20,566],[41,330],[91,303],[91,280],[614,15],[715,57],[748,45],[1132,243],[1132,218],[1497,382],[1518,611],[1388,678],[1431,704],[1222,835],[1138,783],[811,956],[708,883],[494,998],[47,660]],
    [[20,586],[47,660],[494,998],[708,883],[811,956],[1138,783],[1222,835],[1431,704]]),
  'connected-office': {
    base: {
      id: 'connected-office-base', source: '/assets/rooms/connected-office-contemporary.png',
      offset: { x: -768, y: -330 }, displayWidth: 1536, displayHeight: 1024,
      clipPolygon: officeSilhouette,
    },
    depthLayers: [], hitPolygon: officeSilhouette,
    frontEdge: [
      { x: 0, y: 574 }, { x: 598, y: 979 }, { x: 730, y: 902 },
      { x: 904, y: 1017 }, { x: 1000, y: 959 }, { x: 1033, y: 980 },
      { x: 1516, y: 695 },
    ],
  },
  'printmakers-atelier': {
    base: {
      id: 'printmakers-atelier-base', source: '/assets/rooms/printmakers-atelier.png',
      offset: { x: -768, y: -330 }, displayWidth: 1536, displayHeight: 1024,
      clipPolygon: [
        { x: 38, y: 339 }, { x: 760, y: 48 }, { x: 1497, y: 357 },
        { x: 1497, y: 716 }, { x: 738, y: 1015 }, { x: 38, y: 651 },
      ],
    },
    depthLayers: [],
    hitPolygon: [
      { x: 40, y: 341 }, { x: 760, y: 50 }, { x: 1495, y: 359 },
      { x: 1495, y: 714 }, { x: 738, y: 1013 }, { x: 40, y: 649 },
    ],
    frontEdge: [{ x: 40, y: 649 }, { x: 738, y: 1013 }, { x: 1495, y: 714 }],
  },
  'botanists-conservatory': {
    base: {
      id: 'botanists-conservatory-base', source: '/assets/rooms/botanists-conservatory.png',
      offset: { x: -768, y: -330 }, displayWidth: 1536, displayHeight: 1024,
      clipPolygon: [
        { x: 38, y: 329 }, { x: 57, y: 321 }, { x: 62, y: 308 },
        { x: 82, y: 300 }, { x: 96, y: 306 }, { x: 763, y: 40 },
        { x: 1497, y: 347 }, { x: 1497, y: 713 },
        { x: 750, y: 1011 }, { x: 38, y: 634 },
      ],
    },
    depthLayers: [],
    hitPolygon: [
      { x: 40, y: 331 }, { x: 763, y: 42 }, { x: 1495, y: 349 },
      { x: 1495, y: 711 }, { x: 750, y: 1009 }, { x: 40, y: 632 },
    ],
    frontEdge: [{ x: 40, y: 632 }, { x: 750, y: 1009 }, { x: 1495, y: 711 }],
  },
  'illustrated-workshop': {
    base: {
      id: 'illustrated-workshop-base', source: '/assets/rooms/technology-office.png',
      offset: { x: -768, y: -330 }, displayWidth: 1536, displayHeight: 1024,
      clipPolygon: [
        { x: 38, y: 364 }, { x: 763, y: 78 }, { x: 1497, y: 382 },
        { x: 1497, y: 713 }, { x: 753, y: 1011 }, { x: 38, y: 655 },
      ],
    },
    depthLayers: [],
    hitPolygon: [
      { x: 40, y: 366 }, { x: 763, y: 80 }, { x: 1495, y: 384 },
      { x: 1495, y: 711 }, { x: 753, y: 1009 }, { x: 40, y: 653 },
    ],
    frontEdge: [{ x: 40, y: 653 }, { x: 753, y: 1009 }, { x: 1495, y: 711 }],
  },
  'developer-office-placeholder': {
    base: {
      id: 'developer-office-base',
      source: '/assets/rooms/developer-office-placeholder-base.png',
      offset: { x: -280, y: -138 },
      displayWidth: 600,
      displayHeight: 438,
    },
    depthLayers: [
      {
        id: 'developer-office-desk',
        source: '/assets/rooms/developer-office-placeholder-desk.png',
        offset: { x: -280, y: -138 },
        displayWidth: 600,
        displayHeight: 438,
        depthAnchor: { x: 7.05, y: 2, z: 1.55 },
        layer: RenderLayer.Furniture,
      },
      {
        id: 'developer-office-chair',
        source: '/assets/rooms/developer-office-placeholder-chair.png',
        offset: { x: -280, y: -138 },
        displayWidth: 600,
        displayHeight: 438,
        depthAnchor: { x: 6.27, y: 3.75, z: 1.9 },
        layer: RenderLayer.Furniture,
      },
    ],
  },
}

export function getRoomArtwork(assetId: RoomArtworkAssetId): RoomArtworkDefinition {
  return roomArtworkManifest[assetId]
}
