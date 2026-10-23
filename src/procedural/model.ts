export interface Vec { x: number; y: number }
export interface Furniture {
  id: string; kind: string; i: number; j: number; w: number; d: number;
  z?: number; height?: number; color?: string; orientation?: 'east' | 'south'; reverse?: boolean; singleSided?:boolean;
}
/** Floor-level foot anchor. Seats are .85 world units above this point;
 * work surfaces are 1.30 units high. +1 faces +i, -1 faces -i. */
export interface Station {
  id: string; i: number; j: number; facing: 1 | -1;
  surface: 'desk' | 'lap'; role?: string; furnitureId?:string; reverse?:boolean;
}
export interface OfficeDefinition {
  id: string; name: string; templateId?:string; origin: Vec; width: number; depth: number;
  wallHeight: number; floor: string; wall: string; accent: string;
  furniture: Furniture[]; stations: Station[];
  walkPath: { i: number; j: number }[];
}
export function project(i: number, j: number, z = 0): Vec {
  return { x: (i - j) * 40, y: (i + j) * 20 - z * 40 };
}
