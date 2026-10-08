import { Assets } from 'pixi.js'
import { PLAYER_SHEET_URLS } from '../player/playerAnimations'
import { ASSET_MANIFEST } from './assetManifest'

/**
 * Longest `whenReady` will wait on the world's artwork. A stalled or very
 * slow connection must never leave the visitor stuck on the initialization
 * screen forever — past this the game opens anyway as long as its core
 * assets made it, and any still-pending decor upgrades from its dev
 * placeholder as soon as its own texture lands (see WorldObject.ts
 * `upgradeToSprite`).
 */
export const PRELOAD_TIMEOUT_MS = 30_000

/**
 * One immutable snapshot of the background preload. The startup flow's
 * loading states map onto it directly:
 *
 * - GAME_PRELOAD_STARTED — `started`
 * - GAME_PRELOAD_PROGRESS — `settled` / `total` (real counts, never a timer)
 * - GAME_CORE_READY — `coreReady`
 * - GAME_OPTIONAL_ASSETS_LOADING — `coreReady && !complete`
 *
 * (LANDING_READY and GAME_READY belong to App.tsx — the page finishing its
 * own load, and the engine reporting ready.)
 */
export interface GamePreloadState {
  readonly started: boolean
  readonly total: number
  /** Assets that finished, successfully or not. */
  readonly settled: number
  readonly failed: number
  readonly characterReady: boolean
  /** Character sheets + core environment all loaded — the minimum to enter the game. */
  readonly coreReady: boolean
  /** Every asset has settled. */
  readonly complete: boolean
  /** Set when a core asset failed to load; cleared when `start()` retries it. */
  readonly coreError: Error | null
}

export interface GamePreloadGroups {
  /** Core: the player's sprite sheets. */
  character: readonly string[]
  /** Core: the room shell — floor and walls. */
  environment: readonly string[]
  /** Everything else. A failure here only leaves that one object on its placeholder. */
  optional: readonly string[]
}

type AssetStatus = 'loading' | 'loaded' | 'failed'

/**
 * Loads the game's artwork into Pixi's shared `Assets` cache in the
 * background — started from the Landing page (App.tsx), long before the
 * engine exists — and reports real progress while it does. This is not a
 * second loader: every URL goes through `Assets.load`, so the `Assets.load`
 * calls `World`/`GameScene` make later resolve from the same cache (or the
 * same in-flight promise) and nothing is ever downloaded twice.
 */
export class GamePreloader {
  private readonly character: readonly string[]
  private readonly core: readonly string[]
  private readonly all: readonly string[]
  private readonly status = new Map<string, AssetStatus>()
  private readonly listeners = new Set<() => void>()
  private started = false
  private coreError: Error | null = null
  private state: GamePreloadState

  constructor(groups: GamePreloadGroups) {
    this.character = [...new Set(groups.character)]
    this.core = [...new Set([...groups.character, ...groups.environment])]
    // Core first, so it is at the front of the browser's request queue.
    this.all = [...new Set([...this.core, ...groups.optional])]
    this.state = this.snapshot()
  }

  /**
   * Begins loading everything not already loaded or in flight. Idempotent —
   * calling it again only retries assets that previously failed.
   */
  start = (): void => {
    let changed = !this.started
    this.started = true

    for (const url of this.all) {
      const status = this.status.get(url)
      if (status === 'loading' || status === 'loaded') continue
      this.status.set(url, 'loading')
      this.coreError = null
      changed = true
      Assets.load(url).then(
        () => this.settle(url, 'loaded'),
        (error: unknown) => this.fail(url, error),
      )
    }

    if (changed) this.publish()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): GamePreloadState => this.state

  /**
   * Resolves once the game can be entered: the core assets are loaded and
   * the rest have settled (or `timeoutMs` passed — they then keep loading
   * behind the running game). Rejects if a core asset failed, or is still
   * missing at the timeout, rather than letting a broken game open.
   */
  whenReady(timeoutMs: number = PRELOAD_TIMEOUT_MS): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(timer)
        unsubscribe()
        if (error) reject(error)
        else resolve()
      }
      const check = (): void => {
        const { coreError, coreReady, complete } = this.state
        if (coreError) finish(coreError)
        else if (coreReady && complete) finish()
      }
      const unsubscribe = this.subscribe(check)
      const timer = setTimeout(() => {
        if (this.state.coreReady) finish()
        else finish(new Error('Timed out loading core game assets.'))
      }, timeoutMs)
      check()
    })
  }

  private fail(url: string, error: unknown): void {
    if (this.core.includes(url)) {
      console.error(`Failed to load core game asset ${url}.`, error)
      this.coreError ??=
        error instanceof Error ? error : new Error(String(error))
    } else {
      console.warn(`Failed to load optional game asset ${url}.`, error)
    }
    this.settle(url, 'failed')
  }

  private settle(url: string, status: AssetStatus): void {
    this.status.set(url, status)
    this.publish()
  }

  private publish(): void {
    this.state = this.snapshot()
    for (const listener of this.listeners) listener()
  }

  private snapshot(): GamePreloadState {
    let settled = 0
    let failed = 0
    for (const status of this.status.values()) {
      if (status !== 'loading') settled++
      if (status === 'failed') failed++
    }
    const loaded = (urls: readonly string[]): boolean =>
      urls.every((url) => this.status.get(url) === 'loaded')

    return {
      started: this.started,
      total: this.all.length,
      settled,
      failed,
      characterReady: loaded(this.character),
      coreReady: loaded(this.core),
      complete: this.started && settled === this.all.length,
      coreError: this.coreError,
    }
  }
}

/** The room shell: without these the world is a flat grey rect, so they are game-critical alongside the character. */
const CORE_ENVIRONMENT_ASSET_IDS = [
  'structural.floor',
  'walls.wallTwo',
  'walls.wallThree',
  'walls.glassWall',
]

/**
 * The one preload for the whole app (one Pixi `Assets` cache, one game
 * instance at a time — see GameCanvas.tsx). Tests that want isolation
 * construct their own `new GamePreloader(...)`.
 */
export const gamePreloader = new GamePreloader({
  character: Object.values(PLAYER_SHEET_URLS), // public/assets/character/
  environment: CORE_ENVIRONMENT_ASSET_IDS.map((id) => ASSET_MANIFEST[id]),
  optional: Object.values(ASSET_MANIFEST),
})
