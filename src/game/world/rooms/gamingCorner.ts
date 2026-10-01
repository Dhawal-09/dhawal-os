import type { WorldObject } from '../WorldObject'
import {
  contentAlignedCollider,
  placeByVisibleContent,
} from './worldObjectHelpers'

/**
 * MIDDLE ROOM: the Gaming Corner — a compact recharge setup tucked into the
 * bottom-left pocket of the open central floor (between the partition wall
 * at x≈780 and the Hobbies back wall at y≈828). That pocket is a dead end,
 * so the main routes — Projects ↔ living-room gap along the top, and the
 * entrance gap on the right (x≈1390–1480) — stay fully open.
 *
 * Only the four approved assets in assets/world/MiddleRoom/ exist: mat,
 * vertical gaming table (monitor/controller/plant/gadget baked into the
 * art), beanbag, and the console storage shelf. No PC tower, headset or
 * floor bin art exists yet, so none is added (per "do not invent missing
 * assets"). The "experience" content marker (Career Timeline stand, moved
 * here from the living room) is the corner's only interaction.
 *
 * Each piece is placed by its *visible* content via `placeByVisibleContent`,
 * so the numbers below are what you see in-world. Array order is draw order
 * (World.ts), so the mat comes first and renders under everything else.
 */

interface ContentBBox {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/** Natural canvas size + opaque-content bbox (alpha > 128 scan) of each MiddleRoom PNG. */
const MAT_NATURAL_SIZE = { width: 2400, height: 1309 } // Hall_mat.png
const MAT_CONTENT_BBOX: ContentBBox = {
  minX: 370,
  minY: 190,
  maxX: 2029,
  maxY: 1148,
}
const TABLE_NATURAL_SIZE = { width: 1024, height: 1536 } // Table (2)-Photoroom.png
const TABLE_CONTENT_BBOX: ContentBBox = {
  minX: 408,
  minY: 271,
  maxX: 615,
  maxY: 1259,
}
const BEANBAG_NATURAL_SIZE = { width: 1024, height: 559 } // bag-Photoroom.png
const BEANBAG_CONTENT_BBOX: ContentBBox = {
  minX: 291,
  minY: 86,
  maxX: 733,
  maxY: 495,
}
const SHELF_NATURAL_SIZE = { width: 1024, height: 559 } // console-Photoroom.png
const SHELF_CONTENT_BBOX: ContentBBox = {
  minX: 248,
  minY: 103,
  maxX: 776,
  maxY: 469,
}

const MAT_PLACEMENT = placeByVisibleContent(
  MAT_NATURAL_SIZE,
  MAT_CONTENT_BBOX,
  350, // visible width — SAFE TO TUNE
  { x: 1070, y: 810 }, // WORLD POSITION — SAFE TO TUNE — spans x≈905–1255, y≈598–800
)
/** Vertical (long axis top→bottom), monitor facing left toward the beanbag; its left edge overlaps the mat's right edge. */
const TABLE_PLACEMENT = placeByVisibleContent(
  TABLE_NATURAL_SIZE,
  TABLE_CONTENT_BBOX,
  44, // visible width — SAFE TO TUNE
  { x: 1210, y: 780 }, // WORLD POSITION — SAFE TO TUNE — right side of the mat, spans x≈1168–1212, y≈590–800; keeps the entrance→Projects route (x≈1212–1330) open
)
const BEANBAG_PLACEMENT = placeByVisibleContent(
  BEANBAG_NATURAL_SIZE,
  BEANBAG_CONTENT_BBOX,
  105, // visible width — SAFE TO TUNE (close to the bedroom beanbag's scale)
  { x: 965, y: 780 }, // WORLD POSITION — SAFE TO TUNE — left side of the mat, facing the monitor
)
const SHELF_PLACEMENT = placeByVisibleContent(
  SHELF_NATURAL_SIZE,
  SHELF_CONTENT_BBOX,
  130, // visible width — SAFE TO TUNE
  { x: 1105, y: 655 }, // WORLD POSITION — SAFE TO TUNE — back (top) edge of the mat
)

/** WORLD POSITION — SAFE TO TUNE. Center of the Career Timeline stand (center-anchored); its collider follows it. Left of the mat, between the partition wall (x≈790) and the beanbag — approached from the open floor above. */
const EXPERIENCE_POSITION = { x: 980, y: 570 }
/** Rendered width (world px) of the Career Timeline canvas — SAFE TO TUNE; the collider below scales with it. */
const EXPERIENCE_TARGET_WIDTH = 126
/** CareerTimeline.png's natural canvas + opaque-content bbox (alpha > 128 scan). */
const EXPERIENCE_NATURAL_SIZE = { width: 640, height: 1088 }
const EXPERIENCE_CONTENT_BBOX: ContentBBox = {
  minX: 32,
  minY: 40,
  maxX: 608,
  maxY: 1008,
}
const EXPERIENCE_SCALE = EXPERIENCE_TARGET_WIDTH / EXPERIENCE_NATURAL_SIZE.width
/**
 * The stand is center-anchored, so `contentAlignedCollider` (which assumes
 * a bottom-center anchor) gets the equivalent bottom-center floor point.
 */
const EXPERIENCE_COLLIDER = contentAlignedCollider(
  {
    x: EXPERIENCE_POSITION.x,
    y:
      EXPERIENCE_POSITION.y +
      (EXPERIENCE_NATURAL_SIZE.height / 2) * EXPERIENCE_SCALE,
  },
  EXPERIENCE_NATURAL_SIZE,
  EXPERIENCE_CONTENT_BBOX,
  EXPERIENCE_SCALE,
)
/** Larger than the default INTERACTION_RADIUS (70): the asset-sized collider keeps the player's feet ≥91px from the center when approaching from below. */
const EXPERIENCE_INTERACTION_RADIUS = 120

/** Collider matching a width-only-scaled sprite's visible content — same approach as hobbiesRoom.ts. */
function footprintCollider(
  placement: {
    position: { x: number; y: number }
    transform: { width: number }
  },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: ContentBBox,
) {
  return contentAlignedCollider(
    placement.position,
    naturalSize,
    contentBBox,
    placement.transform.width / naturalSize.width,
  )
}

export const gamingCornerObjects: WorldObject[] = [
  {
    id: 'gaming-mat',
    asset: 'gaming.mat',
    label: 'GAMING MAT',
    position: MAT_PLACEMENT.position,
    layer: 'object',
    transform: MAT_PLACEMENT.transform,
    // No `collision` — a floor surface, not an obstacle.
  },
  {
    id: 'gaming-table',
    asset: 'gaming.table',
    label: 'GAMING TABLE',
    position: TABLE_PLACEMENT.position,
    layer: 'object',
    transform: TABLE_PLACEMENT.transform,
    collision: footprintCollider(
      TABLE_PLACEMENT,
      TABLE_NATURAL_SIZE,
      TABLE_CONTENT_BBOX,
    ),
  },
  {
    id: 'gaming-beanbag',
    asset: 'gaming.beanbag',
    label: 'BEANBAG',
    position: BEANBAG_PLACEMENT.position,
    layer: 'object',
    transform: BEANBAG_PLACEMENT.transform,
    collision: footprintCollider(
      BEANBAG_PLACEMENT,
      BEANBAG_NATURAL_SIZE,
      BEANBAG_CONTENT_BBOX,
    ),
  },
  {
    id: 'gaming-storage-shelf',
    asset: 'gaming.storageShelf',
    label: 'GAMING SHELF',
    position: SHELF_PLACEMENT.position,
    layer: 'object',
    transform: SHELF_PLACEMENT.transform,
    collision: footprintCollider(
      SHELF_PLACEMENT,
      SHELF_NATURAL_SIZE,
      SHELF_CONTENT_BBOX,
    ),
  },
  // Last entry so it always draws on top of the mat and furniture above
  // (World.ts draws array order, not a Y-sort).
  {
    id: 'experience',
    asset: 'content.experience',
    label: 'EXPERIENCE',
    position: EXPERIENCE_POSITION,
    layer: 'object',
    // Center-anchored; the collider matches the visible stand exactly.
    transform: {
      width: EXPERIENCE_TARGET_WIDTH,
      anchor: { x: 0.5, y: 0.5 },
    },
    collision: EXPERIENCE_COLLIDER,
    interaction: {
      radius: EXPERIENCE_INTERACTION_RADIUS,
      action: 'OPEN_EXPERIENCE',
    },
    message: { type: 'interactive', text: 'Wanna see where he worked?' },
  },
]
