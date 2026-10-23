import {useEffect,useRef,useState} from 'react'
import {CampusCharacterPreview} from './CampusCharacterPreview'
import {illustratedCast} from '../data/illustratedCast'
import {campusWardrobes,catalogOrder} from '../data/campusCast'

export function CharacterGallery({onClose,initialArtwork=false,initialCharacter='bruno'}:{onClose:()=>void;initialArtwork?:boolean;initialCharacter?:string}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const [selected,setSelected]=useState(Math.max(0,illustratedCast.findIndex(c=>c.id===initialCharacter)))
  const [filter,setFilter]=useState('All colleagues'),[query,setQuery]=useState('')
  const [motion,setMotion]=useState(!initialArtwork),[detail,setDetail]=useState(false)
  const character=illustratedCast[selected]
  const visible=catalogOrder.map(i=>illustratedCast[i]).filter(c=>(filter==='All colleagues'||c.source===filter)&&`${c.name} ${c.title} ${c.outfit} ${c.specialties.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(()=>{dialog.current?.showModal()},[])
  function choose(index:number){setSelected(index);setDetail(false)}
  return <dialog ref={dialog} className="character-gallery cast-gallery" onCancel={onClose} onClose={onClose} aria-labelledby="cast-title">
    <header className="gallery-header"><div><p className="cast-eyebrow">MEET YOUR COLLEAGUES</p><h1 id="cast-title">A wonderfully odd team. <span>{illustratedCast.length} colleagues</span></h1><p>Forty distinct colleagues, from quietly thoughtful to wonderfully eccentric.</p></div><button onClick={onClose} autoFocus aria-label="Close character gallery">Close ×</button></header>
    <div className="cast-tools"><div className="cast-filters" aria-label="Character collection">{['All colleagues','Original wardrobe','Distinct illustrated character'].map(value=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{value==='Distinct illustrated character'?'New colleagues':value==='Original wardrobe'?'Original eight':value}</button>)}</div><input type="search" aria-label="Search characters" placeholder="Find a name or speciality…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="gallery-content">
      <div><div className="character-grid" aria-label="Forty named colleagues">{visible.map(c=>{const index=illustratedCast.indexOf(c),wardrobe=campusWardrobes[c.variant];return <button key={c.id} className="character-card cast-card" aria-pressed={selected===index} onClick={()=>choose(index)}>
        <div className="cast-thumb"><CampusCharacterPreview index={index} thumbnail/></div>
        <span className="character-number">{String(index+1).padStart(2,'0')}</span><strong>{c.name}</strong><span>{c.title}</span><span className="wardrobe-label"><i style={{background:wardrobe.colour}} aria-hidden="true"/>{wardrobe.name}</span>
      </button>})}</div>{visible.length===0&&<p className="cast-empty" role="status">No colleagues found. Try another name or speciality.</p>}</div>
      <aside className="character-inspector cast-inspector" aria-label="Selected character">
        <p className="cast-eyebrow">{String(selected+1).padStart(2,'0')} / {illustratedCast.length} · {character.source}</p><h2>{character.name}</h2><p className="cast-title">{character.title}</p>
        <div className="rig-views"><button aria-pressed={motion} onClick={()=>setMotion(true)}>Motion & wardrobe</button><button aria-pressed={!motion} onClick={()=>setMotion(false)}>Base artwork</button></div>
        {motion?<CampusCharacterPreview key={character.id} index={selected}/>:<><div className={`cast-hero ${detail?'is-detail':''}`}><img key={character.baseId} src={character.image} alt={`${character.baseId} base illustration used for ${character.name}`}/></div><button className="detail-toggle" aria-pressed={detail} onClick={()=>setDetail(value=>!value)}>{detail?'Full character ↙':'Inspect the artwork ↗'}</button><p className="rig-status">Original {character.baseId} illustration · wardrobe colours appear in the motion view.</p></>}
        <p className="cast-outfit">{character.outfit}</p><p>{character.description}</p><div className="cast-tags">{character.specialties.map(tag=><span key={tag}>{tag}</span>)}</div>
        <div className="cast-pagination"><button onClick={()=>choose((selected+illustratedCast.length-1)%illustratedCast.length)} aria-label="Previous character">←</button><span>Meet the whole team</span><button onClick={()=>choose((selected+1)%illustratedCast.length)} aria-label="Next character">→</button></div>
        <a className="cast-download" href={character.image} download={`${character.baseId}-base.png`}>Download base transparent PNG ↓</a>
        <small>Clothing palettes vary by colleague. Original skin tones, hair and facial details are preserved.</small>
      </aside>
    </div>
  </dialog>
}
