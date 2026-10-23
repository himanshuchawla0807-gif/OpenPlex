import {useRef,useState} from 'react'
import {DioramaCanvas,type DioramaCanvasHandle} from './components/DioramaCanvas'
import {CharacterGallery} from './components/CharacterGallery'
import {Toolbar} from './components/Toolbar'
import {rooms} from './procedural/campus'
import './App.css'
import {illustratedCast} from './data/illustratedCast'

function App(){
  const [galleryOpen,setGalleryOpen]=useState(false)
  const [showOriginal,setShowOriginal]=useState(false)
  const [characterId,setCharacterId]=useState('bruno')
  const canvasRef=useRef<DioramaCanvasHandle>(null)
  const [zoom,setZoom]=useState(0.86)
  const [selectedRoom,setSelectedRoom]=useState<string|null>(null)
  return <main className="app-shell">
    <section className="workspace" aria-label="Office campus">
      <nav className="room-navigation" aria-label="Rooms">
        {rooms.map((room,index)=><button key={room.id} type="button" aria-pressed={selectedRoom===room.id}
          onClick={()=>canvasRef.current?.focusRoom(room.id)}><span>{String(index+1).padStart(2,'0')}</span>{room.name}</button>)}
        <button className="wardrobe-button" onClick={()=>{setShowOriginal(false);setGalleryOpen(true)}}>Characters <span>{illustratedCast.length}</span></button>
      </nav>
      <div className="canvas-frame">
        <DioramaCanvas onCharacterSelect={(id)=>{setCharacterId(id);setShowOriginal(true);setGalleryOpen(true)}} paused={galleryOpen} ref={canvasRef} onZoomChange={setZoom} onRoomSelect={setSelectedRoom}/>
        <Toolbar zoom={zoom} onZoomIn={()=>canvasRef.current?.zoomIn()} onZoomOut={()=>canvasRef.current?.zoomOut()} onReset={()=>canvasRef.current?.resetView()}/>
      </div>
    </section>
    {galleryOpen&&<CharacterGallery initialCharacter={characterId} initialArtwork={showOriginal} onClose={()=>setGalleryOpen(false)}/>}
  </main>
}
export default App
