import type { Collider, WorldObject } from './WorldObject'

/** Axis-aligned rect; `x`/`y` is the top-left corner. Same shape as `Collider`, kept distinct so this module has no dependency on WorldObject beyond the factory below. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

type Axis = 'x' | 'y'

/**
 * Purely geometric collision resolution — no Pixi/rendering dependency
 * (COLLISION_SPEC.md "Ownership": collision is independent from rendering).
 * Resolves a moving rect's desired (dx, dy) against a fixed set of obstacle
 * rects plus the canonical world bounds, one axis at a time, so a body can
 * slide along an obstacle/wall instead of sticking (COLLISION_SPEC.md
 * "Resolution algorithm").
 */
export class CollisionSystem {
  private readonly worldWidth: number
  private readonly worldHeight: number
  private readonly obstacles: readonly Rect[]

  constructor(
    worldWidth: number,
    worldHeight: number,
    obstacles: readonly Rect[] = [],
  ) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.obstacles = obstacles
  }

  /** Only WorldObject entries with a `collision` field become obstacles — visual-only objects are never automatically solid. */
  static fromWorldObjects(
    objects: readonly WorldObject[],
    worldWidth: number,
    worldHeight: number,
  ): CollisionSystem {
    const obstacles: Collider[] = []
    for (const object of objects) {
      if (object.collision) obstacles.push(object.collision)
    }
    return new CollisionSystem(worldWidth, worldHeight, obstacles)
  }

  /**
   * Input -> desired velocity -> candidate position -> collision test ->
   * resolve X -> resolve Y -> apply final position (COLLISION_SPEC.md).
   * `current` is the mover's collider rect *before* this frame's movement.
   */
  resolveMovement(
    current: Rect,
    dx: number,
    dy: number,
  ): { x: number; y: number } {
    const x = this.resolveAxis(current, 'x', dx)
    const afterX: Rect = { ...current, x }
    const y = this.resolveAxis(afterX, 'y', dy)
    return { x, y }
  }

  private resolveAxis(moving: Rect, axis: Axis, delta: number): number {
    const bounded = this.clampToBounds(moving, axis, moving[axis] + delta)
    if (delta === 0) return bounded

    const candidate: Rect = { ...moving, [axis]: bounded }
    let resolved = bounded

    for (const obstacle of this.obstacles) {
      if (!rectsOverlap(candidate, obstacle)) continue

      if (axis === 'x') {
        resolved =
          delta > 0
            ? Math.min(resolved, obstacle.x - moving.width)
            : Math.max(resolved, obstacle.x + obstacle.width)
      } else {
        resolved =
          delta > 0
            ? Math.min(resolved, obstacle.y - moving.height)
            : Math.max(resolved, obstacle.y + obstacle.height)
      }
    }

    return resolved
  }

  private clampToBounds(moving: Rect, axis: Axis, raw: number): number {
    const worldSize = axis === 'x' ? this.worldWidth : this.worldHeight
    const size = axis === 'x' ? moving.width : moving.height
    return Math.min(Math.max(raw, 0), worldSize - size)
  }
}
