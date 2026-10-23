import {useEffect,useRef,useState} from 'react'
import {IllustratedTeam,teamCast} from '../procedural/IllustratedTeam'
import type {EmployeeState} from '../procedural/OfficePeople'
export function TeamAnimationLab({id}:{id:string}){
 const clock=useRef(0)
 const canvas=useRef<HTMLCanvasElement>(null),[pose,setPose]=useState<'work'|'walk'>('work'),[playing,setPlaying]=useState(true)
 useEffect(()=>{
  const team=new IllustratedTeam(),c=teamCast.find(c=>c.id===id)!,ctx=canvas.current?.getContext('2d');if(!ctx)return
  let frame=0,time=clock.current,last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
  function draw(now:number){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(playing&&!reduced)time+=dt;clock.current=time
   ctx!.clearRect(0,0,390,380);ctx!.save();ctx!.translate(170,345);ctx!.scale(2.7,2.7)
   ctx!.fillStyle='#51405015';ctx!.beginPath();ctx!.ellipse(10,0,28,4,0,0,Math.PI*2);ctx!.fill()
   if(pose==='work'){ctx!.strokeStyle='#526170';ctx!.lineWidth=3;ctx!.beginPath();ctx!.moveTo(-14,-40);ctx!.lineTo(-14,-5);ctx!.lineTo(-28,0);ctx!.moveTo(-14,-5);ctx!.lineTo(0,0);ctx!.stroke();ctx!.fillStyle='#4a5c70';ctx!.fillRect(-28,-46,29,5)}
   team.draw(ctx!,{index:c.index,i:0,j:0,mode:pose,facing:1} as EmployeeState,time,reduced,1)
   if(pose==='work')team.draw(ctx!,{index:c.index,i:0,j:0,mode:pose,facing:1} as EmployeeState,time,reduced,1,true)
   ctx!.restore();canvas.current?.setAttribute('data-team-motion',JSON.stringify({id,pose,time,playing}));frame=requestAnimationFrame(draw)
  }
  frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);team.dispose()}
 },[id,pose,playing])
 return <div className="animation-lab team-animation-lab"><canvas ref={canvas} width="390" height="380" aria-label={`${id} illustrated ${pose} animation`}/><div className="rig-poses"><button aria-pressed={pose==='work'} onClick={()=>setPose('work')}>Typing</button><button aria-pressed={pose==='walk'} onClick={()=>setPose('walk')}>Walk study</button><button onClick={()=>setPlaying(v=>!v)}>{playing?'Pause':'Play'}</button></div><p className="rig-status">Illustrated pose pilot · registered frames</p></div>
}
