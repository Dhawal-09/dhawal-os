import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  gamePreloader,
  type GamePreloader,
} from '../../game/world/preloadWorldAssets'
import './BootScreen.css'

export interface BootScreenProps {
  /** True once the Pixi renderer itself is up. */
  rendererReady: boolean
  /** True once the real PixiJS engine (`GameApp`: renderer, core assets, scene, input) has actually finished initializing — the only gate this screen waits on. */
  engineReady: boolean
  /** Called exactly once, the moment `engineReady` is observed — immediately, if the engine finished behind the previous screens. */
  onBootComplete: () => void
  /** The preload whose progress is shown. Defaults to the app's one shared preload; tests pass their own. */
  preloader?: Pick<GamePreloader, 'subscribe' | 'getState'>
}

/**
 * The DHAWAL.OS initialization screen, shown between ENTER DHAWAL.OS and
 * the game. Everything on it is real state — nothing ticks on a timer: each
 * checklist line is checked by the thing it names actually being ready, and
 * the bar is the background preload's own settled/total count. The preload
 * has usually been running since the Landing page, so this screen is often
 * already complete when it appears and hands straight over to the game; on
 * a slower connection it simply stays up until the engine is ready.
 */
export function BootScreen({
  rendererReady,
  engineReady,
  onBootComplete,
  preloader = gamePreloader,
}: BootScreenProps) {
  const preload = useSyncExternalStore(preloader.subscribe, preloader.getState)
  const calledCompleteRef = useRef(false)

  useEffect(() => {
    if (!engineReady || calledCompleteRef.current) return
    calledCompleteRef.current = true
    onBootComplete()
  }, [engineReady, onBootComplete])

  const stages = [
    { label: 'Renderer', done: rendererReady || engineReady },
    // The scene owns the InputManager, so input exists exactly when the engine does.
    { label: 'Input', done: engineReady },
    { label: 'World manifest', done: preload.started },
    { label: 'Character', done: preload.characterReady },
    { label: 'Core environment', done: preload.coreReady },
  ]

  const progress =
    preload.total > 0 ? Math.floor((preload.settled / preload.total) * 100) : 0

  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <p className="boot-brand">DHAWAL.OS</p>
      <p className="boot-heading">INITIALIZING SYSTEM...</p>

      <ul className="boot-stages">
        {stages.map((stage) => (
          <li key={stage.label} className={stage.done ? 'boot-stage-done' : ''}>
            {stage.done ? '✓ ' : ''}
            {stage.label}
          </li>
        ))}
      </ul>

      <p className="boot-progress-label">BACKGROUND ASSETS</p>
      <div className="boot-progress-row">
        <div
          className="boot-progress"
          role="progressbar"
          aria-label="Background assets"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="boot-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="boot-progress-value">{progress}%</span>
      </div>

      <p className="boot-status">
        {engineReady
          ? 'SYSTEM READY'
          : preload.coreReady
            ? 'STARTING WORLD...'
            : 'LOADING CORE ASSETS...'}
      </p>
    </div>
  )
}
