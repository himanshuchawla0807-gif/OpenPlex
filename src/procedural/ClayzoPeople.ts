import {checkCoverage,createPlayer,type PlayerFrameStats,type PlayerHandle} from '@clayzo/webgl-player'
import {CELL,CHARACTER_COUNT,CHARACTER_DURATION,createCharacterDocument,selectCharacterModes,type CharacterMode} from './characters.ts'

/** One GPU context for all people; the canvas contains only live vector geometry. */
export class ClayzoPeople {
  canvas=document.createElement('canvas')
  readonly document=createCharacterDocument()
  player:PlayerHandle|null=null
  ready=false
  error:string|null=null
  coverage:readonly string[]=[]
  frameStats:PlayerFrameStats|null=null
  private modes:(CharacterMode|null)[]=Array(CHARACTER_COUNT).fill(null)
  private columns=new Map<number,number>()
  private poseColumns(modes:readonly (CharacterMode|null)[]){return new Map(modes.flatMap((mode,index)=>mode===null?[]:[index]).map((index,column)=>[index,column]))}
  private desiredModes:(CharacterMode|null)[]=[...this.modes]
  private configuring=false
  private currentTick=0
  private seeking=false
  private disposed=false
  private lastTick=-1
  private resolution=2
  constructor(initialVisible:readonly number[]=Array.from({length:CHARACTER_COUNT},(_,k)=>k),initialMode:CharacterMode='work',resolution=2) {
    this.resolution=resolution
    for(const index of initialVisible)this.modes[index]=initialMode
    this.desiredModes=[...this.modes]
    this.columns=this.poseColumns(this.modes)
    this.canvas.width=CELL*Math.max(1,this.columns.size)*2;this.canvas.height=CELL*2
    void this.initialize()
  }
  private async initialize() {
    try {
      const activeDocument=selectCharacterModes(this.document,this.modes,true)
      const coverage=await checkCoverage(activeDocument)
      this.coverage=coverage.reasons
      if(!coverage.supported)throw new Error('Clayzo character coverage: '+coverage.reasons.join(', '))
      const player=await createPlayer({canvas:this.canvas,document:activeDocument,resolution:Math.min(this.resolution,8192/(CELL*Math.max(1,this.columns.size))),interactive:false,pauseWhenOffscreen:false,loop:true,onFrame:stats=>{this.frameStats=stats},onError:error=>{this.error=error.message}})
      if(this.disposed){player.dispose();return}
      this.player=player
      await player.seek(0)
      this.ready=true
    } catch(error) {this.error=String(error);console.error('Office motion:',error)}
  }
  update(time:number,reduced=false,actors:readonly {index:number;mode:'walk'|'work'|'idle';station?:{reverse?:boolean}}[]=[],visible?:ReadonlySet<number>) {
    const wanted:(CharacterMode|null)[]=visible?Array(CHARACTER_COUNT).fill(null):[...this.desiredModes]
    for(const actor of actors)if(!visible||visible.has(actor.index))wanted[actor.index]=actor.mode==='work'&&actor.station?.reverse?'work-reverse':actor.mode
    this.desiredModes=wanted
    if(this.ready&&!this.configuring&&wanted.some((mode,k)=>mode!==this.modes[k]))void this.configure(wanted)

    const tick=reduced?0:Math.floor(time*240)%CHARACTER_DURATION
    this.currentTick=tick
    if(!this.player||this.seeking||this.lastTick===tick)return
    this.seeking=true;this.lastTick=tick
    void this.player.seek(tick).catch(error=>{this.error=String(error)}).finally(()=>{this.seeking=false})
  }
  private async configure(modes:(CharacterMode|null)[]) {
    this.configuring=true
    let next:PlayerHandle|null=null
    try {
      const canvas=document.createElement('canvas')
      next=await createPlayer({canvas,document:selectCharacterModes(this.document,modes,true),resolution:Math.min(this.resolution,8192/(CELL*Math.max(1,modes.filter(Boolean).length))),interactive:false,pauseWhenOffscreen:false,loop:true,onFrame:stats=>{this.frameStats=stats},onError:error=>{this.error=error.message}})
      await next.seek(this.currentTick)
      if(this.disposed){next.dispose();return}
      const previous=this.player
      this.player=next;this.canvas=canvas;this.modes=modes;this.columns=this.poseColumns(modes);this.lastTick=-1
      previous?.dispose()
    }catch(error){next?.dispose();this.error=String(error)}finally{this.configuring=false}
  }
  hasCharacter(index:number,mode:CharacterMode):boolean{return this.ready&&this.modes[index]===mode&&this.columns.has(index)}
  draw(ctx:CanvasRenderingContext2D,index:number,x:number,y:number,mode:'walk'|'work'|'idle',facing:number,settle=1) {
    if(!this.ready||this.modes[index]===null)return
    const column=this.columns.get(index)
    if(column===undefined)return
    const sx=this.canvas.width/(CELL*Math.max(1,this.columns.size)),sy=this.canvas.height/CELL
    ctx.save();ctx.translate(x,y);ctx.scale(facing*.9,.9)
    if(mode==='idle'&&settle<1) {
      ctx.beginPath();ctx.rect(-64,-128,128,130);ctx.clip()
      const u=Math.max(0,Math.min(1,settle)),smooth=u*u*(3-2*u)
      ctx.translate(0,16*(1-smooth))
    }
    // A seated figure settles continuously down onto the chair cushion.
    if(mode==='work')ctx.translate(0,-(1-settle)*5)
    ctx.drawImage(this.canvas,column*CELL*sx,0,CELL*sx,CELL*sy,-64,-118,CELL,CELL)
    ctx.restore()
  }
  drawWorkSurface(ctx:CanvasRenderingContext2D,index:number,x:number,y:number,facing:number,reverse=false) {
    // Repaint only arms/palms over the tabletop; thighs and torso retain their
    // proper furniture occlusion. The caller clips to the actual worktop polygon.
    ctx.save();ctx.beginPath();ctx.rect(x+(facing>0?10:-48),y-(reverse?85:58),38,30);ctx.clip()
    this.draw(ctx,index,x,y,'work',facing);ctx.restore()
  }
  dispose(){this.disposed=true;this.player?.dispose()}
}
