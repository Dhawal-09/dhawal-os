import type { Collider, WorldObject } from '../WorldObject'
import { INTERACTION_RADIUS, centeredCollider } from './worldObjectHelpers'

/**
 * MIDDLE-RIGHT: the "skills" content marker. Flanks the open center of the
 * room alongside "experience" on the opposite side.
 */
export const skillsObjects: WorldObject[] = [
  {
    id: 'skills',
    asset: 'content.skills',
    label: 'SKILLS',
    position: { x: 1540, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 1540, y: 720 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_SKILLS' },
    message: { type: 'interactive', text: 'Curious what he works with?' },
  },
]

/**
 * Invisible AABB collision for the vertical wall running along the right
 * side of the SKILLS/RESUME nook (the same visible wall panel that runs
 * behind the resume desk) — purely gameplay geometry, never a WorldObject
 * (a WorldObject always renders *something*, either its real sprite or the
 * dev placeholder box+label, so it can't be made invisible). Same precedent
 * as `hobbiesColliders` in `hobbiesRoom.ts` and the world's own
 * `ROOM_BOUNDARY_COLLIDERS`: independent, hand-authored geometry resolved
 * through `CollisionSystem`'s existing `extraObstacles` list, never a change
 * to the collision algorithm itself.
 *
 * `SKILLS_WALL_LEFT` is measured directly from the rendered game (sampling
 * the actual screen pixels at the known camera scale/offset, cross-checked
 * against Background2.png's own pixel data) — the point where the floor's
 * dusty-rose wall tone gives way to the wall panel's own shadow/frame edge,
 * around world x≈1875, well to the right of (and independent from) the
 * global `RIGHT_WALL_INNER_X` (1850) perimeter-wall boundary in
 * `worldObjectHelpers.ts`, which this doesn't touch. The vertical span
 * (`SKILLS_WALL_TOP`/`BOTTOM`) covers this specific wall segment — from just
 * above the SKILLS marker down to just past the resume desk — not the
 * world's full height, so it stays local to this nook rather than
 * duplicating the entire perimeter wall.
 */
const SKILLS_WALL_LEFT = 1875
const SKILLS_WALL_RIGHT = 1920 // the world's own right edge
const SKILLS_WALL_TOP = 650
const SKILLS_WALL_BOTTOM = 1150

// id: 'skills-right-wall-collision' — a plain Collider has no `id` field
// (same shape as ROOM_BOUNDARY_COLLIDERS/hobbiesColliders), so this comment
// is its identifier for anyone reading the exported array/debug overlay.
export const skillsColliders: readonly Collider[] = [
  {
    x: SKILLS_WALL_LEFT,
    y: SKILLS_WALL_TOP,
    width: SKILLS_WALL_RIGHT - SKILLS_WALL_LEFT,
    height: SKILLS_WALL_BOTTOM - SKILLS_WALL_TOP,
  },
]
