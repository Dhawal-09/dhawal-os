import type { WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  contentAlignedCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * Decorative architectural wall panels (assets/world/Walls/*), placed in
 * the open gap between the PROJECTS desk cluster (ends x1125) and the
 * HOBBIES/Entrance-plant cluster (starts x1275 at y≥828) — verified clear
 * of every other room's collider before choosing this spot. Both panels
 * intentionally extend up into the top room-boundary wall band (y<310,
 * `TOP_WALL_INNER_Y` in worldObjectHelpers.ts) — the same "embedded in the
 * wall by design" precedent as the entrance-hook, appropriate
 * here since these literally depict wall material.
 *
 * Both get a `contentAlignedCollider` sized to their own real visible
 * footprint — "the whole wall" is solid, not just a placeholder box.
 */

/**
 * Natural pixel dimensions of "Wall one.png", read directly from the
 * source file. Unlike every other asset integrated so far, its visible
 * content is NOT horizontally centered in its canvas (it's flush to the
 * left edge, with all the padding on the right) — `WALL_ONE_CONTENT_BBOX`
 * records the measured opaque region, and `wallOnePosition` below corrects
 * for this asymmetry on both axes (not just the usual vertical
 * padding-below-content correction every other room uses).
 */
const WALL_ONE_NATURAL_SIZE = { width: 166, height: 716 }
const WALL_ONE_CONTENT_BBOX = { minX: 0, minY: 16, maxX: 113, maxY: 714 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~80px wide × ~495px tall. */
const WALL_ONE_TARGET_WIDTH = 69.9
const WALL_ONE_SCALE = scaleForWidth(WALL_ONE_NATURAL_SIZE, WALL_ONE_TARGET_WIDTH)

/**
 * Converts a desired *visible content center/floor point* into the actual
 * `position` (canvas anchor) needed to produce it — generalizes the usual
 * vertical-only padding correction (kitchen.ts/entrance.ts/livingRoom.ts) to
 * also correct horizontally, since this asset's content isn't centered in
 * its canvas.
 */
function wallOnePositionForVisibleCenter(visible: {
  x: number
  y: number
}): { x: number; y: number } {
  const contentCenterX =
    (WALL_ONE_CONTENT_BBOX.minX + WALL_ONE_CONTENT_BBOX.maxX) / 2
  const canvasCenterX = WALL_ONE_NATURAL_SIZE.width / 2
  const paddingBelowContent =
    WALL_ONE_NATURAL_SIZE.height - WALL_ONE_CONTENT_BBOX.maxY
  return {
    x: visible.x + (canvasCenterX - contentCenterX) * WALL_ONE_SCALE,
    y: visible.y + paddingBelowContent * WALL_ONE_SCALE,
  }
}

/** WORLD POSITION — SAFE TO TUNE (the visible floor point, not the padded-canvas anchor below) — in the verified-clear gap between the Projects and Hobbies furniture clusters. */
const WALL_ONE_VISIBLE_POSITION = { x: 800, y: 800 }
const WALL_ONE_POSITION = wallOnePositionForVisibleCenter(
  WALL_ONE_VISIBLE_POSITION,
)

/**
 * Natural pixel dimensions of "Wall2.png", read directly from the source
 * file — a fully opaque canvas (no transparency at all; verified against
 * the pixel data), so its "content bbox" is simply the whole canvas.
 * Placed immediately beside Wall one, same baseline.
 */
const WALL_TWO_NATURAL_SIZE = { width: 32, height: 856 }
const WALL_TWO_CONTENT_BBOX = { minX: 0, minY: 0, maxX: 31, maxY: 855 }
/** Target rendered width (world px) — visible content reads at ~20px wide × ~550px tall, a taller/slimmer companion post beside Wall one. */
const WALL_TWO_TARGET_WIDTH = 20.56
const WALL_TWO_SCALE = scaleForWidth(WALL_TWO_NATURAL_SIZE, WALL_TWO_TARGET_WIDTH)

/** WORLD POSITION — SAFE TO TUNE (visible floor point) — immediately right of Wall one, same baseline. */
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
    id: 'wall-one',
    asset: 'walls.wallOne',
    label: 'WALL',
    position: WALL_ONE_POSITION,
    layer: 'object',
    transform: { width: WALL_ONE_TARGET_WIDTH },
    collision: contentAlignedCollider(
      WALL_ONE_POSITION,
      WALL_ONE_NATURAL_SIZE,
      WALL_ONE_CONTENT_BBOX,
      WALL_ONE_SCALE,
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
