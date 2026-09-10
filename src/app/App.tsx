import { GameCanvas } from './GameCanvas'
import { InteractionOverlay } from './InteractionOverlay'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <h1>DHAWAL.OS</h1>
      <GameCanvas />
      <InteractionOverlay />
    </main>
  )
}

export default App
