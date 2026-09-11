import { PortfolioNav } from '../components/portfolio/PortfolioNav'
import { GameCanvas } from './GameCanvas'
import { InteractionOverlay } from './InteractionOverlay'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <h1>DHAWAL.OS</h1>
      <PortfolioNav />
      <GameCanvas />
      <InteractionOverlay />
    </main>
  )
}

export default App
