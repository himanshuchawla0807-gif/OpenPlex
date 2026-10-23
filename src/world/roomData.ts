import type { Room, RoomTheme } from '../types/world'
import { developerOfficeAnchors } from './roomAnchors'

const developerTheme: RoomTheme = {
  id: 'developer',
  floorA: '#d8c6a5',
  floorB: '#cfb995',
  wallBack: '#315d63',
  wallSide: '#264c55',
  wallLower: '#1f424a',
  trim: '#efb760',
  accent: '#63c7bd',
  label: '#e9764f',
}

const creativeTheme: RoomTheme = {
  id: 'creative',
  floorA: '#e9cab8',
  floorB: '#dfbca8',
  wallBack: '#9e6260',
  wallSide: '#805354',
  wallLower: '#68464b',
  trim: '#f0c777',
  accent: '#87b7a3',
  label: '#55a38f',
}

const musicTheme: RoomTheme = {
  id: 'music',
  floorA: '#9da8b8',
  floorB: '#909bab',
  wallBack: '#343d62',
  wallSide: '#2b3456',
  wallLower: '#222b49',
  trim: '#d88677',
  accent: '#72c7cf',
  label: '#8775c8',
}

export const prototypeRooms: Room[] = [
  {
    id: 'developer-office',
    name: 'Developer Office',
    origin: { x: -10, y: -2 },
    width: 8,
    depth: 7,
    wallHeight: 3.45,
    theme: developerTheme,
    artwork: { assetId: 'developer-office-placeholder' },
    dynamicAnchors: developerOfficeAnchors,
    objects: [
      { id: 'dev-rug', kind: 'rug', position: { x: -7.2, y: 1.15 }, tint: '#4e837e', secondaryTint: '#e4a258' },
      { id: 'dev-wall-art', kind: 'wallArt', position: { x: -8.75, y: -1.96 }, z: 1.45, tint: '#e7c36d', secondaryTint: '#e56f52', variant: 'code' },
      { id: 'dev-cable-a', kind: 'cable', position: { x: -5.45, y: 0.4 }, tint: '#2b4d50', variant: 'curve-right' },
      { id: 'dev-cable-b', kind: 'cable', position: { x: -3.85, y: 0.85 }, tint: '#d66f50', variant: 'short' },
      {
        id: 'dev-desk', kind: 'desk', position: { x: -6.35, y: -1.25 }, tint: '#bc754f', secondaryTint: '#e0a365',
        sprite: { assetId: 'developer-desk', offset: { x: 1.7, y: 1.25, z: 0 } },
      },
      { id: 'dev-monitor-left', kind: 'monitor', position: { x: -5.95, y: -0.98 }, z: 1.72, tint: '#6bd5ca', variant: 'code' },
      { id: 'dev-monitor-right', kind: 'monitor', position: { x: -4.55, y: -0.98 }, z: 1.72, tint: '#7fcbe1', variant: 'graph' },
      { id: 'dev-keyboard', kind: 'keyboard', position: { x: -5.25, y: -0.15 }, z: 1.72, tint: '#d8c9ac' },
      { id: 'dev-mouse', kind: 'mouse', position: { x: -3.7, y: -0.1 }, z: 1.74, tint: '#e3b160' },
      {
        id: 'dev-lamp', kind: 'lamp', position: { x: -3.15, y: -0.95 }, z: 1.7, tint: '#edae54',
        sprite: { assetId: 'desk-lamp', offset: { x: 0.35, y: 0.35, z: 0 }, scale: 0.7 },
      },
      { id: 'dev-mug', kind: 'mug', position: { x: -3.45, y: -0.16 }, z: 1.72, tint: '#df7552' },
      { id: 'dev-computer', kind: 'computer', position: { x: -2.95, y: 0.7 }, tint: '#45666b' },
      {
        id: 'dev-chair', kind: 'chair', position: { x: -5.3, y: 0.75 }, tint: '#3f7774',
        sprite: { assetId: 'office-chair', offset: { x: 0.52, y: 0.95, z: 0 }, flipX: true },
      },
      {
        id: 'dev-plant', kind: 'plant', position: { x: -9.35, y: -1.3 }, tint: '#d77e51',
        sprite: { assetId: 'potted-plant', offset: { x: 0.41, y: 0.78, z: 0 } },
      },
      { id: 'dev-cabinet', kind: 'cabinet', position: { x: -9.35, y: 2.55 }, tint: '#c77755' },
      { id: 'dev-books', kind: 'books', position: { x: -9.18, y: 2.6 }, z: 1.74 },
      { id: 'dev-decor', kind: 'decor', position: { x: -8.2, y: 3.4 }, tint: '#efbb62', variant: 'box' },
    ],
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    origin: { x: 0, y: -7 },
    width: 8,
    depth: 7,
    wallHeight: 3.45,
    theme: creativeTheme,
    objects: [
      { id: 'creative-rug', kind: 'rug', position: { x: 2.3, y: -3.7 }, tint: '#d47f68', secondaryTint: '#eebc76' },
      { id: 'creative-canvas-a', kind: 'canvas', position: { x: 0.45, y: -6.82 }, tint: '#f1ca78', secondaryTint: '#58a596', variant: 'sun' },
      { id: 'creative-canvas-b', kind: 'canvas', position: { x: 6.35, y: -6.82 }, tint: '#79aaa1', secondaryTint: '#e17860', variant: 'blocks' },
      { id: 'creative-painting', kind: 'wallArt', position: { x: 3.15, y: -6.96 }, z: 1.55, tint: '#e8c67d', secondaryTint: '#5aa392', variant: 'abstract' },
      { id: 'creative-shelf', kind: 'shelf', position: { x: 5.15, y: -6.86 }, z: 1.38, tint: '#d48c62' },
      { id: 'creative-shelf-books', kind: 'books', position: { x: 5.55, y: -6.6 }, z: 1.52 },
      { id: 'creative-desk', kind: 'desk', position: { x: 2.1, y: -5.65 }, tint: '#c87b59', secondaryTint: '#e9aa73' },
      { id: 'creative-board', kind: 'drawingBoard', position: { x: 2.72, y: -5.35 }, z: 1.72, tint: '#f1dfbf', secondaryTint: '#e07259' },
      { id: 'creative-mug', kind: 'mug', position: { x: 4.95, y: -5.1 }, z: 1.72, tint: '#62a799' },
      { id: 'creative-chair', kind: 'chair', position: { x: 3.3, y: -3.95 }, tint: '#bf6e61' },
      { id: 'creative-cabinet', kind: 'cabinet', position: { x: 0.55, y: -2.15 }, tint: '#c5795c' },
      { id: 'creative-plant-a', kind: 'plant', position: { x: 0.72, y: -5.65 }, tint: '#d8845c' },
      { id: 'creative-plant-b', kind: 'plant', position: { x: 5.85, y: -2.15 }, tint: '#e0a260', variant: 'small' },
      { id: 'creative-floor-lamp', kind: 'floorLamp', position: { x: 6.65, y: -1.6 }, tint: '#efbc67' },
      { id: 'creative-decor-a', kind: 'decor', position: { x: 1.1, y: -1.45 }, tint: '#6aa89c', variant: 'vase' },
      { id: 'creative-decor-b', kind: 'decor', position: { x: 2.0, y: -1.1 }, tint: '#e7b765', variant: 'box' },
    ],
  },
  {
    id: 'music-studio',
    name: 'Music Studio',
    origin: { x: 0, y: 2 },
    width: 8,
    depth: 7,
    wallHeight: 3.45,
    theme: musicTheme,
    objects: [
      { id: 'music-rug', kind: 'rug', position: { x: 2.25, y: 5.3 }, tint: '#6b628d', secondaryTint: '#d38172' },
      { id: 'music-panel-a', kind: 'acousticPanel', position: { x: 0.75, y: 2.03 }, z: 1.48, tint: '#7f6eaa' },
      { id: 'music-panel-b', kind: 'acousticPanel', position: { x: 2.45, y: 2.03 }, z: 1.65, tint: '#c66f70' },
      { id: 'music-panel-c', kind: 'acousticPanel', position: { x: 5.75, y: 2.03 }, z: 1.5, tint: '#6c8fa5' },
      { id: 'music-shelf', kind: 'shelf', position: { x: 5.15, y: 2.02 }, z: 1.35, tint: '#b87362' },
      { id: 'music-cable-a', kind: 'cable', position: { x: 2.45, y: 4.4 }, tint: '#242c46', variant: 'curve-right' },
      { id: 'music-cable-b', kind: 'cable', position: { x: 5.15, y: 4.35 }, tint: '#65b9c0', variant: 'curve-left' },
      { id: 'music-desk', kind: 'desk', position: { x: 2.15, y: 3.0 }, tint: '#775d6d', secondaryTint: '#ad7468' },
      {
        id: 'music-computer', kind: 'computer', position: { x: 1.05, y: 4.2 }, tint: '#36445f',
        sprite: { assetId: 'desktop-computer', offset: { x: 0.33, y: 0.7, z: 0 }, animationOffsetMs: 240 },
      },
      { id: 'music-monitor', kind: 'monitor', position: { x: 3.55, y: 3.25 }, z: 1.72, tint: '#6fd2d5', variant: 'waveform' },
      { id: 'music-speaker-left', kind: 'speaker', position: { x: 2.45, y: 3.08 }, z: 1.7, tint: '#39445f' },
      { id: 'music-speaker-right', kind: 'speaker', position: { x: 5.2, y: 3.08 }, z: 1.7, tint: '#39445f' },
      { id: 'music-headphones', kind: 'headphones', position: { x: 5.9, y: 3.78 }, z: 1.74, tint: '#e08a75' },
      { id: 'music-synth', kind: 'synth', position: { x: 2.45, y: 4.05 }, z: 1.73, tint: '#d8d1c2' },
      { id: 'music-chair', kind: 'chair', position: { x: 3.6, y: 5.25 }, tint: '#535c7b' },
      { id: 'music-microphone', kind: 'microphone', position: { x: 6.45, y: 4.85 }, tint: '#d98a77' },
      { id: 'music-cabinet', kind: 'cabinet', position: { x: 0.5, y: 7.05 }, tint: '#655b75' },
      { id: 'music-books', kind: 'books', position: { x: 0.68, y: 7.08 }, z: 1.74 },
      { id: 'music-decor', kind: 'decor', position: { x: 6.7, y: 7.65 }, tint: '#73c0c5', variant: 'light' },
    ],
  },
]

export const rooms: Room[] = [{
  id: 'connected-office', name: 'The Everyday Office',
  origin: { x: 0, y: 0 }, width: 24, depth: 24, wallHeight: 6.25,
  theme: developerTheme,
  artwork: { assetId: 'connected-office' }, objects: [],
}, {
  id:'collaboration-suite', name:'The Collaboration Suite', origin:{x:-19.5,y:-2.5}, width:14,depth:14,wallHeight:6.25,
  theme:{...developerTheme,label:'#408681'},artwork:{assetId:'collaboration-suite'},objects:[],
}, {
  id:'research-lab', name:'AI Research & Prototyping Lab', origin:{x:-13.125,y:-24.375},width:17,depth:17,wallHeight:6.25,
  theme:{...developerTheme,label:'#5f7893'},artwork:{assetId:'research-lab'},objects:[],
}, {
  id:'design-studio',name:'Product & Design Studio',origin:{x:12,y:-16},width:16,depth:16,wallHeight:6.25,
  theme:{...developerTheme,label:'#c87e60'},artwork:{assetId:'design-studio'},objects:[],
}, {
  id:'team-lounge',name:'Team Lounge & Café',origin:{x:25.75,y:8.25},width:15,depth:15,wallHeight:6.25,
  theme:{...developerTheme,label:'#a28b4d'},artwork:{assetId:'team-lounge'},objects:[],
}]

export const archivedRooms: Room[] = [{
  id: 'illustrated-workshop', name: 'The technology office',
  origin: { x: 0, y: 0 }, width: 16.2, depth: 16.2, wallHeight: 6.25,
  theme: developerTheme,
  artwork: { assetId: 'illustrated-workshop' }, objects: [],
}, {
  id: 'botanists-conservatory', name: "The botanist's conservatory",
  // Silhouette-led stagger: 18% closer than the original, with the workbench fully visible.
  origin: { x: -3.5, y: -21.5 }, width: 16.2, depth: 16.2, wallHeight: 6.25,
  theme: { ...developerTheme, label: '#658b65', accent: '#829a66' },
  artwork: { assetId: 'botanists-conservatory' }, objects: [],
}, {
  id: 'printmakers-atelier', name: "The printmaker's atelier",
  // Right-hand stagger, registered at the same native artwork scale as the locked pair.
  origin: { x: 20.25, y: -17.25 }, width: 16.2, depth: 16.2, wallHeight: 6.25,
  theme: { ...developerTheme, label: '#ad7059', accent: '#c78667' },
  artwork: { assetId: 'printmakers-atelier' }, objects: [],
}]
