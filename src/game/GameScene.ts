import { Container } from 'pixi.js'
import { gameEventBridge, OPEN_EVENTS } from './events/GameEventBridge'
import { InputManager } from './input/InputManager'
import { Player } from './player/Player'
import { Camera } from './world/Camera'
import { CollisionSystem } from './world/CollisionSystem'
import { InteractionSystem } from './world/InteractionSystem'
import { World } from './world/World'
import { WORLD_HEIGHT, WORLD_WIDTH } from './world/worldConstants'
import { worldObjects } from './world/worldObjects'

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

  constructor() {
    super({ label: 'GameScene' })

    this.world = new World(worldObjects)
    this.addChild(this.world)

    this.camera = new Camera(this.world, WORLD_WIDTH, WORLD_HEIGHT)

    this.collisionSystem = CollisionSystem.fromWorldObjects(
      worldObjects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    )
    this.interactionSystem = InteractionSystem.fromWorldObjects(worldObjects)

    this.inputManager = new InputManager()
    this.player = new Player(
      {
        input: this.inputManager,
        collisionSystem: this.collisionSystem,
        interactionSystem: this.interactionSystem,
        eventBridge: gameEventBridge,
      },
      { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
    )
    this.world.playerLayer.addChild(this.player)

    this.unsubscribeFromBridge = gameEventBridge.subscribe((event) => {
      if (OPEN_EVENTS.has(event) || event === 'PAUSE_WORLD') {
        this.setPaused(true)
      } else if (event === 'CLOSE_OVERLAY' || event === 'RETURN_TO_WORLD') {
        this.setPaused(false)
      }
    })
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
    if (!paused) this.inputManager.reset()
  }

  update(deltaMS: number): void {
    if (this.paused) return
    this.player.update(deltaMS)
  }

  /** Also tears down non-Pixi resources (the keyboard listener, the event bridge subscription) that a plain `Container.destroy()` cascade can't reach. */
  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.unsubscribeFromBridge()
    this.inputManager.destroy()
    super.destroy(options)
  }
}
