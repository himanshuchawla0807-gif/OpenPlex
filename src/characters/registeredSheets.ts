// Fixed source-pixel scale: never enlarge a cropped pose to a target height.
import type {SpriteRect} from "./motionSheets"
export type IllustratedId="bruno"|"oscar"|"cleo"|"gus"
export const registeredSheets:Record<IllustratedId,{url:string;pixelScale:number;frames:SpriteRect[]}>={
 "bruno": {
  "url": "/characters/motion-v4/bruno.png",
  "pixelScale": 0.1629032258064516,
  "frames": [
   {
    "x": 6,
    "y": 143,
    "w": 271,
    "h": 509
   },
   {
    "x": 280,
    "y": 143,
    "w": 269,
    "h": 509
   },
   {
    "x": 551,
    "y": 138,
    "w": 261,
    "h": 515
   },
   {
    "x": 814,
    "y": 191,
    "w": 261,
    "h": 462
   },
   {
    "x": 11,
    "y": 807,
    "w": 264,
    "h": 535
   },
   {
    "x": 276,
    "y": 748,
    "w": 268,
    "h": 594
   },
   {
    "x": 546,
    "y": 724,
    "w": 270,
    "h": 620
   },
   {
    "x": 817,
    "y": 854,
    "w": 260,
    "h": 495
   }
  ]
 },
 "oscar": {
  "url": "/characters/motion-v4/oscar.png",
  "pixelScale": 0.21428571428571427,
  "frames": [
   {
    "x": 123,
    "y": 52,
    "w": 219,
    "h": 433
   },
   {
    "x": 483,
    "y": 54,
    "w": 226,
    "h": 432
   },
   {
    "x": 841,
    "y": 52,
    "w": 222,
    "h": 433
   },
   {
    "x": 1197,
    "y": 89,
    "w": 207,
    "h": 397
   },
   {
    "x": 128,
    "y": 583,
    "w": 199,
    "h": 446
   },
   {
    "x": 486,
    "y": 544,
    "w": 187,
    "h": 490
   },
   {
    "x": 861,
    "y": 545,
    "w": 146,
    "h": 490
   },
   {
    "x": 1199,
    "y": 544,
    "w": 214,
    "h": 491
   }
  ]
 },
 "cleo": {
  "url": "/characters/motion-v4/cleo.png",
  "pixelScale": 0.16228748068006182,
  "frames": [
   {
    "x": 30,
    "y": 189,
    "w": 246,
    "h": 534
   },
   {
    "x": 313,
    "y": 188,
    "w": 243,
    "h": 533
   },
   {
    "x": 586,
    "y": 187,
    "w": 240,
    "h": 535
   },
   {
    "x": 846,
    "y": 204,
    "w": 215,
    "h": 518
   },
   {
    "x": 30,
    "y": 827,
    "w": 232,
    "h": 572
   },
   {
    "x": 296,
    "y": 764,
    "w": 237,
    "h": 636
   },
   {
    "x": 550,
    "y": 754,
    "w": 271,
    "h": 647
   },
   {
    "x": 851,
    "y": 764,
    "w": 223,
    "h": 639
   }
  ]
 },
 "gus": {
  "url": "/characters/motion-v4/gus.png",
  "pixelScale": 0.19839679358717435,
  "frames": [
   {
    "x": 40,
    "y": 74,
    "w": 318,
    "h": 414
   },
   {
    "x": 400,
    "y": 74,
    "w": 320,
    "h": 414
   },
   {
    "x": 758,
    "y": 75,
    "w": 320,
    "h": 413
   },
   {
    "x": 1127,
    "y": 85,
    "w": 292,
    "h": 401
   },
   {
    "x": 50,
    "y": 574,
    "w": 300,
    "h": 450
   },
   {
    "x": 416,
    "y": 556,
    "w": 281,
    "h": 470
   },
   {
    "x": 752,
    "y": 528,
    "w": 306,
    "h": 499
   },
   {
    "x": 1127,
    "y": 539,
    "w": 291,
    "h": 490
   }
  ]
 }
}
export const registeredRiseFrame=(rise:number)=>2+Math.round(Math.max(0,Math.min(1,rise))*4)
