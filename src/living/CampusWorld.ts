import {campusProfiles,makeCampusConfig} from '../world/campusData.ts'
import {OfficeSimulation} from './OfficeSimulation.ts'

export const CAMPUS_STEP=1/120
export class CampusWorld {
  readonly simulations:Map<string,OfficeSimulation>
  constructor(random:()=>number=Math.random){this.simulations=new Map(campusProfiles.map(profile=>[profile.id,new OfficeSimulation(random,makeCampusConfig(profile))]))}
  private accumulator=0
  update(delta:number):void {
    if(!Number.isFinite(delta)||delta<=0)return
    this.accumulator+=Math.min(delta,0.1)
    while(this.accumulator>=CAMPUS_STEP){
      for(const simulation of this.simulations.values())simulation.update(CAMPUS_STEP)
      this.accumulator-=CAMPUS_STEP
    }
    for(const simulation of this.simulations.values())simulation.renderAlpha=this.accumulator/CAMPUS_STEP
  }
  get actors(){return [...this.simulations].flatMap(([roomId,world])=>world.actors.map(actor=>({...actor,roomId})))}
}
