import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './builder/appearance'
import './builder/dark-appearance.css'
import App from './App.tsx'
import BuilderApp from './builder/BuilderApp'
const recording=import.meta.env.DEV&&new URLSearchParams(location.search).has('recording')
if(recording){
  const {seedRecordingProject}=await import('./builder/recordingProject')
  seedRecordingProject(localStorage)
  // Optional local-only native bridge; never bundled into a release.
  try{const bridgePath='/output/recording-bridge.js';await import(/* @vite-ignore */ bridgePath)}catch{console.info('Recording preview: run npm run recording for live harness connections.')}
}
const Root=recording||location.port==='5180'||new URLSearchParams(location.search).has('builder')?BuilderApp:App
const RecordingControls=recording?(await import('./builder/RecordingControls')).RecordingControls:()=>null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <RecordingControls />
  </StrictMode>,
)
