import { Container } from 'pixi.js'
import { gameEventBridge } from './events/GameEventBridge'
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
  }

  /** Refits the canonical world space to the given viewport dimensions. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.camera.resize(viewportWidth, viewportHeight)
  }

  /** The minimal mobile "tap to interact" stub — wired from the canvas host's pointerdown (see GameCanvas.tsx). */
  triggerInteractTap(): void {
    this.inputManager.triggerTapInteract()
  }

  update(deltaMS: number): void {
    this.player.update(deltaMS)
  }

  /** Also tears down non-Pixi resources (the keyboard listener) that a plain `Container.destroy()` cascade can't reach. */
  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.inputManager.destroy()
    super.destroy(options)
  }
}
