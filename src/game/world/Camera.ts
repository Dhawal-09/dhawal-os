import type { Container } from 'pixi.js'

/**
 * Initial static camera (see CAMERA_SPEC.md). Fits the canonical world
 * space into the current viewport ("contain" scale, centered/letterboxed)
 * and keeps the aspect ratio correct. No player-follow yet — that lands in
 * a later phase once a player position exists to track.
 */
export class Camera {
  private readonly target: Container
  private readonly worldWidth: number
  private readonly worldHeight: number

  constructor(target: Container, worldWidth: number, worldHeight: number) {
    this.target = target
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  /** Recomputes scale/position for the given viewport (CSS pixel) dimensions. */
  resize(viewportWidth: number, viewportHeight: number): void {
    if (viewportWidth <= 0 || viewportHeight <= 0) return

    const scale = Math.min(
      viewportWidth / this.worldWidth,
      viewportHeight / this.worldHeight,
    )

    this.target.scale.set(scale)
    this.target.position.set(
      (viewportWidth - this.worldWidth * scale) / 2,
      (viewportHeight - this.worldHeight * scale) / 2,
    )
  }
}
