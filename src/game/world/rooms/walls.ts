import type { WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  contentAlignedCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * Decorative architectural wall posts (assets/world/Walls/*): "Wall2.png"
 * and the shorter "Wall3.png". Wall2 intentionally extends up into the top
 * room-boundary wall band (y<310, `TOP_WALL_INNER_Y` in
 * worldObjectHelpers.ts) — the same "embedded in the wall by design"
 * precedent as the entrance-hook, appropriate here since they literally
 * depict wall material.
 *
 * Both get a `contentAlignedCollider` sized to their own real visible
 * footprint — "the whole wall" is solid, not just a placeholder box.
 */

/**
 * Natural pixel dimensions of "Wall2.png", read directly from the source
 * file — a fully opaque canvas (no transparency at all; verified against
 * the pixel data), so its "content bbox" is simply the whole canvas.
 */
const WALL_TWO_NATURAL_SIZE = { width: 32, height: 856 }
const WALL_TWO_CONTENT_BBOX = { minX: 0, minY: 0, maxX: 31, maxY: 855 }
/** Target rendered width (world px) — visible content reads at ~20px wide × ~550px tall. */
const WALL_TWO_TARGET_WIDTH = 20.56
const WALL_TWO_SCALE = scaleForWidth(WALL_TWO_NATURAL_SIZE, WALL_TWO_TARGET_WIDTH)

/** WORLD POSITION — SAFE TO TUNE (visible floor point) — between the Projects area and the kitchen. */
const WALL_TWO_VISIBLE_POSITION = { x: 1380, y: 700 }
/** Wall2.png is already ~centered in its own canvas (off by <1 native px), so only the usual vertical padding-below-content correction is needed. */
const WALL_TWO_POSITION = {
  x: WALL_TWO_VISIBLE_POSITION.x,
  y:
    WALL_TWO_VISIBLE_POSITION.y +
    (WALL_TWO_NATURAL_SIZE.height - WALL_TWO_CONTENT_BBOX.maxY) *
      WALL_TWO_SCALE,
}

/**
 * Natural pixel dimensions of "Wall3.png" — like Wall2, a fully opaque
 * 32px-wide canvas (content bbox = whole canvas), just shorter. Rendered at
 * Wall2's width so both posts share the same on-screen pixel scale.
 */
const WALL_THREE_NATURAL_SIZE = { width: 32, height: 522 }
const WALL_THREE_CONTENT_BBOX = { minX: 0, minY: 0, maxX: 31, maxY: 521 }
/** Target rendered width (world px) — visible content reads at ~20px wide × ~335px tall. */
const WALL_THREE_TARGET_WIDTH = WALL_TWO_TARGET_WIDTH
const WALL_THREE_SCALE = scaleForWidth(
  WALL_THREE_NATURAL_SIZE,
  WALL_THREE_TARGET_WIDTH,
)

/** WORLD POSITION — SAFE TO TUNE (visible floor point) — between the living room and the Projects area. */
const WALL_THREE_VISIBLE_POSITION = { x: 780, y: 830 }
const WALL_THREE_POSITION = {
  x: WALL_THREE_VISIBLE_POSITION.x,
  y:
    WALL_THREE_VISIBLE_POSITION.y +
    (WALL_THREE_NATURAL_SIZE.height - WALL_THREE_CONTENT_BBOX.maxY) *
      WALL_THREE_SCALE,
}

/**
 * "glasswall.png" — a lit window panel (pre-cropped, fully opaque) filling
 * the low knee-wall gap in the bottom wall, between the stone pillar that
 * ends the left wall run (x≈1432) and the entrance door's left pillar
 * (x≈1547), both baked into the room background. Aspect ratio is locked:
 * only `transform.width` is set, and the height follows the texture.
 */
const GLASS_WALL_NATURAL_SIZE = { width: 439, height: 528 }
/**
 * Spans from the room's bottom-wall line (y=1200) down to the paving line —
 * a 138-unit height makes the locked-ratio width (~115) exactly fill the
 * pillar-to-pillar gap (x≈1432–1547).
 */
const GLASS_WALL_TOP = BOTTOM_WALL_INNER_Y
const GLASS_WALL_BOTTOM = 1338 // WORLD POSITION — SAFE TO TUNE
const GLASS_WALL_TARGET_WIDTH =
  ((GLASS_WALL_BOTTOM - GLASS_WALL_TOP) * GLASS_WALL_NATURAL_SIZE.width) /
  GLASS_WALL_NATURAL_SIZE.height
/** WORLD POSITION — SAFE TO TUNE — centered in the gap; bottom-center anchor. */
const GLASS_WALL_POSITION = { x: 1492, y: GLASS_WALL_BOTTOM }

export const wallObjects: WorldObject[] = [
  {
    id: 'wall-three',
    asset: 'walls.wallThree',
    label: 'WALL',
    position: WALL_THREE_POSITION,
    layer: 'object',
    transform: { width: WALL_THREE_TARGET_WIDTH },
    collision: contentAlignedCollider(
      WALL_THREE_POSITION,
      WALL_THREE_NATURAL_SIZE,
      WALL_THREE_CONTENT_BBOX,
      WALL_THREE_SCALE,
    ),
  },
  {
    id: 'wall-two',
    asset: 'walls.wallTwo',
    label: 'WALL',
    position: WALL_TWO_POSITION,
    layer: 'object',
    transform: { width: WALL_TWO_TARGET_WIDTH },
    collision: contentAlignedCollider(
      WALL_TWO_POSITION,
      WALL_TWO_NATURAL_SIZE,
      WALL_TWO_CONTENT_BBOX,
      WALL_TWO_SCALE,
    ),
  },
  {
    id: 'glass-wall',
    asset: 'walls.glassWall',
    label: 'GLASS WALL',
    position: GLASS_WALL_POSITION,
    layer: 'object',
    transform: { width: GLASS_WALL_TARGET_WIDTH },
    // No own `collision`: its whole footprint (y 1200–1330) lies inside the
    // solid bottom room-boundary wall (ROOM_BOUNDARY_COLLIDERS, y≥1200), so
    // it's already a wall to the player — a second collider would only
    // duplicate that (worldObjects.test.ts rejects colliders overlapping the
    // boundary walls). No interaction or message: pure architecture.
  },
]
