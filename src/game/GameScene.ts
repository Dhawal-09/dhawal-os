import { Container } from 'pixi.js'
import { audioManager } from './audio/AudioManager'
import { gameEventBridge, OPEN_EVENTS } from './events/GameEventBridge'
import { InputManager } from './input/InputManager'
import { Player } from './player/Player'
import {
  getCachedPlayerFrames,
  loadPlayerFrames,
} from './player/playerAnimations'
import { PLAYER_SPAWN_POSITION } from './player/playerConstants'
import { Camera } from './world/Camera'
import { CollisionSystem } from './world/CollisionSystem'
import {
  ContextualMessageView,
  messageForTarget,
} from './world/ContextualMessageView'
import {
  InteractionSystem,
  type AmbientCandidate,
  type InteractableCandidate,
} from './world/InteractionSystem'
import { World } from './world/World'
import { WORLD_HEIGHT, WORLD_WIDTH } from './world/worldConstants'
import {
  EXTRA_COLLIDERS,
  VISIBLE_COLLIDERS,
  worldObjects,
} from './world/worldObjects'

/**
 * Shows red collider-outline debug overlays (world furniture + the
 * player's own hitbox) — off by default even in `npm run dev`. Opt in
 * locally by setting `VITE_DEBUG_COLLISION=true` (e.g. in a gitignored
 * `.env.local`); `World`/`Player` additionally gate this on
 * `import.meta.env.DEV`, so it's always off in a production build too.
 */
const DEBUG_COLLISION_OVERLAY =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_COLLISION === 'true'

/**
 * Root scene container. Owns the World, its static Camera fit, collision,
 * interaction, and the player.
 */
export class GameScene extends Container {
  readonly world: World
  readonly player: Player
  private readonly camera: Camera
  private readonly inputManager: InputManager
  private readonly collisionSystem: CollisionSystem
  private readonly interactionSystem: InteractionSystem
  private readonly unsubscribeFromBridge: () => void
  /**
   * True while a portfolio panel — or any other React modal, e.g. the exit
   * confirmation dialog (`PAUSE_WORLD`) — is open. World input is ignored
   * while paused (ARCHITECTURE.md boundary: React owns the open panel, but
   * pausing world input in reaction to that is itself game-state, so it
   * belongs here rather than in the React layer). The Pixi ticker keeps
   * running — GameApp/GameScene are never torn down for a panel open/close
   * (INTERACTION_SPEC.md "without unnecessarily resetting world state").
   */
  private paused = false
  /**
   * True only while `player.update()` runs — the one place an `[E]`
   * interaction emits its `OPEN_*` action. Distinguishes a real interaction
   * from the HUD menu (PortfolioNav) opening the same panel.
   */
  private updatingPlayer = false
  /** The single in-world contextual prompt (INTERACTION_SPEC.md "Contextual messages"). */
  readonly contextualMessage = new ContextualMessageView({
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  })
  /**
   * The target the prompt currently describes — the player's interaction
   * target if any, else the nearest info/flavor spot. Candidates are stable
   * objects built once by InteractionSystem, so a reference comparison
   * detects a change without allocating anything per frame.
   */
  private messageTarget: InteractableCandidate | AmbientCandidate | null = null
  /**
   * The interactable whose prompt last played the appear SFX. Cleared only
   * when the player leaves it — not by a panel opening — so re-showing the
   * same prompt after a panel closes stays silent.
   */
  private announcedTarget: InteractableCandidate | null = null

  /** The Pixi ticker stops while the tab is hidden, so `update()` can't be relied on to silence footsteps then. */
  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) audioManager.stopWalking()
  }

  constructor() {
    super({ label: 'GameScene' })

    this.world = new World(
      worldObjects,
      EXTRA_COLLIDERS,
      DEBUG_COLLISION_OVERLAY,
      VISIBLE_COLLIDERS,
    )
    this.addChild(this.world)

    this.camera = new Camera(this.world, WORLD_WIDTH, WORLD_HEIGHT)

    this.collisionSystem = CollisionSystem.fromWorldObjects(
      worldObjects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      EXTRA_COLLIDERS,
    )
    this.interactionSystem = InteractionSystem.fromWorldObjects(worldObjects)

    this.inputManager = new InputManager()
    // Already in the Assets cache in a real session — GameApp.create awaits
    // `preloadWorldAssets` (which includes the character sheets) before this
    // scene exists — so the player is built with its real art immediately.
    const playerFrames = getCachedPlayerFrames()
    this.player = new Player(
      {
        input: this.inputManager,
        collisionSystem: this.collisionSystem,
        interactionSystem: this.interactionSystem,
        eventBridge: gameEventBridge,
      },
      {
        x: PLAYER_SPAWN_POSITION.x,
        y: PLAYER_SPAWN_POSITION.y,
        showDebugCollider: DEBUG_COLLISION_OVERLAY,
        frames: playerFrames,
      },
    )
    this.world.playerLayer.addChild(this.player)
    // Above every world layer, but still inside World — the Camera
    // transform moves (and clips) it together with its target.
    this.world.addChild(this.contextualMessage)
    this.camera.follow(this.player.position.x, this.player.position.y)

    if (!playerFrames) {
      // Preload timed out or failed — the placeholder circle stands in, and
      // upgrades to the real character the moment the sheets do arrive.
      // If they never do, the placeholder simply stays.
      loadPlayerFrames()
        .then((frames) => {
          if (!this.destroyed) this.player.setFrames(frames)
        })
        .catch(() => {})
    }

    this.unsubscribeFromBridge = gameEventBridge.subscribe((event) => {
      if (OPEN_EVENTS.has(event) || event === 'PAUSE_WORLD') {
        if (this.updatingPlayer && OPEN_EVENTS.has(event)) {
          audioManager.playInteractOpen()
        }
        this.setPaused(true)
      } else if (event === 'CLOSE_OVERLAY' || event === 'RETURN_TO_WORLD') {
        this.setPaused(false)
      }
    })

    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    audioManager.preloadWalking()
  }

  /** Refits the canonical world space to the given viewport dimensions. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.camera.resize(viewportWidth, viewportHeight)
  }

  /** The minimal mobile "tap to interact" stub — wired from the canvas host's pointerdown (see GameCanvas.tsx). */
  triggerInteractTap(): void {
    this.inputManager.triggerTapInteract()
  }

  /**
   * Pauses/resumes world input in response to a portfolio panel opening or
   * closing. Idempotent. Resuming resets pending input edge-state so a key
   * pressed while a panel was open (e.g. `E`) cannot immediately re-trigger
   * an interaction the instant the world resumes.
   */
  private setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    if (paused) {
      audioManager.stopWalking()
      // Hidden under any React panel/modal; the first update after resuming
      // re-derives it from the (unchanged) current target.
      this.contextualMessage.hide()
      this.messageTarget = null
    } else {
      this.inputManager.reset()
    }
  }

  /**
   * Keeps the prompt on the current target. A no-op unless the target
   * changed — `show`/`hide` (and the SFX) run only on transitions.
   */
  private updateContextualMessage(): void {
    const target =
      this.player.interactionTarget ??
      this.interactionSystem.findNearestAmbientInRange(this.player.position)
    if (target === this.messageTarget) return
    this.messageTarget = target

    if (!target) {
      this.contextualMessage.hide()
      this.announcedTarget = null
      return
    }

    this.contextualMessage.show(messageForTarget(target, this.player.position))
    if ('action' in target) {
      if (target !== this.announcedTarget) audioManager.playInteractOpen()
      this.announcedTarget = target
    } else {
      this.announcedTarget = null
    }
  }

  update(deltaMS: number): void {
    if (this.paused) return
    const { x, y } = this.player.position
    this.updatingPlayer = true
    try {
      this.player.update(deltaMS)
    } finally {
      this.updatingPlayer = false
    }
    // An [E] interaction this frame pauses the world from inside
    // `player.update()` — don't restart footsteps or re-show the prompt
    // underneath the panel that just opened.
    if (!this.paused) {
      // Footsteps follow the player's *actual* displacement, not raw input —
      // walking straight into a wall (collision resolves to zero) is silent.
      audioManager.setWalking(
        this.player.position.x !== x || this.player.position.y !== y,
      )
      this.updateContextualMessage()
    }
    // PHASE 10B: keeps the player centered as the Camera pans a larger-
    // than-viewport world (CAMERA_SPEC.md) — a no-op whenever the whole
    // room already fits the viewport (see Camera.ts's `apply()`).
    this.camera.follow(this.player.position.x, this.player.position.y)
  }

  /** Also tears down non-Pixi resources (the keyboard listener, the event bridge subscription) that a plain `Container.destroy()` cascade can't reach. */
  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.unsubscribeFromBridge()
    this.inputManager.destroy()
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    audioManager.stopWalking()
    super.destroy(options)
  }
}
