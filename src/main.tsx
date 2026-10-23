import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './builder/appearance'
import './builder/dark-appearance.css'
import App from './App.tsx'
import BuilderApp from './builder/BuilderApp'
const Root=location.port==='5180'||new URLSearchParams(location.search).has('builder')?BuilderApp:App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
