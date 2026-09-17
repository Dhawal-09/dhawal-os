import type { WorldObject } from '../WorldObject'
import {
  contentAlignedCollider,
  deskCollider,
  scaleForHeight,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * BOTTOM-MIDDLE: the entrance door, embedded in the bottom wall band. It is
 * decorative/physical-only this phase — no open/close/teleport behavior
 * (there is none yet; PHASE 09.1 / PHASE 10B.1 both exclude it).
 */

/** Natural pixel dimensions of the approved door PNG (assets/world/structural/door.png), read directly from the source file. */
const DOOR_NATURAL_SIZE = { width: 141, height: 185 }

/** Target rendered height (world px) — a door's height against the wall is the dimension that actually matters; width follows the PNG's own aspect ratio. Reproduces the previous `DOOR_SCALE = 1` (native size) exactly. */
const DOOR_TARGET_HEIGHT = 185
const DOOR_SCALE = scaleForHeight(DOOR_NATURAL_SIZE, DOOR_TARGET_HEIGHT)

/** The door's art fills almost its entire canvas (verified: opaque pixels cover ~93% of it) — only a thin anti-aliased edge is trimmed from the footprint. */
const DOOR_FOOTPRINT = { widthFraction: 0.9, heightFraction: 0.95 }

/**
 * ABOUT ME / ENTRANCE sitting nook — a small, cozy seating area assembled
 * from the approved Entrance assets (assets/world/Entrance/*), placed near
 * the door. Each piece gets a real collision box matching its own measured
 * content bbox exactly (`contentAlignedCollider` — same approach as the
 * bed's), never a hand-picked placeholder size — no new interaction, though.
 *
 * The lounge chair is ONE approved asset (LaugeChair.png) instantiated as
 * two independent WorldObjects (`entrance-chair-left` / `entrance-chair-right`)
 * that both reference the same `entrance.chair` manifest id — never a
 * second file or a second manifest entry. Each instance keeps its own `id`
 * and `visible` position argument below, so moving one chair (retuning only
 * its own `entranceObject(...)` call) never touches the other.
 *
 * Every Entrance PNG is an AI-exported, mostly-transparent canvas with the
 * real artwork centered inside it (same shape as the Kitchen assets — see
 * kitchen.ts's block comment). `ENTRANCE_ASSET_CONTENT_BBOX` records each
 * asset's real opaque content, measured directly from its pixel data, and
 * every asset here is also horizontally centered within its own canvas
 * (verified per-file), so `entrancePositionForFloorPoint` only has to
 * correct the vertical padding-below-content offset — identical approach to
 * `kitchenPositionForFloorPoint`.
 */

/** Natural pixel dimensions of each approved Entrance PNG, read directly from the source files (assets/world/Entrance/*). */
const ENTRANCE_ASSET_NATURAL_SIZE = {
  chair: { width: 1024, height: 765 }, // LaugeChair.png
  table: { width: 1024, height: 765 }, // table1-Photoroom.png
  hook: { width: 1024, height: 765 }, // Hook.png
  mat: { width: 2400, height: 1792 }, // mat.png
  painting: { width: 2400, height: 1792 }, // Photo.png
  plant: { width: 1024, height: 765 }, // plant-Photoroom.png
} as const

/** Measured opaque/visible-pixel bounding box per asset (alpha scan) — see the block comment above. */
const ENTRANCE_ASSET_CONTENT_BBOX = {
  chair: { minX: 304, minY: 146, maxX: 718, maxY: 604 },
  table: { minX: 303, minY: 206, maxX: 720, maxY: 606 },
  hook: { minX: 327, minY: 306, maxX: 696, maxY: 446 },
  mat: { minX: 763, minY: 623, maxX: 1635, maxY: 1196 },
  painting: { minX: 139, minY: 114, maxX: 2260, maxY: 1677 },
  plant: { minX: 345, minY: 183, maxX: 685, maxY: 613 },
} as const

/**
 * Target rendered *width* (world px) per Entrance asset — this is the
 * full (padded) canvas width, not the visible content width, exactly like
 * `KITCHEN_TARGET_WIDTH`; each number was chosen so the asset's *visible*
 * content reads at roughly the intended in-nook scale (chair ~110px wide,
 * table ~70px, hook ~90px, painting ~180px) once the canvas's own padding
 * fraction is accounted for. Every asset gets its own independent number —
 * change one to resize just that asset.
 *
 * `mat` is the one exception: its visible content height is capped at ~36px
 * (rather than the ~150px-wide mat this fraction would otherwise imply) —
 * the only floor gap available directly in front of the door, between the
 * CERTIFICATES marker's collider (bottom edge y1148) and the door's own
 * collider (top edge y1194.25), is ~46px tall. Now that the mat has a real,
 * asset-sized collider of its own, a larger one would overlap CERTIFICATES.
 */
const ENTRANCE_TARGET_WIDTH = {
  chair: 271.4,
  table: 171.9,
  hook: 169.7,
  mat: 151,
  painting: 123.7,
  plant: 151.3, // visible content ~110px wide × ~139px tall potted plant
} as const

/** The uniform scale each target width implies — used for the padding-offset math below (`entrancePositionForFloorPoint`), independent of the actual rendered Sprite (which sizes itself from `transform.width`). */
const ENTRANCE_SCALE = {
  chair: scaleForWidth(
    ENTRANCE_ASSET_NATURAL_SIZE.chair,
    ENTRANCE_TARGET_WIDTH.chair,
  ),
  table: scaleForWidth(
    ENTRANCE_ASSET_NATURAL_SIZE.table,
    ENTRANCE_TARGET_WIDTH.table,
  ),
  hook: scaleForWidth(
    ENTRANCE_ASSET_NATURAL_SIZE.hook,
    ENTRANCE_TARGET_WIDTH.hook,
  ),
  mat: scaleForWidth(ENTRANCE_ASSET_NATURAL_SIZE.mat, ENTRANCE_TARGET_WIDTH.mat),
  painting: scaleForWidth(
    ENTRANCE_ASSET_NATURAL_SIZE.painting,
    ENTRANCE_TARGET_WIDTH.painting,
  ),
  plant: scaleForWidth(
    ENTRANCE_ASSET_NATURAL_SIZE.plant,
    ENTRANCE_TARGET_WIDTH.plant,
  ),
} as const

/** Same padding-correction idea as `kitchenPositionForFloorPoint` (kitchen.ts) — converts a desired *visible floor/wall point* into the `position` that actually produces it, given each canvas's own padding-below-content. */
function entrancePositionForFloorPoint(
  visible: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: { readonly maxY: number },
  scale: number,
): { x: number; y: number } {
  const paddingBelowContent = naturalSize.height - contentBBox.maxY
  return { x: visible.x, y: visible.y + paddingBelowContent * scale }
}

/** Builds an Entrance WorldObject's `position`/`transform`/`collision` from its intended visible floor/wall point and the asset's own independent target width — mirrors `kitchenObject` (kitchen.ts), plus a `contentAlignedCollider` box sized exactly to the asset's own measured content bbox (same approach as the bed's collider in bedroomRoom.ts) — every entrance asset is solid at its real visible size, never a placeholder-sized box. */
function entranceObject(
  id: string,
  asset: keyof typeof ENTRANCE_ASSET_NATURAL_SIZE,
  label: string,
  visible: { x: number; y: number },
): WorldObject {
  const position = entrancePositionForFloorPoint(
    visible,
    ENTRANCE_ASSET_NATURAL_SIZE[asset],
    ENTRANCE_ASSET_CONTENT_BBOX[asset],
    ENTRANCE_SCALE[asset],
  )
  return {
    id,
    asset: `entrance.${asset}`,
    label,
    position,
    layer: 'object',
    transform: { width: ENTRANCE_TARGET_WIDTH[asset] },
    collision: contentAlignedCollider(
      position,
      ENTRANCE_ASSET_NATURAL_SIZE[asset],
      ENTRANCE_ASSET_CONTENT_BBOX[asset],
      ENTRANCE_SCALE[asset],
    ),
  }
}

export const entranceObjects: WorldObject[] = [
  {
    id: 'door',
    asset: 'structural.door',
    label: 'DOOR',
    position: { x: 960, y: 1370 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { height: DOOR_TARGET_HEIGHT },
    collision: deskCollider(
      { x: 960, y: 1370 },
      DOOR_NATURAL_SIZE,
      DOOR_SCALE,
      DOOR_FOOTPRINT,
    ),
    // No `interaction` yet — physical/visual only this phase; door open/
    // close and room transition are explicitly out of scope.
  },
  // Sitting nook — chair / table / chair, left to right, sharing one
  // baseline. Sits in the open floor gap between the CERTIFICATES marker
  // (aboutRoom.ts, centered x960) and the RESUME desk cluster (centered
  // x1480), clear of both.
  entranceObject('entrance-chair-left', 'chair', 'LOUNGE CHAIR', {
    x: 1770,
    y: 1040,
  }), // WORLD POSITION — SAFE TO TUNE
  entranceObject('entrance-side-table', 'table', 'SIDE TABLE', {
    x: 1675,
    y: 1080,
  }), // WORLD POSITION — SAFE TO TUNE — centered between the two chairs
  entranceObject('entrance-chair-right', 'chair', 'LOUNGE CHAIR', {
    x: 1580,
    y: 1040,
  }), // WORLD POSITION — SAFE TO TUNE — same asset as entrance-chair-left, instantiated a second time
  // Painting, centered behind the two-chair arrangement (x1175, matching
  // the side table), hung on the bottom/entrance wall band the door is
  // embedded in.
  entranceObject('entrance-painting', 'painting', 'WALL PAINTING', {
    x: 1675,
    y: 890,
  }), // WORLD POSITION — SAFE TO TUNE
  // Coat hook, mounted in the bottom-right corner near the sitting nook,
  // clear of the RESUME desk cluster and the right room-boundary wall.
  entranceObject('entrance-hook', 'hook', 'COAT HOOK', { x: 1840, y: 850 }), // WORLD POSITION — SAFE TO TUNE
  // Doormat, directly in front of the door, aligned on its x with the
  // door's own position. y is tuned to fit its collider inside the narrow
  // floor gap between CERTIFICATES and the door (see ENTRANCE_TARGET_WIDTH's
  // comment on `mat`).
  entranceObject('entrance-mat', 'mat', 'DOORMAT', { x: 960, y: 1188 }), // WORLD POSITION — SAFE TO TUNE
  // Potted plants — one approved asset (plant-Photoroom.png), instantiated
  // four times as independent WorldObjects, same "one asset, many
  // instances, only position differs" pattern as the two lounge chairs
  // above. These four starting spots are placeholders on open floor only
  // (spread out, clear of every other room's furniture/markers) — meant to
  // be dragged/retuned into their final positions later; only their count
  // and shared asset matter right now, not their exact placement.
  entranceObject('entrance-plant', 'plant', 'POTTED PLANT', {
    x: 1840,
    y: 990,
  }), // WORLD POSITION — SAFE TO TUNE
  entranceObject('entrance-plant-2', 'plant', 'POTTED PLANT', {
    x: 500,
    y: 950,
  }), // WORLD POSITION — SAFE TO TUNE
  entranceObject('entrance-plant-3', 'plant', 'POTTED PLANT', {
    x: 1300,
    y: 950,
  }), // WORLD POSITION — SAFE TO TUNE
  entranceObject('entrance-plant-4', 'plant', 'POTTED PLANT', {
    x: 1700,
    y: 820,
  }), // WORLD POSITION — SAFE TO TUNE
]
