import { Application } from 'pixi.js'
import { GameScene } from './GameScene'

export interface GameAppOptions {
  width: number
  height: number
  backgroundColor?: number
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

    await app.init({
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

    const scene = new GameScene()
    app.stage.addChild(scene)
    app.ticker.add((ticker) => scene.update(ticker.deltaMS))
    scene.resize(options.width, options.height)

    return new GameApp(app, scene)
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
