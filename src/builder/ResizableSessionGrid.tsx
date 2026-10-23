import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {gridRows} from './employeeSpaces'
const KEY='openplex.grid-splits.v1'
type Splits=Record<string,number[]>
export function ResizableSessionGrid({counts,page,gesture,axis,expanded,children}:{counts:number[];page:number;axis:'horizontal'|'vertical';gesture:{x:number;dragging:boolean};expanded:boolean;children:ReactNode}){
 const grid=useRef<HTMLDivElement>(null)
 const count=counts[page]??0
 const [splits,setSplits]=useState<Splits>(()=>{try{const raw=JSON.parse(localStorage.getItem(KEY)??'{}');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}}catch{return {}}})
 const rows=gridRows(count),read=(key:string,n:number)=>{const values=splits[key];return Array.isArray(values)&&values.length===n&&values.every(v=>Number.isFinite(v)&&v>=.12)&&Math.abs(values.reduce((a,b)=>a+b,0)-1)<.01?values:Array(n).fill(1/n) as number[]}
 const heights=read('rows',rows.length),widths=rows.map((n,r)=>read(`${count}:${r}`,n))
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(splits))}catch{/* Layout remains adjustable without storage. */}},[splits])

 const resize=(key:string,values:number[],index:number,delta:number)=>{const next=[...values],change=Math.max(.16-values[index],Math.min(values[index+1]-.16,delta));next[index]+=change;next[index+1]-=change;setSplits(current=>({...current,[key]:next}))}
 const handle=(axis:'x'|'y',row:number,index:number,style:CSSProperties)=>{
  const values=axis==='x'?widths[row]:heights,key=axis==='x'?`${count}:${row}`:'rows'
  return <div key={`${axis}:${row}:${index}`} role="separator" tabIndex={0} aria-label={axis==='x'?`Resize row ${row+1} columns ${index+1} and ${index+2}`:'Resize panel rows'} aria-orientation={axis==='x'?'vertical':'horizontal'} aria-valuenow={Math.round(values[index]*100)} title="Drag to resize · Arrow keys adjust · Double-click to balance" className={`session-divider session-divider-${axis}`} style={style} onDoubleClick={()=>setSplits(current=>({...current,[key]:Array(values.length).fill(1/values.length)}))} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();resize(key,values,index,['ArrowLeft','ArrowUp'].includes(e.key)?-.03:.03)}}} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const target=e.currentTarget,start=axis==='x'?e.clientX:e.clientY,rect=grid.current!.getBoundingClientRect();const size=axis==='x'?rect.width:rect.height;const move=(event:PointerEvent)=>resize(key,values,index,((axis==='x'?event.clientX:event.clientY)-start)/size);const end=()=>{target.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end)};target.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true})}}/>
 }
 let y=0
 const dividers:ReactNode[]=[]
 rows.forEach((n,r)=>{let x=0;for(let c=0;c<n;c++){x+=widths[r][c];if(c<n-1)dividers.push(handle('x',r,c,{left:`calc(${((axis==='horizontal'?page:0)+x)*100}% - 6px)`,top:`${((axis==='vertical'?page:0)+y)*100}%`,height:`${heights[r]*100}%`}))}y+=heights[r];if(r<rows.length-1)dividers.push(handle('y',r,r,{top:`calc(${((axis==='vertical'?page:0)+y)*100}% - 6px)`,left:`${(axis==='horizontal'?page:0)*100}%`}))})
 const pageCells=counts.map((total,p)=>{const result:CSSProperties[]=[];let top=0;const heightsForPage=p===page?heights:read('rows',gridRows(total).length);gridRows(total).forEach((n,r)=>{let left=0;const widthsForRow=read(`${total}:${r}`,n);for(let c=0;c<n;c++){result.push({left:`calc(${left*100}% + ${c?6:0}px)`,top:`calc(${top*100}% + ${r?6:0}px)`,width:`calc(${widthsForRow[c]*100}% - ${(c?6:0)+(c<n-1?6:0)}px)`,height:`calc(${heightsForPage[r]*100}% - ${gridRows(total).length>1?6:0}px)`});left+=widthsForRow[c]}top+=heightsForPage[r]});return result})
 const variables={...Object.fromEntries(pageCells.flatMap((cells,p)=>cells.flatMap((cell,i)=>Object.entries(cell).map(([key,value])=>[`--page-${p}-cell-${i}-${key}`,value])))),transform:`translate${axis==='horizontal'?'X':'Y'}(calc(${-page*100}% + ${gesture.x}%))`,width:'100%',height:'100%',transition:gesture.dragging?'none':undefined,'--focus-left':`${axis==='horizontal'?page*100:0}%`,'--focus-top':`${axis==='vertical'?page*100:0}%`} as CSSProperties

 return <div ref={grid} className={`resizable-session-grid ${expanded?'session-grid-expanded':''}`} style={variables}>{children}{!expanded&&count>1&&dividers}</div>
}
