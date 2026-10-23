import {useEffect,useRef,useState} from 'react'
import {CampusPeople} from '../procedural/CampusPeople'
import {campusCast} from '../data/campusCast'
export type CampusPreviewPose='standing'|'walking'|'seated'|'desk'
// One asset cache serves the selected preview and all forty static wardrobe cards.
let sharedPeople:CampusPeople|undefined
function people(){return sharedPeople??=(new CampusPeople())}
export function CampusCharacterPreview({index,thumbnail=false,portrait=false}:{index:number;thumbnail?:boolean;portrait?:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),clock=useRef(0)
  const [pose,setPose]=useState<CampusPreviewPose>(portrait?'standing':'desk'),[playing,setPlaying]=useState(true)
  const character=campusCast[index]
  useEffect(()=>{
    const element=canvas.current,ctx=element?.getContext('2d');if(!ctx||!element)return
    const renderer=people(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame=0,last=0,active=true
    const width=thumbnail?240:390,height=thumbnail?300:380
    function draw(now:number){
      if(!active)return
      if(last&&playing&&!thumbnail&&!reduced)clock.current+=Math.min(.05,(now-last)/1000)
      last=now;ctx!.clearRect(0,0,width,height)
      ctx!.save();ctx!.translate(width*.47,height*.91);const scale=thumbnail?2.25:2.8;ctx!.scale(scale,scale)
      ctx!.fillStyle='#51405015';ctx!.beginPath();ctx!.ellipse(4,0,25,4,0,0,Math.PI*2);ctx!.fill()
      renderer.drawPreview(ctx!,index,thumbnail?'standing':pose,clock.current,reduced,1)
      ctx!.restore()
      element!.dataset.campusPreview=JSON.stringify({id:character.id,index,pose:thumbnail?'standing':pose,time:clock.current})
      if(!thumbnail||!renderer.ready)frame=requestAnimationFrame(draw)
    }
    frame=requestAnimationFrame(draw)
    return()=>{active=false;cancelAnimationFrame(frame)}
  },[index,thumbnail,pose,playing,character.id])
  return <div className={thumbnail?'campus-preview-thumb':portrait?'campus-preview-portrait':'animation-lab campus-animation-lab'}>
    <canvas ref={canvas} width={thumbnail?240:390} height={thumbnail?300:380} aria-label={`${character.name} ${thumbnail?'standing wardrobe':pose+' animation'} preview`}/>
    {!thumbnail&&!portrait&&<><div className="rig-poses">{(['standing','walking','seated','desk'] as const).map(value=><button key={value} aria-pressed={pose===value} onClick={()=>setPose(value)}>{value==='desk'?'At desk':value[0].toUpperCase()+value.slice(1)}</button>)}<button aria-pressed={!playing} onClick={()=>setPlaying(value=>!value)}>{playing?'Pause':'Play'}</button></div><p className="rig-status">{character.name} · {character.outfit.split(' · ')[0]}</p></>}
  </div>
}
