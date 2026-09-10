import { Container } from 'pixi.js'
import { Camera } from './world/Camera'
import { World } from './world/World'
import { WORLD_HEIGHT, WORLD_WIDTH } from './world/worldConstants'
import { worldObjects } from './world/worldObjects'

/**
 * Root scene container. Owns the World and its static Camera fit. Future
 * systems (Player, PlayerController, InteractionSystem) attach here starting
 * Phase 05 — Phase 04 only establishes the world/layer/camera foundation.
 */
export class GameScene extends Container {
  readonly world: World
  private readonly camera: Camera

  constructor() {
    super({ label: 'GameScene' })

    this.world = new World(worldObjects)
    this.addChild(this.world)

    this.camera = new Camera(this.world, WORLD_WIDTH, WORLD_HEIGHT)
  }

  /** Refits the canonical world space to the given viewport dimensions. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.camera.resize(viewportWidth, viewportHeight)
  }

  update(_deltaMS: number): void {
    // Populated by Player/Camera-follow systems starting Phase 05.
  }
}
