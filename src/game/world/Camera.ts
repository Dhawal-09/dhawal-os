import type { Container } from 'pixi.js'

/**
 * Below this scale the room would render too small to read comfortably (a
 * 96-unit interaction marker would shrink under ~40px). Below this floor the
 * Camera stops shrinking the world further and instead reveals only a
 * panned *subsection* of it — see `apply()` — which is what lets a large
 * 1920×1440 room stay legible on a small viewport (PHASE 10B "camera can
 * render a subsection of the world").
 */
const MIN_SCALE = 0.5

/**
 * A viewport into the canonical world (see CAMERA_SPEC.md, PHASE 10B "World
 * → viewport model"). Two responsibilities, both driven by the same
 * `apply()` so they can never disagree:
 *
 * 1. **Scale** — uniform "contain" fit (`scale = min(viewportW/worldW,
 *    viewportH/worldH)`), floored at `MIN_SCALE`. On a viewport large enough
 *    to contain the whole 1920×1440 room at a legible size, this is exactly
 *    the contain scale — the entire room is visible, letterboxed on
 *    whichever axis has leftover space. Never distorts: one scale factor,
 *    both axes, always.
 * 2. **Pan** — when the floor forces a scale *larger* than the contain
 *    scale (the room no longer fits the viewport at a legible size — the
 *    common case on mobile, per PHASE 10B "12. Responsive behavior"), the
 *    camera instead shows a same-size subsection of the room, panned to
 *    keep `follow()`'s last reported point (normally the player) centered,
 *    and clamped so the viewport can never show space outside the world
 *    bounds. Per axis: if the scaled room still fits that axis, that axis
 *    is centered/letterboxed exactly as in the contain case — only the
 *    axis that actually overflows pans.
 *
 * Deliberately no easing/tweening — every `resize`/`follow` call is a
 * direct, deterministic recompute (PHASE 10B "3. Camera behavior": "Keep
 * camera movement deterministic").
 */
export class Camera {
  private readonly target: Container
  private readonly worldWidth: number
  private readonly worldHeight: number

  private viewportWidth = 0
  private viewportHeight = 0
  /** The world-space point the camera tries to center when panning — defaults to the world's center (PLAYER_SPEC.md spawn point) until `follow()` is first called. */
  private focusX: number
  private focusY: number

  constructor(target: Container, worldWidth: number, worldHeight: number) {
    this.target = target
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.focusX = worldWidth / 2
    this.focusY = worldHeight / 2
  }

  /** Recomputes scale/pan for the given viewport (CSS pixel) dimensions — call on every GameCanvas resize. */
  resize(viewportWidth: number, viewportHeight: number): void {
    if (viewportWidth <= 0 || viewportHeight <= 0) return
    this.viewportWidth = viewportWidth
    this.viewportHeight = viewportHeight
    this.apply()
  }

  /**
   * Reports the world-space point the camera should try to keep centered —
   * the player's position, called once per frame from the Pixi ticker
   * (GameScene.update), same as every other real-time game-state update
   * (ARCHITECTURE.md "Game loop boundary"). A no-op visually whenever the
   * whole room already fits the viewport (desktop/laptop) — only viewports
   * small enough to force panning (mobile) actually move as a result.
   */
  follow(worldX: number, worldY: number): void {
    this.focusX = worldX
    this.focusY = worldY
    this.apply()
  }

  private apply(): void {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return

    const containScale = Math.min(
      this.viewportWidth / this.worldWidth,
      this.viewportHeight / this.worldHeight,
    )
    const scale = Math.max(containScale, MIN_SCALE)
    this.target.scale.set(scale)

    const scaledWorldWidth = this.worldWidth * scale
    const scaledWorldHeight = this.worldHeight * scale

    this.target.position.set(
      this.axisOffset(this.viewportWidth, scaledWorldWidth, this.focusX, scale),
      this.axisOffset(
        this.viewportHeight,
        scaledWorldHeight,
        this.focusY,
        scale,
      ),
    )
  }

  /**
   * The draw offset for one axis: centered (letterboxed) if the scaled
   * world already fits the viewport on this axis, otherwise panned to
   * center `focus` and clamped so the world's own edges never reveal empty
   * space beyond the room (PHASE 10B "camera can clamp to world bounds").
   */
  private axisOffset(
    viewportSize: number,
    scaledWorldSize: number,
    focus: number,
    scale: number,
  ): number {
    if (scaledWorldSize <= viewportSize) {
      return (viewportSize - scaledWorldSize) / 2
    }

    const desired = viewportSize / 2 - focus * scale
    const min = viewportSize - scaledWorldSize // world's far edge flush with the viewport's far edge
    const max = 0 // world's near edge flush with the viewport's near edge
    return Math.min(Math.max(desired, min), max)
  }
}
