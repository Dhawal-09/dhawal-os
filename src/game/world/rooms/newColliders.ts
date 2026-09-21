import type { Collider } from '../WorldObject'

/**
 * Add NEW colliders here — one line each. Anything added is automatically
 * blocking (via `EXTRA_COLLIDERS` in worldObjects.ts) and, in dev, outlined
 * as a yellow box. The older Education colliders stay in educationRoom.ts,
 * untouched.
 *
 * Args: x, y (top-left corner), width, height — all world px.
 */
export function newCollider(
  x: number,
  y: number,
  width: number,
  height: number,
): Collider {
  return { x, y, width, height }
}

/** Set to `false` to hide the yellow outlines (collision is unaffected). */
export const SHOW_NEW_COLLIDER_OUTLINES = true

export const newColliders: readonly Collider[] = [
  newCollider(1480, 760, 330, 60), // Entrance Walls
  newCollider(1480, 820, 60, 140),// #1 —  (x, y, width, height)
  
  //kitchen walls
  newCollider(1330, 470, 30, 210)
]

/** What World.ts outlines in dev. */
export const visibleNewColliders: readonly Collider[] =
  SHOW_NEW_COLLIDER_OUTLINES ? newColliders : []
