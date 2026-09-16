import type { Collider, WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'
import { aboutObjects } from './rooms/aboutRoom'
import { bedroomObjects } from './rooms/bedroomRoom'
import { educationObjects } from './rooms/educationRoom'
import { entranceObjects } from './rooms/entrance'
import { hobbiesColliders, hobbiesObjects } from './rooms/hobbiesRoom'
import { kitchenObjects } from './rooms/kitchen'
import { livingRoomObjects } from './rooms/livingRoom'
import { projectsObjects } from './rooms/projectsRoom'
import { skillsColliders, skillsObjects } from './rooms/skillsRoom'
import { ROOM_BOUNDARY_COLLIDERS } from './rooms/worldObjectHelpers'

export { ROOM_BOUNDARY_COLLIDERS } from './rooms/worldObjectHelpers'

/**
 * Every non-WorldObject collision obstacle in the world: the outer
 * perimeter walls (`ROOM_BOUNDARY_COLLIDERS`, exactly 4 rects — see
 * `roomBoundary.test.ts`'s regression coverage, which is why that constant
 * itself is never extended) plus each room's own hand-authored architectural
 * colliders, like the Hobbies back wall (`hobbiesColliders`) and the
 * Skills/Resume nook's right-side wall (`skillsColliders`). This is what
 * `GameScene` actually wires into `CollisionSystem`/`World` — a room adding
 * its own invisible wall geometry only ever means exporting a new array from
 * that room file and appending it here, never touching the perimeter-wall
 * constant or `CollisionSystem` itself.
 */
export const EXTRA_COLLIDERS: readonly Collider[] = [
  ...ROOM_BOUNDARY_COLLIDERS,
  ...hobbiesColliders,
  ...skillsColliders,
]

/**
 * Composition of the canonical world: the room composition for the
 * PHASE 10B 1920×1440 expansion (see each room file for its own zone).
 * Adding a new area/object requires only a new entry in the right room file
 * plus an asset — never a core-system change (WORLD_SPEC.md). Array order
 * only matters *within* a room where sprites visually stack (kitchen); no
 * two different rooms' objects overlap (verified by
 * worldObjects.test.ts's pairwise-overlap check), so the order between
 * rooms below is unconstrained.
 */
export const worldObjects: WorldObject[] = [
  ...bedroomObjects,
  ...projectsObjects,
  ...livingRoomObjects,
  ...skillsObjects,
  ...educationObjects,
  ...aboutObjects,
  ...entranceObjects,
  ...kitchenObjects,
  ...hobbiesObjects,
]

/**
 * Fails fast on authoring mistakes: duplicate ids, or a position outside the
 * canonical world bounds. Exported separately so it can be exercised with
 * synthetic fixtures in tests, independent of the real shipped data.
 */
export function validateWorldObjects(objects: WorldObject[]): void {
  const seenIds = new Set<string>()

  for (const object of objects) {
    if (seenIds.has(object.id)) {
      throw new Error(`Duplicate world object id: "${object.id}"`)
    }
    seenIds.add(object.id)

    const { x, y } = object.position
    if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) {
      throw new Error(
        `World object "${object.id}" position (${x}, ${y}) is outside the canonical ${WORLD_WIDTH}x${WORLD_HEIGHT} bounds.`,
      )
    }
  }
}

validateWorldObjects(worldObjects)
