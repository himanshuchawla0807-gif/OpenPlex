import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useMemo,
} from 'react'
import { Camera } from '../camera/Camera'
import { fitCameraToRooms } from '../camera/fitCamera'
import { canvasToWorld, findTopRoomAtPoint } from '../engine/interaction'
import { ProceduralRenderer } from '../procedural/ProceduralRenderer'
import type { CameraState, Point, Size } from '../types/geometry'
import { rooms as presetRooms } from '../procedural/campus'
import {officeDefinitions} from '../procedural/officeRooms'
import type {OfficeDefinition} from '../procedural/model'
import type {Room} from '../types/world'
import {clampZoom,pinchFactor,wheelGesture} from '../camera/gestures.ts'

export interface DioramaCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  focusRoom: (roomId:string) => void
}

interface DioramaCanvasProps {
  definitions?:OfficeDefinition[]
  staff?:Record<string,number[]>
  editable?:boolean
  onRoomMove?:(id:string,origin:{x:number;y:number})=>void
  onRoomHover?:(id:string|null)=>void
  onRoomAdd?:(id:string)=>void
  onCharacterSelect?: (id:string,anchor:Point) => void
  transparentBackground?:boolean
  paused?: boolean
  onZoomChange: (zoom: number) => void
  onRoomSelect: (roomId: string | null) => void
}

interface InteractionState {
  pointerId: number | null
  lastPointer: Point
  dragDistance: number
  dragging: boolean
  hoveredRoomId: string | null
  selectedRoomId: string | null
}

export const DioramaCanvas = forwardRef<DioramaCanvasHandle, DioramaCanvasProps>(
  function DioramaCanvas({ onZoomChange, onRoomSelect, onCharacterSelect, transparentBackground=false, paused=false, definitions=officeDefinitions,staff,editable=false,onRoomMove,onRoomHover }, ref) {
    const rooms=useMemo<Room[]>(()=>definitions===officeDefinitions?presetRooms:definitions.map(d=>({...presetRooms[0],id:d.id,name:d.name,origin:d.origin,width:d.width,depth:d.depth,wallHeight:d.wallHeight})),[definitions])


    const moveRef=useRef(onRoomMove);useEffect(()=>{moveRef.current=onRoomMove},[onRoomMove])
    const hoverRef=useRef(onRoomHover);useEffect(()=>{hoverRef.current=onRoomHover},[onRoomHover])
    const roomDrag=useRef<{id:string;origin:Point;start:Point}|null>(null)
    const characterSelectRef=useRef(onCharacterSelect)
    useEffect(()=>{characterSelectRef.current=onCharacterSelect},[onCharacterSelect])
    const rendererRef=useRef<ProceduralRenderer|null>(null)
    const pausedRef=useRef(paused)
    useEffect(()=>{pausedRef.current=paused},[paused])
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const onZoomChangeRef = useRef(onZoomChange)
    const cameraRef = useRef(new Camera(fitCameraToRooms({ width: 1200, height: 700 }, rooms.slice(0,1))))
    const viewportRef = useRef<Size>({ width: 1, height: 1 })
    const cameraWasMovedRef = useRef(false)
    const zoomTargetRef=useRef<{zoom:number;point:Point}|null>(null)
    const recordingTween=useRef<{from:CameraState;to:CameraState;start:number;duration:number;lift:number}|null>(null)
    const pointersRef=useRef(new Map<number,Point>())
    const pinchRef=useRef<{distance:number;center:Point}|null>(null)
    const interactionRef = useRef<InteractionState>({
      pointerId: null,
      lastPointer: { x: 0, y: 0 },
      dragDistance: 0,
      dragging: false,
      hoveredRoomId: null,
      selectedRoomId: rooms[0]?.id??null,
    })

    useEffect(() => {
      onZoomChangeRef.current = onZoomChange
    }, [onZoomChange])

    const setZoom = (nextZoom:number,point?:Point)=>{
      cameraWasMovedRef.current=true
      const viewport=viewportRef.current
      zoomTargetRef.current={zoom:clampZoom(nextZoom),point:point??{x:viewport.width/2,y:viewport.height/2}}
    }

    useImperativeHandle(ref, () => ({
      focusRoom: (roomId:string) => {
        const room=rooms.find(r=>r.id===roomId)
        if(!room)return
        cameraWasMovedRef.current=true
        zoomTargetRef.current=null
        cameraRef.current.reset(fitCameraToRooms(viewportRef.current,[room]))
        interactionRef.current.selectedRoomId=roomId
        onRoomSelect(roomId);onZoomChange(cameraRef.current.value.zoom)
      },
      zoomIn: () => setZoom((zoomTargetRef.current?.zoom??cameraRef.current.value.zoom) * 1.24),
      zoomOut: () => setZoom((zoomTargetRef.current?.zoom??cameraRef.current.value.zoom) / 1.24),
      resetView: () => {
        cameraWasMovedRef.current = true
        zoomTargetRef.current=null
        const initial = fitCameraToRooms(viewportRef.current, rooms)
        cameraRef.current.reset(initial)
        onZoomChange(initial.zoom)
        interactionRef.current.selectedRoomId=null;onRoomSelect(null)
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d', { alpha: true })
      if (!context) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const renderer = new ProceduralRenderer(context,pixelRatio,definitions,staff,transparentBackground)
      rendererRef.current=renderer
      const recoverSurfaces=(event:Event)=>{event.preventDefault();renderer.resetSurfaces()}
      canvas.addEventListener('contextlost',recoverSurfaces)
      canvas.addEventListener('contextrestored',recoverSurfaces)
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
      // Explicit preview opt-in leaves the OS accessibility preference untouched.
      const fullMotion = new URLSearchParams(window.location.search).get('motion') === 'full'
      let lastFrame = 0
      let lastReport = 0
      let lastZoomReport=0
      let animationFrame = 0
      let mounted = true
      const frameIntervals:number[]=[],renderCosts:number[]=[]
      let moveStats:{mode:string;start:number;last:number;intervals:number[];costs:number[];builds:number}|null=null
      let measuredTimestamp=0
      const seek=(event:Event)=>{const d=(event as CustomEvent<{world:number;bruno:number;play?:boolean}>).detail;if(!d)return;renderer.seekReview(d.world,d.bruno);if(d.play)renderer.resumeReview();lastReport=-Infinity}
      if(new URLSearchParams(location.search).has('review'))window.addEventListener('office-review-seek',seek)
      const recordingCamera=(event:Event)=>{
        if(!import.meta.env.DEV||!new URLSearchParams(location.search).has('recording'))return
        const {room,mode}=(event as CustomEvent<{room?:string;mode?:string}>).detail??{}
        const targets=room?rooms.filter(r=>r.id===room):rooms
        if(!targets.length)return
        moveStats={mode:mode??'reference',start:performance.now(),last:0,intervals:[],costs:[],builds:renderer.backgroundRebuilds}
        const to=fitCameraToRooms(viewportRef.current,targets),from={...cameraRef.current.value}
        cameraWasMovedRef.current=true;zoomTargetRef.current=null
        const distance=Math.hypot(to.x/to.zoom-from.x/from.zoom,to.y/to.zoom-from.y/from.zoom)
        recordingTween.current={from,to,start:performance.now(),duration:motionPreference.matches&&!fullMotion?0:mode==='cinematic'?1500:room?3400:1100,lift:mode==='cinematic'?.08:Math.min(.35,distance/6000)}
      }
      window.addEventListener('openplex-recording-camera',recordingCamera)

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        viewportRef.current = { width: rect.width, height: rect.height }
        const width=Math.max(1,Math.round(rect.width*pixelRatio)),height=Math.max(1,Math.round(rect.height*pixelRatio))
        if(canvas.width!==width)canvas.width=width
        if(canvas.height!==height)canvas.height=height
        if (!cameraWasMovedRef.current) {
          const initial = fitCameraToRooms(viewportRef.current, rooms)
          cameraRef.current.reset(initial)
          onZoomChangeRef.current(initial.zoom)
        }
        // Resizing clears the backing store; repaint synchronously before WebKit presents it.
        renderer.render(viewportRef.current,cameraRef.current,motionPreference.matches&&!fullMotion,interactionRef.current.hoveredRoomId,interactionRef.current.selectedRoomId)
      }

      const wheel=(event:WheelEvent)=>{
        recordingTween.current=null
        event.preventDefault()
        const rect=canvas.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top}
        const gesture=wheelGesture(event.deltaX,event.deltaY,event.deltaMode,event.ctrlKey,rect.height)
        cameraWasMovedRef.current=true
        if(gesture.kind==='zoom')zoomTargetRef.current={zoom:clampZoom((zoomTargetRef.current?.zoom??cameraRef.current.value.zoom)*gesture.factor),point}
        else {zoomTargetRef.current=null;cameraRef.current.pan(gesture.x,gesture.y)}
      }
      canvas.addEventListener('wheel',wheel,{passive:false})
      // WebKit sends native trackpad pinches as gesture events rather than Ctrl+wheel.
      let gestureStartZoom=cameraRef.current.value.zoom
      const gestureStart=(event:Event)=>{event.preventDefault();gestureStartZoom=cameraRef.current.value.zoom;zoomTargetRef.current=null;cameraWasMovedRef.current=true}
      const gestureChange=(event:Event)=>{
        event.preventDefault()
        const gesture=event as Event&{scale:number;clientX?:number;clientY?:number}
        if(!Number.isFinite(gesture.scale)||gesture.scale<=0)return
        const rect=canvas.getBoundingClientRect()
        const point={x:gesture.clientX===undefined?rect.width/2:gesture.clientX-rect.left,y:gesture.clientY===undefined?rect.height/2:gesture.clientY-rect.top}
        cameraRef.current.zoomAt(clampZoom(gestureStartZoom*Math.pow(gesture.scale,1.12)),point,viewportRef.current)
        onZoomChangeRef.current(cameraRef.current.value.zoom)
      }
      const gestureEnd=(event:Event)=>event.preventDefault()
      canvas.addEventListener('gesturestart',gestureStart,{passive:false})
      canvas.addEventListener('gesturechange',gestureChange,{passive:false})
      canvas.addEventListener('gestureend',gestureEnd,{passive:false})
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()

      const renderFrame = (timestamp: number) => {
        if (!mounted) return
        animationFrame = requestAnimationFrame(renderFrame)
        if (document.hidden||pausedRef.current) { lastFrame = timestamp; measuredTimestamp=0; return }
        const renderStarted=performance.now()
        const delta = lastFrame ? Math.min(0.05, (timestamp - lastFrame) / 1000) : 0
        lastFrame = timestamp
        const tween=recordingTween.current
        if(tween){
          const u=tween.duration?Math.min(1,(timestamp-tween.start)/tween.duration):1
          const e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2
          const z=(tween.from.zoom+(tween.to.zoom-tween.from.zoom)*e)*(1-Math.sin(u*Math.PI)*tween.lift)
          const x=tween.from.x/tween.from.zoom+(tween.to.x/tween.to.zoom-tween.from.x/tween.from.zoom)*e
          const y=tween.from.y/tween.from.zoom+(tween.to.y/tween.to.zoom-tween.from.y/tween.from.zoom)*e
          cameraRef.current.reset({x:x*z,y:y*z,zoom:z})
          if(timestamp-lastZoomReport>100||u===1){lastZoomReport=timestamp;onZoomChangeRef.current(z)}
          if(u===1)recordingTween.current=null
        }
        const zoomTarget=zoomTargetRef.current
        if(zoomTarget) {
          const current=cameraRef.current.value.zoom
          const next=current+(zoomTarget.zoom-current)*(1-Math.exp(-Math.max(delta,1/120)*28))
          const complete=Math.abs(zoomTarget.zoom-next)<0.0003
          cameraRef.current.zoomAt(complete?zoomTarget.zoom:next,zoomTarget.point,viewportRef.current)
          onZoomChangeRef.current(cameraRef.current.value.zoom)
          if(complete)zoomTargetRef.current=null
        }
        const reducedMotion = motionPreference.matches && !fullMotion
        renderer.update(delta,reducedMotion)
        const interaction = interactionRef.current
        renderer.render(viewportRef.current,cameraRef.current,reducedMotion,interaction.hoveredRoomId,interaction.selectedRoomId)
        if(moveStats){
          if(moveStats.last)moveStats.intervals.push(timestamp-moveStats.last)
          moveStats.last=timestamp;moveStats.costs.push(performance.now()-renderStarted)
          if(!recordingTween.current){
            const sorted=[...moveStats.intervals].sort((a,b)=>a-b),costs=[...moveStats.costs].sort((a,b)=>a-b),round=(n:number)=>Math.round(n*100)/100
            canvas.dataset.cameraMove=JSON.stringify({mode:moveStats.mode,frames:sorted.length,fps:sorted.length?round(1000*sorted.length/moveStats.intervals.reduce((a,b)=>a+b,0)):0,p95FrameMs:round(sorted[Math.floor(sorted.length*.95)]??0),maxFrameMs:round(sorted.at(-1)??0),p95RenderMs:round(costs[Math.floor(costs.length*.95)]??0),backgroundRebuilds:renderer.backgroundRebuilds-moveStats.builds,elapsedMs:round(performance.now()-moveStats.start),viewport:viewportRef.current,dpr:pixelRatio})
            moveStats=null
          }
        }
        if(renderer.ready) {
          if(measuredTimestamp) {
            const interval=timestamp-measuredTimestamp
            if(interval<250){frameIntervals.push(interval);renderCosts.push(performance.now()-renderStarted)}
          }
          measuredTimestamp=timestamp
          if(frameIntervals.length>240){frameIntervals.shift();renderCosts.shift()}
        }
        // Read-only, low-frequency diagnostics for long-run verification; no React animation state.
        if (timestamp - lastReport > 1000) {
          lastReport = timestamp
          const sortedIntervals=[...frameIntervals].sort((a,b)=>a-b),sortedCosts=[...renderCosts].sort((a,b)=>a-b)
          const percentile=(values:number[],p:number)=>Math.round((values[Math.floor((values.length-1)*p)]??0)*100)/100
          const fps=frameIntervals.length?Math.round(1000*frameIntervals.length/frameIntervals.reduce((sum,n)=>sum+n,0)):0
          canvas.dataset.office = JSON.stringify({
            bruno:{...renderer.bruno.state(renderer.brunoTime,reducedMotion),bounds:renderer.bruno.bounds},ready:renderer.ready,error:renderer.error,time:Math.round(renderer.people.time),worldTime:renderer.people.time,reviewTime:renderer.brunoTime,
            camera:{...cameraRef.current.value},
            performance:{fps,p95FrameMs:percentile(sortedIntervals,.95),p95RenderMs:percentile(sortedCosts,.95),sampleFrames:frameIntervals.length,framesOver25ms:frameIntervals.filter(n=>n>25).length,backgroundRebuilds:renderer.backgroundRebuilds,cacheMB:Math.round(renderer.cacheBytes/1048576*10)/10,rig:'registered-sprites',roomRenderer:'procedural',textureVariants:1},
            animation:{renderer:'registered-sprites',ready:renderer.ready},
            rooms:renderer.people.definitions.map(def=>({id:def.id,stations:def.stations.length,objects:def.furniture.length})),
            actors:renderer.people.actors.map(({id,index,roomId,mode,i,j,facing,trips,activity,taskName,destination,taskProgress,settle,taskKind})=>({id,index,roomId,state:mode,i,j,facing,trips,activity,taskName,destination,taskProgress,settle,taskKind})),
          })
        }
      }
      animationFrame = requestAnimationFrame(renderFrame)

      return () => {
        mounted = false
        canvas.removeEventListener('contextlost',recoverSurfaces)
        canvas.removeEventListener('contextrestored',recoverSurfaces)
        window.removeEventListener('office-review-seek',seek)
        window.removeEventListener('openplex-recording-camera',recordingCamera)
        renderer.dispose();rendererRef.current=null
        canvas.removeEventListener('wheel',wheel)
        canvas.removeEventListener('gesturestart',gestureStart)
        canvas.removeEventListener('gesturechange',gestureChange)
        canvas.removeEventListener('gestureend',gestureEnd)
        observer.disconnect()
        cancelAnimationFrame(animationFrame)
      }
    }, [definitions,staff,rooms,transparentBackground])

    const getCanvasPoint = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ): Point => {
      const rect = event.currentTarget.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const updateHover = (point: Point) => {
      const view=viewportRef.current,camera=cameraRef.current.value,renderer=rendererRef.current
      const character=renderer?.hitCharacter({x:(point.x-view.width/2-camera.x)/camera.zoom,y:(point.y-view.height/2-camera.y)/camera.zoom})??null
      renderer?.hoverCharacter(character);canvasRef.current?.classList.toggle('is-hovering-person',Boolean(character))
      const world = canvasToWorld(point, viewportRef.current, cameraRef.current)
      const room = findTopRoomAtPoint(world, rooms)
      interactionRef.current.hoveredRoomId = room?.id ?? null;hoverRef.current?.(room?.id??null)
    }

    const currentPinch=()=>{
      const [a,b]=[...pointersRef.current.values()]
      return a&&b?{distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}:null
    }
    const handlePointerDown=(event:React.PointerEvent<HTMLCanvasElement>)=>{
      recordingTween.current=null
      if(event.pointerType==='mouse'&&event.button!==0)return
      const point=getCanvasPoint(event),interaction=interactionRef.current
      cameraWasMovedRef.current=true;zoomTargetRef.current=null
      const floor=canvasToWorld(point,viewportRef.current,cameraRef.current),hit=findTopRoomAtPoint(floor,rooms)
      const c=cameraRef.current.value,v=viewportRef.current,person=rendererRef.current?.hitCharacter({x:(point.x-v.width/2-c.x)/c.zoom,y:(point.y-v.height/2-c.y)/c.zoom})
      roomDrag.current=editable&&hit&&!person?{id:hit.id,origin:{...hit.origin},start:floor}:null
      event.currentTarget.setPointerCapture(event.pointerId)
      pointersRef.current.set(event.pointerId,point)
      pinchRef.current=currentPinch()
      interaction.pointerId=event.pointerId;interaction.lastPointer=point
      interaction.dragDistance=pinchRef.current?Infinity:0;interaction.dragging=!pinchRef.current
      event.currentTarget.classList.add('is-dragging')
    }
    const handlePointerMove=(event:React.PointerEvent<HTMLCanvasElement>)=>{
      const point=getCanvasPoint(event),interaction=interactionRef.current
      if(pointersRef.current.has(event.pointerId))pointersRef.current.set(event.pointerId,point)
      const pinch=currentPinch()
      if(pinch&&pinchRef.current) {
        const previous=pinchRef.current
        cameraRef.current.pan(pinch.center.x-previous.center.x,pinch.center.y-previous.center.y)
        cameraRef.current.zoomAt(cameraRef.current.value.zoom*pinchFactor(previous.distance,pinch.distance),pinch.center,viewportRef.current)
        onZoomChangeRef.current(cameraRef.current.value.zoom)
        pinchRef.current=pinch;interaction.dragDistance=Infinity
      } else if(interaction.dragging&&interaction.pointerId===event.pointerId) {
        const dx=point.x-interaction.lastPointer.x,dy=point.y-interaction.lastPointer.y
        if(roomDrag.current){const world=canvasToWorld(point,viewportRef.current,cameraRef.current),drag=roomDrag.current,def=definitions.find(d=>d.id===drag.id)!,room=rooms.find(r=>r.id===drag.id)!;const origin={x:drag.origin.x+world.x-drag.start.x,y:drag.origin.y+world.y-drag.start.y};def.origin=origin;room.origin=origin;rendererRef.current?.resetSurfaces()}else cameraRef.current.pan(dx,dy);interaction.dragDistance+=Math.hypot(dx,dy);interaction.lastPointer=point
      } else updateHover(point)
    }
    const endPointer=(event:React.PointerEvent<HTMLCanvasElement>)=>{
      const point=getCanvasPoint(event),interaction=interactionRef.current
      if(event.type!=='pointercancel'&&!pinchRef.current&&interaction.dragging&&interaction.dragDistance<5) {
        const world=canvasToWorld(point,viewportRef.current,cameraRef.current)
        const view=viewportRef.current,camera=cameraRef.current.value
        const projected={x:(point.x-view.width/2-camera.x)/camera.zoom,y:(point.y-view.height/2-camera.y)/camera.zoom}
        const character=rendererRef.current?.hitCharacter(projected)
        if(character)characterSelectRef.current?.(character,point)
        const room=findTopRoomAtPoint(world,rooms)
        interaction.selectedRoomId=room?.id??null;onRoomSelect(room?.id??null)
      }
      if(roomDrag.current){const drag=roomDrag.current,origin=definitions.find(d=>d.id===drag.id)?.origin;roomDrag.current=null;if(origin)moveRef.current?.(drag.id,{...origin})}
      pointersRef.current.delete(event.pointerId);pinchRef.current=currentPinch()
      const remaining=[...pointersRef.current.entries()][0]
      interaction.dragging=Boolean(remaining)&&!pinchRef.current
      interaction.pointerId=remaining?.[0]??null
      if(remaining){interaction.lastPointer=remaining[1];interaction.dragDistance=Infinity}
      else event.currentTarget.classList.remove('is-dragging')
      if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
      updateHover(point)
    }

    return (
      <> <canvas
        ref={canvasRef}
        className="diorama-canvas"
        role="img"
        aria-label="Office campus. Drag or scroll to pan; pinch to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(event) => {
          if (!interactionRef.current.dragging) {
            interactionRef.current.hoveredRoomId = null
            rendererRef.current?.hoverCharacter(null);event.currentTarget.classList.remove('is-hovering-person')
            event.currentTarget.classList.remove('is-hovering')
          }
        }}
      /></>
    )
  },
)
