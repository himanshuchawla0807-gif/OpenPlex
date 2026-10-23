import {useState} from 'react'
import {harnessInfo} from './harnesses'
export function HarnessLogo({id}:{id:string}){const h=harnessInfo(id),[missing,setMissing]=useState(false);return <span className="harness-logo" data-provider={id} aria-hidden="true">{missing?h.name.slice(0,1):<img src={h.logo} alt="" onError={()=>setMissing(true)}/>}</span>}
