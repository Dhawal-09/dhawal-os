import { Application } from 'pixi.js'
import { gameEventBridge } from './events/GameEventBridge'
import { GameScene } from './GameScene'
import { CameraMode } from './world/cameraConstants'
import { gamePreloader } from './world/preloadWorldAssets'

export interface GameAppOptions {
  width: number
  height: number
  backgroundColor?: number
  /** Called once the Pixi renderer itself is up — before the scene exists, which also waits on the asset preload. */
  onRendererReady?: () => void
  /** The camera mode the world opens in. Applied before the camera's first framing, so the game starts already in it — no transition to watch. Defaults to EXPLORE. */
  initialCameraMode?: CameraMode
  /**
   * Aborting abandons creation at its next step: `create` tears down
   * whatever it had built and rejects with the signal's reason. An attempt
   * aborted straight away (React StrictMode's throwaway first mount) never
   * initializes a renderer at all — which matters, because destroying a
   * second renderer clears Pixi's shared texture pool under the live one.
   */
  signal?: AbortSignal
}

/**
 * Resolves once the browser has had a chance to paint. `create` awaits it
 * between its expensive steps, so the initialization screen is on screen
 * (and visibly progresses) while they run, instead of the page freezing in
 * one long task. Falls back to a timer where frames don't fire (a hidden
 * tab).
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    const fallback = setTimeout(resolve, 100)
    requestAnimationFrame(() => {
      clearTimeout(fallback)
      setTimeout(resolve, 0)
    })
  })
}

/** Caps device-pixel-ratio-driven render resolution to avoid over-rendering on mobile (see RESPONSIVE_SPEC.md). */
const MAX_RESOLUTION = 2

/**
 * Thin, lifecycle-safe wrapper around a PixiJS Application. Owns the renderer,
 * the root GameScene, and the ticker wiring. Contains no player/world/collision
 * logic — that is introduced by later phases via `scene`.
 */
export class GameApp {
  readonly app: Application
  readonly scene: GameScene
  private destroyed = false

  private constructor(app: Application, scene: GameScene) {
    this.app = app
    this.scene = scene
  }

  static async create(options: GameAppOptions): Promise<GameApp> {
    const app = new Application()

    // Normally already running (or finished) — the Landing page starts it in
    // the background. This covers the paths that skip Landing (a refresh
    // mid-game) and retries anything that failed on an earlier attempt.
    gamePreloader.start()

    // Whatever screen asked for the game (the initialization screen) gets
    // painted before any Pixi work starts.
    await nextPaint()
    if (options.signal?.aborted) throw options.signal.reason

    // Renderer init and the world-artwork preload run in parallel — the game
    // only counts as "ready" (and the initialization screen only lifts) once
    // both are done, so the room never appears half-drawn. Settled together,
    // so a failed preload can never leave a half-initialized renderer behind.
    const [renderer, assets] = await Promise.allSettled([
      app
        .init({
          width: options.width,
          height: options.height,
          // Matches the --bg-deep design token (App.css/index.css) so the
          // Camera's letterbox bars blend seamlessly with the surrounding page
          // instead of showing a visible rectangle seam (PHASE 09 "fullscreen
          // presentation").
          background: options.backgroundColor ?? 0x050b1a,
          resolution: Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION),
          autoDensity: true,
          antialias: false,
          hello: false,
        })
        .then(() => options.onRendererReady?.()),
      gamePreloader.whenReady(),
    ])
    if (renderer.status === 'rejected') throw renderer.reason
    if (assets.status === 'rejected' || options.signal?.aborted) {
      app.destroy(true)
      throw assets.status === 'rejected'
        ? assets.reason
        : options.signal?.reason
    }

    // World construction is the next long step — let the renderer's
    // progress reach the screen first.
    await nextPaint()

    const scene = new GameScene()
    // Before the first `resize`: the camera's un-framed state *is* the
    // overview framing, so switching now makes that first framing land
    // directly in OVERVIEW. (Framing only — the player stays at its spawn.)
    if (options.initialCameraMode === CameraMode.OVERVIEW) {
      gameEventBridge.emit('CAMERA_OVERVIEW')
    }
    app.stage.addChild(scene)
    app.ticker.add((ticker) => scene.update(ticker.deltaMS))
    scene.resize(options.width, options.height)

    // The world's sprites swap in from the (already loaded) Assets cache over
    // the next few microtasks. Render once here so every texture is uploaded
    // to the GPU now, behind the initialization screen, rather than as a
    // hitch on the first frame the visitor actually sees.
    await nextPaint()
    const gameApp = new GameApp(app, scene)
    if (options.signal?.aborted) {
      gameApp.destroy()
      throw options.signal.reason
    }
    app.render()

    return gameApp
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement
  }

  /** Resizes the renderer to the given CSS pixel dimensions. No-ops once destroyed. */
  resize(width: number, height: number): void {
    if (this.destroyed || width <= 0 || height <= 0) return
    this.app.renderer.resize(width, height)
    this.scene.resize(width, height)
  }

  /** Idempotent — safe to call more than once (e.g. from React StrictMode cleanup races). */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    })
  }
}
