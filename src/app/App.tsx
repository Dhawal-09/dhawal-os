import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { ErrorScreen } from '../components/error/ErrorScreen'
import { GameHud } from '../components/game-menu/GameHud'
import { LandingScreen } from '../components/landing/LandingScreen'
import { BootScreen } from '../components/loading/BootScreen'
import { MobileControls } from '../components/mobile-controls/MobileControls'
import { ViewSelectScreen } from '../components/view-select/ViewSelectScreen'
import { audioManager } from '../game/audio/AudioManager'
import { authManager } from '../game/auth/AuthManager'
import { gameEventBridge } from '../game/events/GameEventBridge'
import { CameraMode } from '../game/world/cameraConstants'
import { gamePreloader } from '../game/world/preloadWorldAssets'
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
 * Runs `callback` once the page itself has finished loading (the Landing
 * page's own cover art and font included) and the browser is next idle —
 * i.e. once Landing is fully usable. Returns a cancel function.
 */
function runWhenPageIdle(callback: () => void): () => void {
  let idleHandle: number | null = null
  let timeoutHandle: number | null = null

  const schedule = (): void => {
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(callback, { timeout: 1000 })
    } else {
      timeoutHandle = window.setTimeout(callback, 0)
    }
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })

  return () => {
    window.removeEventListener('load', schedule)
    if (idleHandle !== null) window.cancelIdleCallback(idleHandle)
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle)
  }
}

/**
 * Owns the small explicit application lifecycle (PHASE-08.5, restructured so
 * nothing the visitor does waits on the game until the very last step):
 * LANDING -> (START JOURNEY) -> VIEW_SELECT -> LOADING -> GAME, with an
 * ERROR branch that can retry and an EXIT branch (GAME -> LANDING) once the
 * visitor confirms they want to leave.
 *
 * The time spent on LANDING and VIEW_SELECT is used to *download* the game:
 * once Landing is usable, the game's artwork starts loading in the
 * background (`gamePreloader`, into Pixi's shared `Assets` cache). Nothing
 * else happens until the visitor confirms a view — START JOURNEY only shows
 * VIEW_SELECT, it never starts the engine.
 *
 * LOADING (the initialization screen, BootScreen.tsx) owns everything
 * expensive: `GameCanvas` — the single Pixi bootstrap path — mounts there,
 * so the renderer, world construction, texture upload and player setup all
 * run behind that screen rather than freezing another one. It stays mounted
 * unchanged through LOADING -> GAME, so `GameApp`/`GameScene` are created
 * exactly once per game session.
 *
 * There is no access screen: the guest session (`AuthManager`) is ensured
 * automatically on the way into GAME (PixiJS never even knows
 * authentication exists — see ARCHITECTURE.md).
 *
 * A `sessionStorage` flag (`gameSession.ts`) survives a page refresh within
 * the same browser tab/session: if the visitor already reached GAME, a
 * refresh skips LANDING and VIEW_SELECT and goes straight into a brand-new
 * LOADING -> GAME bootstrap.
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
  // Real signals from GameCanvas for the current attempt, shown by (and, for
  // `engineReady`, gating) the initialization screen (BootScreen.tsx). Reset
  // on every fresh attempt (retry/exit).
  const [rendererReady, setRendererReady] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  // The single camera-mode selection (VIEW_SELECT screen + HUD VIEW
  // selector). React owns the choice; the Pixi Camera owns the behavior —
  // every change is forwarded over the event bridge, never per frame. Null
  // until the visitor picks on VIEW_SELECT; a fresh GameScene always starts
  // in EXPLORE, so `null` reads as EXPLORE everywhere else (e.g. after a
  // refresh, which skips VIEW_SELECT).
  const [cameraMode, setCameraMode] = useState<CameraMode | null>(null)

  // LANDING_READY -> GAME_PRELOAD_STARTED. Deliberately after the page's
  // own load, so the game's artwork never competes with what Landing needs
  // to render.
  const onLanding = lifecycle === 'landing'
  useEffect(() => {
    if (!onLanding) return
    return runWhenPageIdle(gamePreloader.start)
  }, [onLanding])

  // Background music belongs to GAME only — never LANDING, VIEW_SELECT or
  // LOADING (GameApp being ready isn't the signal — the visitor entering
  // is). Leaving GAME (EXIT -> LANDING) stops and rewinds it;
  // panels don't change the lifecycle, so they never restart it.
  const inGame = lifecycle === 'game'
  useEffect(() => {
    if (!inGame) return
    audioManager.playMusic('house-theme')
    return () => audioManager.stopMusic()
  }, [inGame])

  const handleStartJourney = useCallback(() => {
    // In case the visitor beat the page's own load event — the download
    // must be under way by VIEW_SELECT at the latest. Idempotent.
    gamePreloader.start()
    dispatch({ type: 'START_JOURNEY' })
  }, [])

  const handleRendererReady = useCallback(() => {
    setRendererReady(true)
  }, [])

  const handleGameReady = useCallback(() => {
    setEngineReady(true)
  }, [])

  const handleBootComplete = useCallback(() => {
    // Guest access needs no screen and no click — just make sure the session
    // exists (a refresh mid-game already has one).
    if (!authManager.isAuthenticated()) authManager.createGuestSession()
    // "The visitor actually entered the game" — deliberately not on START
    // JOURNEY or ENTER, so a refresh before the game has proven it works
    // starts over from LANDING.
    markGameSessionActive()
    dispatch({ type: 'GAME_READY' })
  }, [])

  // On VIEW_SELECT there is no scene yet to hear the event — the choice
  // reaches the world as GameCanvas's `initialCameraMode` instead. From the
  // HUD, the event is what switches the live camera.
  const handleCameraModeChange = useCallback((mode: CameraMode) => {
    setCameraMode(mode)
    gameEventBridge.emit(
      mode === CameraMode.OVERVIEW ? 'CAMERA_OVERVIEW' : 'CAMERA_EXPLORE',
    )
  }, [])

  const handleViewSelected = useCallback(() => {
    dispatch({ type: 'VIEW_SELECTED' })
  }, [])

  const hudCameraView = useMemo(
    () => ({
      mode: cameraMode ?? CameraMode.EXPLORE,
      onChange: handleCameraModeChange,
    }),
    [cameraMode, handleCameraModeChange],
  )

  const handleGameError = useCallback((error: unknown) => {
    console.error('Failed to initialize DHAWAL.OS.', error)
    dispatch({ type: 'GAME_ERROR' })
  }, [])

  // The visitor's camera choice survives a retry — the fresh GameCanvas
  // opens in it.
  const handleRetry = useCallback(() => {
    setRendererReady(false)
    setEngineReady(false)
    setSessionKey((key) => key + 1)
    dispatch({ type: 'RETRY' })
  }, [])

  const handleExitConfirmed = useCallback(() => {
    clearGameSession()
    authManager.logout()
    setRendererReady(false)
    setEngineReady(false)
    setCameraMode(null)
    setSessionKey((key) => key + 1)
    dispatch({ type: 'EXIT' })
  }, [])

  if (lifecycle === 'landing') {
    return <LandingScreen onStartJourney={handleStartJourney} />
  }

  // VIEW_SELECT, LOADING, GAME, and ERROR all share the same portfolio
  // shell — the conventional navigation and panel host work independently
  // of whether the Pixi world itself exists yet, is initializing, ready, or
  // failed (ACCESSIBILITY.md "a recruiter must be able to bypass
  // exploration entirely"). The engine itself only ever exists from LOADING.
  const mountGameCanvas = lifecycle === 'loading' || lifecycle === 'game'

  return (
    <div className="app-shell">
      <GameHud
        onExitConfirmed={lifecycle === 'game' ? handleExitConfirmed : undefined}
        cameraView={lifecycle === 'game' ? hudCameraView : undefined}
      />
      {/* A real <main> landmark for the game world, sibling to (not
          nested inside) GameHud's <header> — a <header> descendant of
          <main> loses its implicit "banner" landmark role per the
          HTML/ARIA spec, so the two must stay siblings. */}
      <main className="game-main">
        {mountGameCanvas && (
          <GameCanvas
            key={sessionKey}
            initialCameraMode={cameraMode ?? undefined}
            onRendererReady={handleRendererReady}
            onReady={handleGameReady}
            onError={handleGameError}
          />
        )}
      </main>
      {/* Touch joystick + interact button — GAME only, so they can never drive
          the world behind the view-select/initialization screens. */}
      {lifecycle === 'game' && <MobileControls />}
      <InteractionOverlay />
      {lifecycle === 'view-select' && (
        <ViewSelectScreen
          selected={cameraMode}
          onSelect={handleCameraModeChange}
          onConfirm={handleViewSelected}
        />
      )}
      {lifecycle === 'loading' && (
        <BootScreen
          rendererReady={rendererReady}
          engineReady={engineReady}
          onBootComplete={handleBootComplete}
        />
      )}
      {lifecycle === 'error' && <ErrorScreen onRetry={handleRetry} />}
    </div>
  )
}

export default App
