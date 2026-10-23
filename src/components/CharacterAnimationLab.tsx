import {useEffect,useId,useRef,useState} from 'react'
import {deskAtlas,deskContacts,idleArtwork,sampleBrunoSprite,walkAtlas,walkFrames,type BrunoPose} from '../characters/brunoSprite'

/** Raster artwork inside an SVG compositor: fixed furniture + registered interaction patches. */
export function CharacterAnimationLab(){
  const id=useId().replace(/:/g,'')
  const [pose,setPose]=useState<BrunoPose>('type'),[playing,setPlaying]=useState(true),[contacts,setContacts]=useState(false),[facing,setFacing]=useState(1),[speed,setSpeed]=useState(1),[expanded,setExpanded]=useState(false),[scrub,setScrub]=useState(0),[failed,setFailed]=useState(false)
  const svg=useRef<SVGSVGElement>(null),hands=useRef<SVGImageElement>(null),eyes=useRef<SVGGElement>(null),walker=useRef<SVGSVGElement>(null),clock=useRef(0)
  const current=useRef({pose,playing,speed,scrub})
  useEffect(()=>{current.current={pose,playing,speed,scrub};clock.current=scrub},[pose,playing,speed,scrub])
  useEffect(()=>{
    let frame=0,last=0
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    function render(now:number){
      const delta=last?Math.min((now-last)/1000,.05):0;last=now
      const s=current.current;if(s.playing&&!reduced)clock.current+=delta*s.speed
      const state=sampleBrunoSprite(clock.current,s.pose),cell=deskAtlas.cell,hand=state.handFrame
      hands.current?.setAttribute('x',String(-(hand%2)*cell));hands.current?.setAttribute('y',String(-Math.floor(hand/2)*cell))
      eyes.current?.setAttribute('opacity',state.blink?'1':'0')
      const w=walkFrames[state.walkFrame]
      const width=w.w/w.h*570
      walker.current?.setAttribute('viewBox',`${w.x} ${w.y} ${w.w} ${w.h}`)
      walker.current?.setAttribute('x',String(313-width/2));walker.current?.setAttribute('width',String(width))
      svg.current?.setAttribute('data-playback',JSON.stringify({ready:!failed,pose:s.pose,time:Number(clock.current.toFixed(3)),frame:state.walkFrame,handFrame:hand,blink:state.blink,playing:s.playing,construction:'registered-artwork',furnitureFrame:0,contacts:deskContacts}))
      frame=requestAnimationFrame(render)
    }
    frame=requestAnimationFrame(render);return()=>cancelAnimationFrame(frame)
  },[failed])
  const desk=pose==='type'||pose==='sit'
  return <div className={`animation-lab artwork-lab ${expanded?'is-expanded':''}`}>
    <div className="artwork-lab-heading"><span>BRUNO / ARTWORK PROTOTYPE</span><button onClick={()=>setExpanded(v=>!v)}>{expanded?'Close large view ×':'Enlarge ↗'}</button></div>
    <svg ref={svg} viewBox="0 0 627 640" role="img" aria-label={`Bruno ${pose==='type'?'typing at his desk':pose==='sit'?'seated at his desk':pose==='walk'?'walk cycle study':'original standing artwork'}`}>
      <defs>
        <clipPath id={`${id}-cell`}><rect width="627" height="627"/></clipPath>
        <clipPath id={`${id}-walk`}><rect x="0" y="0" width="627" height="627"/></clipPath>
        <filter id={`${id}-feather`}><feGaussianBlur stdDeviation="2"/></filter>
        <mask id={`${id}-hands`} maskUnits="userSpaceOnUse" x="325" y="249" width="151" height="59"><rect x="330" y="254" width="141" height="49" fill="white" filter={`url(#${id}-feather)`}/></mask>
        <mask id={`${id}-eyes`} maskUnits="userSpaceOnUse" x="263" y="62" width="67" height="46"><rect x="268" y="67" width="57" height="36" rx="8" fill="white" filter={`url(#${id}-feather)`}/></mask>
      </defs>
      <ellipse cx="316" cy="610" rx={desk?258:174} ry="13" fill="#534151" opacity=".08"/>
      <g transform={facing<0?'translate(627 0) scale(-1 1)':undefined}>
        {desk?<g clipPath={`url(#${id}-cell)`}>
          <image href={deskAtlas.url} width="1254" height="1254" onError={()=>setFailed(true)}/>
          {pose==='type'&&<image ref={hands} href={deskAtlas.url} width="1254" height="1254" x="-627" mask={`url(#${id}-hands)`}/>}
          <g ref={eyes} opacity="0" mask={`url(#${id}-eyes)`}><image href={deskAtlas.url} width="1254" height="1254" y="-627"/></g>
          {contacts&&<g className="contact-markers">{Object.entries(deskContacts).map(([name,p])=><g key={name}><circle cx={p[0]} cy={p[1]} r="6"/><text x={p[0]+10} y={p[1]-9}>{name}</text></g>)}</g>}
        </g>:pose==='walk'?<g clipPath={`url(#${id}-walk)`}><svg ref={walker} x="100" y="37" width="427" height="570" viewBox="91 16 310 422" overflow="hidden"><image href={walkAtlas.url} width={walkAtlas.width} height={walkAtlas.height} onError={()=>setFailed(true)}/></svg></g>:<image href={idleArtwork} x="0" y="0" width="627" height="627" onError={()=>setFailed(true)}/>}
      </g>
      {failed&&<text x="313" y="320" textAnchor="middle">Artwork could not load. Please reload.</text>}
    </svg>
    <div className="rig-poses">{(['idle','walk','sit','type'] as const).map(value=><button key={value} aria-pressed={pose===value} onClick={()=>{setPose(value);setScrub(0)}}>{({idle:'Standing',walk:'Walk study',sit:'Desk idle',type:'Typing'})[value]}</button>)}</div>
    <div className="rig-controls"><button onClick={()=>setPlaying(v=>!v)}>{playing?'Pause':'Play'}</button><button aria-pressed={contacts} onClick={()=>setContacts(v=>!v)}>Contacts</button><button onClick={()=>setFacing(v=>-v)}>Turn ↔</button><label>Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div>
    <label className="rig-scrub">Inspect the cycle <input aria-label="Animation timeline" type="range" min="0" max="4.8" step=".02" value={scrub} onChange={e=>{setPlaying(false);setScrub(Number(e.target.value))}}/></label>
    <p className="rig-status" role="status">{pose==='walk'?'4 distinct walk key poses · registered floor contact':pose==='idle'?'Original illustration · unchanged artwork':'Registered artwork layers · fixed chair and keyboard'}</p>
  </div>
}
