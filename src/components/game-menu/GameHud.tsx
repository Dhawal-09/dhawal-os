import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from '../../game/world/cameraConstants'
import { PortfolioNav } from '../portfolio/PortfolioNav'
import { ExitControl } from './ExitControl'
import './GameHud.css'
import { SoundToggle } from './SoundToggle'
import { ViewToggle } from './ViewToggle'

export interface GameHudProps {
  /** Present only while lifecycle === 'game' — EXIT has no meaning during LOADING/ERROR. */
  onExitConfirmed?: () => void
  /**
   * Present only while lifecycle === 'game' — the camera selector only
   * makes sense once the world is live. App owns the mode.
   */
  cameraView?: {
    mode: CameraMode
    onChange: (mode: CameraMode) => void
  }
}

/**
 * The persistent top HUD for the GAME view (PHASE 09 "Game HUD"), visually
 * continuous with `LandingScreen`'s header (same brand styling/tokens) so
 * landing and game read as the same product rather than a webpage
 * suddenly appearing around a centered canvas. A real, normal-flow flex
 * row — not an overlay — so the Pixi canvas below it (`flex: 1` in
 * `App.css`) gets the entire remaining viewport instead of being centered
 * inside a boxed page.
 *
 * "menu" is a disclosure toggle for the *existing* `PortfolioNav` (reused
 * unchanged) — not a new navigation system (PHASE 09 "Do NOT build the
 * complete game menu in this phase").
 */
export function GameHud({ onExitConfirmed, cameraView }: GameHudProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <header className="game-hud">
      <div className="game-hud-bar">
        <h1 className="game-hud-brand">DHAWAL.OS</h1>
        <div className="game-hud-actions">
          <SoundToggle />
          {cameraView && (
            <ViewToggle mode={cameraView.mode} onChange={cameraView.onChange} />
          )}
          <button
            ref={menuButtonRef}
            type="button"
            className="game-hud-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="game-hud-menu-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          {onExitConfirmed && <ExitControl onExitConfirmed={onExitConfirmed} />}
        </div>
      </div>
      {menuOpen && (
        <div id="game-hud-menu-panel" className="game-hud-menu-panel">
          <PortfolioNav />
        </div>
      )}
    </header>
  )
}
