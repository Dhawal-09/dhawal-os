import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadPixelFont } from './game/text/pixelFont.ts'
import './styles/index.css'
import App from './app/App.tsx'

preloadPixelFont()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
