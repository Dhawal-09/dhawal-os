import { useCallback, useEffect, useReducer, useState } from 'react'
import { AccessPanel } from '../components/access-ui/AccessPanel'
import { ErrorScreen } from '../components/error/ErrorScreen'
import { GameHud } from '../components/game-menu/GameHud'
import { LandingScreen } from '../components/landing/LandingScreen'
import { BootScreen } from '../components/loading/BootScreen'
import { audioManager } from '../game/audio/AudioManager'
import { authManager } from '../game/auth/AuthManager'
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
 * Owns the small explicit application lifecycle (PHASE-08.5, extended by the
 * DHAWAL.OS boot + guest-access flow): LANDING -> (START JOURNEY) -> LOADING
 * -> ACCESS -> GAME, with an ERROR branch that can retry and an EXIT branch
 * (GAME -> LANDING) once the visitor confirms they want to leave.
 * `GameCanvas` — the single Pixi bootstrap path — mounts once the visitor
 * leaves LANDING and stays mounted unchanged through LOADING -> ACCESS ->
 * GAME, so `GameApp`/`GameScene` are created exactly once per game session;
 * the world is fully loaded and running *behind* the BootScreen/AccessPanel
 * overlays, which is what lets ACCESS complete instantly once the guest
 * clicks ACCESS SYSTEM (PixiJS never even knows authentication exists — see
 * ARCHITECTURE.md).
 *
 * A `sessionStorage` flag (`gameSession.ts`) survives a page refresh within
 * the same browser tab/session: if the visitor already reached GAME, a
 * refresh skips LANDING and goes straight into a brand-new LOADING -> GAME
 * bootstrap. `AuthManager`'s own persisted guest session (also
 * `sessionStorage`) additionally skips ACCESS on that same refresh — the
 * guest already has a session, so `GAME_READY` goes straight to GAME
 * instead of re-showing the access panel.
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
  // True once GameCanvas's real onReady has fired for the current attempt
  // — the only real signal BootScreen gates its own completion on
  // (BootScreen.tsx). Reset on every fresh attempt (retry/exit).
  const [engineReady, setEngineReady] = useState(false)

  // Background music belongs to GAME only — never LANDING, LOADING or
  // ACCESS (the world runs behind those overlays, so GameApp being ready
  // isn't the signal). Leaving GAME (EXIT -> LANDING) stops and rewinds it;
  // panels don't change the lifecycle, so they never restart it.
  const inGame = lifecycle === 'game'
  useEffect(() => {
    if (!inGame) return
    audioManager.playMusic('house-theme')
    return () => audioManager.stopMusic()
  }, [inGame])

  const handleStartJourney = useCallback(() => {
    dispatch({ type: 'START_JOURNEY' })
  }, [])

  const handleGameReady = useCallback(() => {
    // "The engine successfully initialized" — deliberately not on
    // START_JOURNEY, so a refresh mid-LOADING (before the game has
    // actually proven it works) still lands back in LOADING to try again,
    // not a false GAME/ACCESS.
    markGameSessionActive()
    setEngineReady(true)
  }, [])

  const handleBootComplete = useCallback(() => {
    dispatch({
      type: 'GAME_READY',
      alreadyAuthenticated: authManager.isAuthenticated(),
    })
  }, [])

  const handleAccessGranted = useCallback(() => {
    dispatch({ type: 'ACCESS_GRANTED' })
  }, [])

  const handleGameError = useCallback((error: unknown) => {
    console.error('Failed to initialize DHAWAL.OS.', error)
    dispatch({ type: 'GAME_ERROR' })
  }, [])

  const handleRetry = useCallback(() => {
    setEngineReady(false)
    setSessionKey((key) => key + 1)
    dispatch({ type: 'RETRY' })
  }, [])

  const handleExitConfirmed = useCallback(() => {
    clearGameSession()
    authManager.logout()
    setEngineReady(false)
    setSessionKey((key) => key + 1)
    dispatch({ type: 'EXIT' })
  }, [])

  if (lifecycle === 'landing') {
    return <LandingScreen onStartJourney={handleStartJourney} />
  }

  // LOADING, ACCESS, GAME, and ERROR all share the same portfolio shell —
  // the conventional navigation and panel host work independently of
  // whether the Pixi world itself is loading, gated behind guest access,
  // ready, or failed (ACCESSIBILITY.md "a recruiter must be able to bypass
  // exploration entirely").
  const mountGameCanvas =
    lifecycle === 'loading' || lifecycle === 'access' || lifecycle === 'game'

  return (
    <div className="app-shell">
      <GameHud
        onExitConfirmed={lifecycle === 'game' ? handleExitConfirmed : undefined}
      />
      {/* A real <main> landmark for the game world, sibling to (not
          nested inside) GameHud's <header> — a <header> descendant of
          <main> loses its implicit "banner" landmark role per the
          HTML/ARIA spec, so the two must stay siblings. */}
      <main className="game-main">
        {mountGameCanvas && (
          <GameCanvas
            key={sessionKey}
            onReady={handleGameReady}
            onError={handleGameError}
          />
        )}
      </main>
      <InteractionOverlay />
      {lifecycle === 'loading' && (
        <BootScreen
          engineReady={engineReady}
          onBootComplete={handleBootComplete}
        />
      )}
      {lifecycle === 'access' && (
        <AccessPanel onAccessGranted={handleAccessGranted} />
      )}
      {lifecycle === 'error' && <ErrorScreen onRetry={handleRetry} />}
    </div>
  )
}

export default App
