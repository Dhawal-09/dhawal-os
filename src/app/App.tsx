import { useCallback, useReducer, useState } from 'react'
import { ErrorScreen } from '../components/error/ErrorScreen'
import { ExitControl } from '../components/game-menu/ExitControl'
import { LandingScreen } from '../components/landing/LandingScreen'
import { LoadingScreen } from '../components/loading/LoadingScreen'
import { PortfolioNav } from '../components/portfolio/PortfolioNav'
import {
  appLifecycleReducer,
  INITIAL_APP_LIFECYCLE_STATE,
  type AppLifecycleState,
} from './appLifecycle'
import { GameCanvas } from './GameCanvas'
import {
  clearGameSession,
  isGameSessionActive,
  markGameSessionActive,
} from './gameSession'
import { InteractionOverlay } from './InteractionOverlay'
import './App.css'

/**
 * Owns the small explicit application lifecycle (PHASE-08.5): LANDING ->
 * (START JOURNEY) -> LOADING -> GAME, with an ERROR branch that can retry
 * and an EXIT branch (GAME -> LANDING, PHASE-08.5 follow-up) once the
 * visitor confirms they want to leave. `GameCanvas` — the single Pixi
 * bootstrap path (PHASE-03/07/08) — is only ever mounted once the visitor
 * leaves LANDING, and stays mounted unchanged across the LOADING -> GAME
 * transition so `GameApp`/`GameScene` are created exactly once per game
 * session and never recreated by a re-render.
 *
 * A `sessionStorage` flag (see `gameSession.ts`) survives a page refresh
 * within the same browser tab/session (never permanently — that's the
 * point of `sessionStorage` over `localStorage`): if the visitor already
 * reached GAME, a refresh re-enters the JS runtime fresh (there is no
 * persisted GameApp — it cannot survive a reload) but skips LANDING and
 * goes straight into a brand-new LOADING -> GAME bootstrap, exactly one
 * new GameApp instance, same as any other LOADING entry.
 */
function App() {
  const [lifecycle, dispatch] = useReducer(
    appLifecycleReducer,
    undefined,
    (): AppLifecycleState =>
      isGameSessionActive() ? 'loading' : INITIAL_APP_LIFECYCLE_STATE,
  )
  // GameCanvas is already unmounted while lifecycle === 'error' or
  // 'landing' (see mountGameCanvas below), so a plain retry/re-entry
  // already gets a fresh mount — this key exists purely as an explicit,
  // future-proof guarantee that a retry or a post-EXIT re-entry can never
  // reuse a prior (failed/exited) GameApp attempt. Bumped only on retry
  // and on confirmed exit, never on any other lifecycle transition.
  const [sessionKey, setSessionKey] = useState(0)

  const handleStartJourney = useCallback(() => {
    dispatch({ type: 'START_JOURNEY' })
  }, [])

  const handleGameReady = useCallback(() => {
    // "Successfully enters the game" — deliberately not on START_JOURNEY,
    // so a refresh mid-LOADING (before the game has actually proven it
    // works) still lands back in LOADING to try again, not a false GAME.
    markGameSessionActive()
    dispatch({ type: 'GAME_READY' })
  }, [])

  const handleGameError = useCallback((error: unknown) => {
    console.error('Failed to initialize DHAWAL.OS.', error)
    dispatch({ type: 'GAME_ERROR' })
  }, [])

  const handleRetry = useCallback(() => {
    setSessionKey((key) => key + 1)
    dispatch({ type: 'RETRY' })
  }, [])

  const handleExitConfirmed = useCallback(() => {
    clearGameSession()
    setSessionKey((key) => key + 1)
    dispatch({ type: 'EXIT' })
  }, [])

  if (lifecycle === 'landing') {
    return <LandingScreen onStartJourney={handleStartJourney} />
  }

  // LOADING, GAME, and ERROR all share the same portfolio shell — the
  // conventional navigation and panel host work independently of whether
  // the Pixi world itself is loading, ready, or failed (ACCESSIBILITY.md
  // "a recruiter must be able to bypass exploration entirely").
  const mountGameCanvas = lifecycle === 'loading' || lifecycle === 'game'

  return (
    <main className="app-shell">
      <h1>DHAWAL.OS</h1>
      <PortfolioNav />
      {mountGameCanvas && (
        <GameCanvas
          key={sessionKey}
          onReady={handleGameReady}
          onError={handleGameError}
        />
      )}
      <InteractionOverlay />
      {lifecycle === 'loading' && <LoadingScreen />}
      {lifecycle === 'error' && <ErrorScreen onRetry={handleRetry} />}
      {lifecycle === 'game' && (
        <ExitControl onExitConfirmed={handleExitConfirmed} />
      )}
    </main>
  )
}

export default App
