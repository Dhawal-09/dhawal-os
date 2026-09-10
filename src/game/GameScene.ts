import { Container } from 'pixi.js'

/**
 * Root scene container. World/Player/Camera systems attach to this in later
 * phases; Phase 03 only establishes the container and its per-frame update hook.
 */
export class GameScene extends Container {
  constructor() {
    super({ label: 'GameScene' })
  }

  update(_deltaMS: number): void {
    // Populated by World/Player/Camera systems starting Phase 04.
  }
}
