import { Container, Text } from 'pixi.js'
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
import { CameraMode } from './world/cameraConstants'
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
 * Logs every contextual-prompt transition (object id, mode, radius, what's
 * shown) to the console. Same opt-in rules as the collider overlay:
 * `VITE_DEBUG_INTERACTIONS=true`, dev builds only, off by default.
 */
const DEBUG_INTERACTIONS =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_INTERACTIONS === 'true'

/**
 * Screen-space readout of camera/player/viewport/bounds numbers. Same
 * opt-in rules: `VITE_DEBUG_CAMERA=true`, dev builds only, off by default.
 */
const DEBUG_CAMERA =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_CAMERA === 'true'

/** How long a flavor message stays up before fading on its own. */
export const FLAVOR_HOLD_MS = 3200
/** After a flavor message ends (or the player walks off), how long before it can appear again. */
export const FLAVOR_COOLDOWN_MS = 4000
/** How long an `[E]` response replaces the prompt before the prompt returns. */
export const RESPONSE_HOLD_MS = 2800

type MessageTarget = InteractableCandidate | AmbientCandidate

/** What the contextual prompt is doing right now — for tests and `DEBUG_INTERACTIONS`. */
export type PromptState =
  'none' | 'prompt' | 'response' | 'info' | 'flavor' | 'flavor-done'

/**
 * Root scene container. Owns the World, its follow Camera, collision,
 * interaction, and the player.
 */
export class GameScene extends Container {
  readonly world: World
  readonly player: Player
  private readonly camera: Camera
  /** Dev-only (`DEBUG_CAMERA`) — a scene child, not a World child, so it stays screen-space. */
  private readonly cameraDebugText: Text | null = null
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
  private messageTarget: MessageTarget | null = null
  /** What the prompt is showing for `messageTarget`. */
  private promptState: PromptState = 'none'
  /**
   * Scene time (ms of unpaused `update`s) — drives flavor/response timing,
   * so it freezes while a panel is open.
   */
  private clockMS = 0
  /** When the current flavor/response display ends, or null if it doesn't time out. */
  private messageEndsAt: number | null = null
  /** Per flavor spot: scene time before which it can't reappear. */
  private readonly flavorCooldownUntil = new Map<AmbientCandidate, number>()
  /** Per flavor spot: times shown this session — picks the next variant, and enforces `once`. */
  private readonly flavorShownCount = new Map<AmbientCandidate, number>()
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
    // Spawn framing: the first `resize()` snaps the camera onto this point.
    this.camera.follow(this.player.position.x, this.player.position.y)

    if (DEBUG_CAMERA) {
      this.cameraDebugText = new Text({
        text: '',
        style: { fill: 0x00ff88, fontFamily: 'monospace', fontSize: 12 },
      })
      this.cameraDebugText.position.set(8, 56)
      this.addChild(this.cameraDebugText)
    }

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
      if (event === 'WORLD_RESPONSE') {
        // Emitted by the player's own `[E]` (PlayerController), which sets
        // `interactionTarget` first — the response belongs to that target.
        const target = this.player.interactionTarget
        if (this.updatingPlayer && target?.response) this.showResponse(target)
        return
      }
      if (event === 'CAMERA_OVERVIEW' || event === 'CAMERA_EXPLORE') {
        this.setCameraMode(
          event === 'CAMERA_OVERVIEW'
            ? CameraMode.OVERVIEW
            : CameraMode.EXPLORE,
        )
        return
      }
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

  /** Recomputes the camera's scale and bounds for the given viewport dimensions. Never moves the player. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.camera.resize(viewportWidth, viewportHeight)
    this.updateCameraDebugText()
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
      this.leaveTarget()
      this.contextualMessage.hide()
      this.messageTarget = null
      this.setPromptState('none')
    } else {
      this.inputManager.reset()
    }
  }

  /**
   * EXPLORE ⇄ OVERVIEW. Camera framing only — the player keeps moving,
   * colliding and interacting in either mode, and switching never touches
   * the player's world position.
   */
  private setCameraMode(mode: CameraMode): void {
    this.camera.setMode(mode)
  }

  /**
   * Keeps the prompt on the current target. Target changes drive
   * `show`/`hide` (and the SFX) — never a per-frame restart. The only
   * per-frame work on an unchanged target is checking whether a flavor
   * message or `[E]` response has run its course.
   *
   * Priority (one message at a time): an in-range interactable's prompt,
   * else the nearest info/flavor spot, else nothing. A panel being open
   * pauses all of this (`setPaused`).
   */
  private updateContextualMessage(): void {
    const target =
      this.player.interactionTarget ??
      this.interactionSystem.findNearestAmbientInRange(this.player.position)

    if (target !== this.messageTarget) {
      this.leaveTarget()
      this.messageTarget = target
      this.enterTarget(target)
      return
    }

    if (this.messageEndsAt === null || this.clockMS < this.messageEndsAt) {
      return
    }
    this.messageEndsAt = null
    if (this.promptState === 'response' && target && 'action' in target) {
      // Back to the prompt, silently — pressing E again answers again.
      this.contextualMessage.show(
        messageForTarget(target, this.player.position),
      )
      this.setPromptState('prompt')
    } else if (
      this.promptState === 'flavor' &&
      target &&
      !('action' in target)
    ) {
      this.contextualMessage.hide()
      this.startFlavorCooldown(target)
      this.setPromptState('flavor-done')
    }
  }

  private enterTarget(target: MessageTarget | null): void {
    this.messageEndsAt = null

    if (!target) {
      this.contextualMessage.hide()
      this.announcedTarget = null
      this.setPromptState('none')
      return
    }

    if ('action' in target) {
      this.contextualMessage.show(
        messageForTarget(target, this.player.position),
      )
      if (target !== this.announcedTarget) audioManager.playInteractOpen()
      this.announcedTarget = target
      this.setPromptState('prompt')
      return
    }

    // Info/flavor: text only, never a sound.
    this.announcedTarget = null
    if (target.message.type === 'info') {
      this.contextualMessage.show(
        messageForTarget(target, this.player.position),
      )
      this.setPromptState('info')
      return
    }

    const shown = this.flavorShownCount.get(target) ?? 0
    const coolingDown =
      this.clockMS < (this.flavorCooldownUntil.get(target) ?? 0)
    if (coolingDown || (target.message.once && shown > 0)) {
      this.contextualMessage.hide()
      this.setPromptState('flavor-done')
      return
    }
    const lines = [target.message.text, ...(target.message.variants ?? [])]
    this.contextualMessage.show(
      messageForTarget(target, this.player.position, {
        text: lines[shown % lines.length],
      }),
    )
    this.flavorShownCount.set(target, shown + 1)
    this.messageEndsAt = this.clockMS + FLAVOR_HOLD_MS
    this.setPromptState('flavor')
  }

  /** Walking off a flavor spot mid-message still starts its cooldown — no spam from stepping in and out. */
  private leaveTarget(): void {
    const target = this.messageTarget
    if (target && this.promptState === 'flavor' && !('action' in target)) {
      this.startFlavorCooldown(target)
    }
  }

  private startFlavorCooldown(target: AmbientCandidate): void {
    this.flavorCooldownUntil.set(target, this.clockMS + FLAVOR_COOLDOWN_MS)
  }

  /** `[E]` on a `WORLD_RESPONSE` interactable: its response replaces the prompt for a moment. */
  private showResponse(target: InteractableCandidate): void {
    audioManager.playInteractOpen()
    this.messageTarget = target
    this.announcedTarget = target
    this.contextualMessage.show(
      messageForTarget(target, this.player.position, {
        type: 'info',
        text: (target.response ?? []).join('\n'),
      }),
    )
    this.messageEndsAt = this.clockMS + RESPONSE_HOLD_MS
    this.setPromptState('response')
  }

  /** The prompt's current target and state — exposed for tests and debugging. */
  get promptDebugState(): {
    id: string | null
    mode: 'interactive' | 'info' | 'flavor' | null
    radius: number | null
    state: PromptState
  } {
    const target = this.messageTarget
    let mode: 'interactive' | 'info' | 'flavor' | null = null
    if (target) mode = 'action' in target ? 'interactive' : target.message.type
    return {
      id: target?.id ?? null,
      mode,
      radius: target?.radius ?? null,
      state: this.promptState,
    }
  }

  private setPromptState(state: PromptState): void {
    this.promptState = state
    if (DEBUG_INTERACTIONS)
      console.debug('[interaction]', this.promptDebugState)
  }

  update(deltaMS: number): void {
    // The camera keeps animating under a panel; only the world (player
    // input, prompts, their timers) is frozen then. Camera mode never
    // gates the world.
    if (!this.paused) {
      this.updateWorld(deltaMS)
    }
    // Purely visual — collision and interaction above already ran on the
    // player's world position (CAMERA_SPEC.md).
    this.camera.follow(this.player.position.x, this.player.position.y)
    this.camera.update(deltaMS)
    this.updateCameraDebugText()
  }

  private updateWorld(deltaMS: number): void {
    this.clockMS += deltaMS
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
  }

  /** Read-only camera snapshot — for tests and the dev debug overlay. */
  get cameraState() {
    return this.camera.debugState
  }

  private updateCameraDebugText(): void {
    if (!this.cameraDebugText) return
    const c = this.camera.debugState
    const { x, y } = this.player.position
    const b = c.bounds
    this.cameraDebugText.text = [
      `mode ${c.mode}  zoom ${c.zoom.toFixed(3)}`,
      `camera ${c.cameraX.toFixed(1)}, ${c.cameraY.toFixed(1)}  scale ${c.scale.toFixed(3)}`,
      `player ${x.toFixed(1)}, ${y.toFixed(1)}`,
      `viewport ${c.viewportWidth}x${c.viewportHeight}  world ${c.worldWidth}x${c.worldHeight}`,
      `bounds x[${b.minX.toFixed(0)}..${b.maxX.toFixed(0)}] y[${b.minY.toFixed(0)}..${b.maxY.toFixed(0)}]`,
    ].join('\n')
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
