import type { Collider, WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

/**
 * Placeholder collider footprint for content-area "furniture" — deliberately
 * a plain local constant, not imported from the visual placeholder size in
 * WorldObject.ts. The two happen to match for now (so the dev collision
 * debug overlay lines up with the placeholder box) but are independently
 * configurable, per COLLISION_SPEC.md ("collision is independent from
 * rendering") — swapping in real furniture art later only touches the
 * visual size, never this.
 */
const PLACEHOLDER_COLLIDER_SIZE = 96

function centeredCollider(
  position: { x: number; y: number },
  size: number = PLACEHOLDER_COLLIDER_SIZE,
): Collider {
  return {
    x: position.x - size / 2,
    y: position.y - size / 2,
    width: size,
    height: size,
  }
}

/**
 * PHASE 10B.1 CLEANUP — a `centeredCollider` whose bottom edge is clipped to
 * never exceed `bottomLimit`. Used only where a marker's default symmetric
 * box would otherwise redundantly overlap an adjacent obstacle (here: the
 * "education"/"resume" markers vs. `ROOM_BOUNDARY_COLLIDERS`' bottom wall —
 * see the review below). Only the bottom edge moves; the top/left/right
 * edges — and therefore every non-southward approach's collision behavior,
 * including reachability — are byte-for-byte identical to
 * `centeredCollider`. The smallest possible change that removes the
 * overlap, not a reposition or resize on any other axis.
 */
function centeredColliderClippedToBottom(
  position: { x: number; y: number },
  size: number,
  bottomLimit: number,
): Collider {
  const full = centeredCollider(position, size)
  const bottom = Math.min(full.y + full.height, bottomLimit)
  return { ...full, height: bottom - full.y }
}

/** Placeholder proximity radius (INTERACTION_SPEC.md example uses a comparable value) — independently tunable per object later. */
const INTERACTION_RADIUS = 70

/**
 * Converts a desired *rendered width* (world px) into the uniform scale
 * that produces it — height follows automatically from the asset's own
 * aspect ratio, so this only ever changes "how big", never the art's
 * proportions (PHASE-10A "Asset scale" forbids distortion). Use this (or
 * `scaleForHeight`) instead of hand-picking a raw scale multiplier: every
 * `*_SCALE` constant below is authored as a target pixel size, so each
 * asset's rendered size is a single, independently-editable number.
 */
function scaleForWidth(
  naturalSize: { readonly width: number },
  targetWidth: number,
): number {
  return targetWidth / naturalSize.width
}

/** Same idea as `scaleForWidth`, but pick the target by height instead — for assets where height is the dimension that actually matters (e.g. a door's height against the wall). */
function scaleForHeight(
  naturalSize: { readonly height: number },
  targetHeight: number,
): number {
  return targetHeight / naturalSize.height
}

/**
 * PHASE 10B.1 — room-boundary (perimeter wall) collision. Floor.png's
 * visible architectural walls sit *inset* from the canonical 1920×1440
 * canvas edge (a dark margin surrounds the room art itself); before this,
 * CollisionSystem only clamped movement to the full canvas rect, so the
 * player could walk straight through the wall graphics into that margin —
 * a real, visible bug.
 *
 * These four insets mark the wall's *inner* edge — where the walkable tile
 * floor actually begins — measured directly from Floor.png's pixel data
 * (scanning for the transition from the wall/margin's cool blue-gray tones
 * to the floor tile's warm tan tones, sampled at several points along each
 * wall to avoid window/lamp/pillar recesses) and cross-checked visually
 * against the rendered dev collision overlay. Where the measured inset
 * varied along a wall (the window bays and the small wall-mounted panel
 * stack on the right wall both recess by different amounts), the deeper
 * (safer) value was kept — the player must never visually overlap a wall,
 * even if that costs a few px of walkable floor near a shallower recess.
 *
 * Intentionally *not* WorldObject entries: a wall isn't a positioned,
 * labeled, asset-bearing thing the way furniture is (WORLD_SPEC.md), so it
 * doesn't belong in `worldObjects` below — it resolves through the exact
 * same AABB obstacle list via `CollisionSystem.fromWorldObjects`'s
 * `extraObstacles` parameter, never a change to the collision algorithm
 * itself. Floor.png itself is never a collision object — this is
 * independent, hand-authored geometry describing what the art *depicts*,
 * per COLLISION_SPEC.md "collision is independent from rendering".
 */
const TOP_WALL_INNER_Y = 310
const BOTTOM_WALL_INNER_Y = 1200
const LEFT_WALL_INNER_X = 140
const RIGHT_WALL_INNER_X = 1850

/**
 * The `door` WorldObject (below) is decorative/physical-only — no
 * `interaction` field, no open/close/teleport behavior (PHASE 09.1 "Do not
 * fix future things"; PHASE 10B.1 "follow the existing door interaction
 * design" — there is none yet). It sits embedded in this same bottom wall
 * band, so the boundary stays fully solid here: no opening is carved for
 * it. `door`'s own collider still exists independently and mostly overlaps
 * this band, which is harmless (redundant AABB obstacles resolve
 * identically to one).
 */
export const ROOM_BOUNDARY_COLLIDERS: readonly Collider[] = [
  // top
  { x: 0, y: 0, width: WORLD_WIDTH, height: TOP_WALL_INNER_Y },
  // bottom
  {
    x: 0,
    y: BOTTOM_WALL_INNER_Y,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT - BOTTOM_WALL_INNER_Y,
  },
  // left
  { x: 0, y: 0, width: LEFT_WALL_INNER_X, height: WORLD_HEIGHT },
  // right
  {
    x: RIGHT_WALL_INNER_X,
    y: 0,
    width: WORLD_WIDTH - RIGHT_WALL_INNER_X,
    height: WORLD_HEIGHT,
  },
]

/**
 * Natural pixel dimensions of each approved desk PNG
 * (assets/world/furniture/*.png), read directly from the source files —
 * never assumed (PHASE-10A "Asset scale"). Used only to size the collision
 * footprint below; the rendered Sprite itself sizes from its own texture at
 * runtime (see WorldObject.ts's createDeskSprite), so this never drives
 * distortion — it's collision-only bookkeeping.
 */
const DESK_NATURAL_SIZE = {
  mainWorkDesk: { width: 1279, height: 764 }, // desk_laptop.png
  educationDesk: { width: 920, height: 787 }, // desk_education.png
  resumeDesk: { width: 986, height: 828 }, // desk_resume_original.png
} as const

/**
 * Per-desk render scale, each authored as that desk's target rendered
 * *width* (world px) via `scaleForWidth` — never independent x/y (PHASE-10A
 * "Asset scale" forbids distortion), and never shared: resizing one desk
 * can no longer move the other two. The numbers below (358.12 / 257.6 /
 * 276.08) reproduce the previous shared `FURNITURE_SCALE = 0.28` exactly —
 * change one to resize just that desk.
 */
const MAIN_WORK_DESK_SCALE = scaleForWidth(DESK_NATURAL_SIZE.mainWorkDesk, 358.12)
const EDUCATION_DESK_SCALE = scaleForWidth(DESK_NATURAL_SIZE.educationDesk, 257.6)
const RESUME_DESK_SCALE = scaleForWidth(DESK_NATURAL_SIZE.resumeDesk, 276.08)

/**
 * A desk's collision footprint is the physical desk/legs area near the
 * bottom of the art — not the full sprite bounds, which also cover the
 * monitors/lamp/books rising above the desktop (PHASE-10A "Collision": the
 * visual PNG bounds and collision bounds are not necessarily identical).
 * Anchored to match the sprite's own (0.5, 1) anchor: `position` is the
 * floor point, so the collider's bottom edge sits flush with `position.y`
 * and its top edge only covers a fraction of the rendered height.
 */
function deskCollider(
  position: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  scale: number,
  footprint: { widthFraction: number; heightFraction: number },
): Collider {
  const renderedWidth = naturalSize.width * scale
  const renderedHeight = naturalSize.height * scale
  const width = renderedWidth * footprint.widthFraction
  const height = renderedHeight * footprint.heightFraction
  return {
    x: position.x - width / 2,
    y: position.y - height,
    width,
    height,
  }
}

/** The desk-body/legs area is roughly this fraction of the full rendered sprite — tuned by eye against the approved art, independently adjustable per desk later. */
const DESK_FOOTPRINT = { widthFraction: 0.7, heightFraction: 0.32 }

/**
 * Natural pixel dimensions of the approved door PNG, read directly from the
 * source file — never assumed (same discipline as `DESK_NATURAL_SIZE`).
 */
const DOOR_NATURAL_SIZE = { width: 141, height: 185 } // door.png

/**
 * Door render scale, authored as a target rendered *height* (world px) via
 * `scaleForHeight` — a door's height against the wall is the dimension that
 * actually matters; width follows automatically from the PNG's own aspect
 * ratio. 185 reproduces the previous `DOOR_SCALE = 1` (native size) exactly
 * — change it to resize the door.
 */
const DOOR_SCALE = scaleForHeight(DOOR_NATURAL_SIZE, 185)

/** The door's art fills almost its entire canvas (verified: opaque pixels cover ~93% of it) — only a thin anti-aliased edge is trimmed from the footprint. */
const DOOR_FOOTPRINT = { widthFraction: 0.9, heightFraction: 0.95 }

/**
 * Natural pixel dimensions of the approved bed PNG
 * (assets/world/structural/Bed.png), read directly from the source file.
 * Unlike the desks/door, this PNG carries a large soft vignette/glow border
 * baked into its alpha channel — real transparency (verified: fully
 * transparent at all four corners, not a baked checkerboard), but padded
 * well beyond the actual bed/nightstands/rug silhouette. `BED_CONTENT_BBOX`
 * below records where the solid artwork actually sits inside that canvas,
 * measured directly from the pixel data (not guessed) so the collision
 * footprint below can skip the padding entirely, per PHASE 09.1 "Bed
 * collision": collision must cover the physical bed footprint, not the
 * transparent (or soft-glow) space around it.
 */
const BED_NATURAL_SIZE = { width: 1436, height: 1024 } // Bed.png
const BED_CONTENT_BBOX = { minX: 377, minY: 113, maxX: 1162, maxY: 901 }

/**
 * Bed render scale, authored as a target rendered *width* (world px) via
 * `scaleForWidth` — chosen so it reads at roughly the same in-room scale as
 * the desks while still fitting the top-left corner without overlapping
 * `main-work-desk` (PHASE 09.1 "Bed collision"). 645.12 reproduces the
 * previous `BED_SCALE = 0.42` exactly — change it to resize the bed.
 */
const BED_SCALE = scaleForWidth(BED_NATURAL_SIZE, 645.12)

/**
 * A collision box derived from an asset's *actual visible content*, not its
 * full (possibly padded) canvas — for art like the bed, where a soft
 * vignette border makes a simple bottom-anchored fraction (as `deskCollider`
 * uses) inaccurate. `contentBBox` is measured once from the real pixel data
 * (see `BED_CONTENT_BBOX`) and mapped into world space the same way the
 * Sprite's own (0.5, 1) anchor maps the canvas into world space, so this
 * stays in sync with `createDeskSprite`'s rendering without duplicating any
 * rendering logic here.
 */
function contentAlignedCollider(
  position: { x: number; y: number },
  naturalCanvasSize: { readonly width: number; readonly height: number },
  contentBBox: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  },
  scale: number,
): Collider {
  // Anchor (0.5, 1): the canvas's horizontal center and bottom edge sit at `position`.
  const anchorX = naturalCanvasSize.width / 2
  const anchorY = naturalCanvasSize.height

  const worldX = (naturalX: number) => position.x + (naturalX - anchorX) * scale
  const worldY = (naturalY: number) => position.y + (naturalY - anchorY) * scale

  const x = worldX(contentBBox.minX)
  const y = worldY(contentBBox.minY)
  return {
    x,
    y,
    width: worldX(contentBBox.maxX) - x,
    height: worldY(contentBBox.maxY) - y,
  }
}

/**
 * The bed's Sprite renders from the full (padded) canvas, so its anchor
 * point — `position`, the canvas's bottom-center — sits below the visible
 * rug/footboard by the padding measured in `BED_CONTENT_BBOX`. This offset
 * converts a *desired visible floor point* into the `position` value that
 * actually produces it, so `bedPosition` below can be authored in terms of
 * "where the bed should visually sit" rather than requiring the padding
 * math to be redone by hand every time it's retuned.
 */
function bedPositionForVisibleFloorPoint(visible: { x: number; y: number }): {
  x: number
  y: number
} {
  const paddingBelowContent = BED_NATURAL_SIZE.height - BED_CONTENT_BBOX.maxY
  return {
    x: visible.x,
    y: visible.y + paddingBelowContent * BED_SCALE,
  }
}

/**
 * KITCHEN FURNITURE PLACEMENT PASS — visual only, no collision (see this
 * phase's brief: "Do NOT solve walkability/collision in this pass"). Every
 * kitchen WorldObject below therefore has no `collision` field, the same
 * documented way `aboutMe` opts out of being a physical obstacle.
 *
 * The approved Kitchen PNGs (assets/world/Kitchen/*.png) are AI-exported on
 * an oversized, mostly-transparent canvas with the actual artwork centered
 * inside it — the same padding problem `BED_CONTENT_BBOX` solves for the
 * bed. Measured directly from each file's pixel data (never guessed), the
 * bounding boxes below record where each asset's real content sits inside
 * its canvas. Unlike the bed, these assets are also horizontally centered
 * within their canvas (verified per-file), so `kitchenPositionForFloorPoint`
 * only needs to correct the vertical (padding-below-content) offset — same
 * idea as `bedPositionForVisibleFloorPoint`, generalized to any asset.
 */
function kitchenPositionForFloorPoint(
  visible: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: { readonly maxY: number },
  scale: number,
): { x: number; y: number } {
  const paddingBelowContent = naturalSize.height - contentBBox.maxY
  return { x: visible.x, y: visible.y + paddingBelowContent * scale }
}

const KITCHEN_ASSET_NATURAL_SIZE = {
  mainCounter: { width: 2400, height: 1792 }, // MainTable.png
  sideCounter: { width: 2200, height: 1792 }, // Main table2.png
  fridge: { width: 2400, height: 1792 }, // Fridge1.png (developer magnets already on the door)
  cooktop: { width: 2400, height: 1792 }, // Stove.png
  coffeeMachine: { width: 1024, height: 765 }, // coffee-Makaer.png
  hangingPans: { width: 1200, height: 896 }, // Hanging Pans.png
  wallShelf: { width: 1200, height: 896 }, // Jars.png
  diningSet: { width: 2400, height: 1792 }, // Dining.png (table + 4 chairs, one asset)
  light: { width: 1200, height: 896 }, // Right.png
  propHolder: { width: 142, height: 241 }, // Utensil/holder.png
  propSalt: { width: 105, height: 184 }, // Utensil/salt.png
  propBowl: { width: 117, height: 117 }, // Utensil/bowl.png
  propPlate: { width: 138, height: 113 }, // Utensil/plate.png
} as const

/** Measured opaque-pixel bounding box per asset — see the block comment above `kitchenPositionForFloorPoint`. */
const KITCHEN_ASSET_CONTENT_BBOX = {
  mainCounter: { minX: 867, minY: 520, maxX: 1932, maxY: 1178 },
  sideCounter: { minX: 233, minY: 316, maxX: 966, maxY: 589 },
  fridge: { minX: 936, minY: 294, maxX: 1463, maxY: 1440 },
  cooktop: { minX: 778, minY: 563, maxX: 1621, maxY: 1256 },
  coffeeMachine: { minX: 399, minY: 245, maxX: 624, maxY: 518 },
  hangingPans: { minX: 134, minY: 139, maxX: 1065, maxY: 635 },
  wallShelf: { minX: 178, minY: 279, maxX: 1021, maxY: 597 },
  diningSet: { minX: 298, minY: 144, maxX: 2101, maxY: 1571 },
  light: { minX: 499, minY: 274, maxX: 712, maxY: 549 },
  propHolder: { minX: 24, minY: 30, maxX: 119, maxY: 210 },
  propSalt: { minX: 23, minY: 25, maxX: 76, maxY: 145 },
  propBowl: { minX: 6, minY: 22, maxX: 101, maxY: 94 },
  propPlate: { minX: 7, minY: 17, maxX: 131, maxY: 94 },
} as const

/**
 * Render scale per kitchen asset, each authored as that asset's target
 * rendered *width* (world px) via `scaleForWidth` — retuned to match the
 * reference layout ("kitchen layout.png"): the fridge sits at the *left*
 * end of the back-wall run (right after the main work desk), so the whole
 * run — fridge, main counter, side counter — has to fit in the narrower
 * strip between the desk and the right wall, smaller than the previous
 * pass's more spread-out arrangement.
 *
 * Every asset gets its own independent number — including the four
 * counter props, split out from a single shared `prop` ratio so each one
 * (holder/salt/bowl/plate) can be resized without moving the others. Every
 * value below reproduces the previous scale exactly; change one number to
 * resize just that asset.
 */
const KITCHEN_SCALE = {
  mainCounter: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.mainCounter, 408),
  sideCounter: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.sideCounter, 330),
  fridge: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.fridge, 360),
  cooktop: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.cooktop, 312),
  coffeeMachine: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.coffeeMachine, 245.76),
  hangingPans: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.hangingPans, 240),
  wallShelf: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.wallShelf, 216),
  diningSet: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.diningSet, 432),
  light: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.light, 192),
  propHolder: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.propHolder, 31.24),
  propSalt: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.propSalt, 23.1),
  propBowl: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.propBowl, 25.74),
  propPlate: scaleForWidth(KITCHEN_ASSET_NATURAL_SIZE.propPlate, 30.36),
} as const

/** Builds a kitchen WorldObject's `position` from its intended visible floor/counter point — see `kitchenPositionForFloorPoint`. */
function kitchenObject(
  id: string,
  asset: string,
  label: string,
  visible: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: { readonly maxY: number },
  scale: number,
): WorldObject {
  return {
    id,
    asset,
    label,
    position: kitchenPositionForFloorPoint(visible, naturalSize, contentBBox, scale),
    layer: 'object',
    scale,
    // No `collision` — visual placement pass only.
  }
}

/**
 * Room composition for the PHASE 10B 1920×1440 expansion. A spatial guide,
 * not a final furniture plan (see PHASE 10B "6. Room composition") — loose
 * thirds, each with real breathing room between objects:
 *
 * ```text
 *              LEFT (x<640)   MIDDLE (640-1280)   RIGHT (x>1280)
 * TOP    (y<480)   bed          (window — reserved)  main-work-desk + projects
 * MIDDLE (480-960) experience   about-me (=spawn)     skills
 * BOTTOM (y>960)   education-   certificates          resume-desk + resume
 *                  desk + edu.
 * ```
 *
 * "Reserved" zones (window/city, bookshelf, sofa — see the phase brief) are
 * deliberately left empty: no WorldObject occupies them yet, since no new
 * assets are added this phase. Every desk/door position below is its own
 * *visible floor point* — `bedPositionForVisibleFloorPoint` converts the
 * bed's padded-canvas quirk into the same terms so all positions read the
 * same way. Adding a new area/object requires only a new entry here plus an
 * asset — never a core-system change (WORLD_SPEC.md).
 *
 * Content-area markers are configured as blocking (`collision` set); "About
 * Me" is left non-blocking, as a real example of an object that
 * intentionally does not participate in collision (per COLLISION_SPEC.md —
 * not every visual object is automatically solid) — it also doubles as the
 * player's spawn point (GameScene.ts), so leaving it open keeps that spot
 * guaranteed-walkable by construction.
 */
export const worldObjects: WorldObject[] = [
  // -------------------------------------------------------------------
  // TOP-RIGHT: the PROJECTS workstation.
  // -------------------------------------------------------------------
  {
    id: 'main-work-desk',
    asset: 'furniture.mainWorkDesk',
    label: 'MAIN WORK DESK',
    position: { x: 1300, y: 300 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    scale: MAIN_WORK_DESK_SCALE,
    collision: deskCollider(
      { x: 1300, y: 300 },
      DESK_NATURAL_SIZE.mainWorkDesk,
      MAIN_WORK_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — the separate "projects" entry below owns OPEN_PROJECTS.
  },
  {
    id: 'projects',
    asset: 'content.projects',
    label: 'PROJECTS',
    // In front of (south of) main-work-desk, with a clear gap — see the
    // pairwise-overlap check in worldObjects.test.ts.
    position: { x: 1300, y: 390 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 1300, y: 390 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_PROJECTS' },
  },

  // -------------------------------------------------------------------
  // TOP-LEFT: the bedroom corner.
  // -------------------------------------------------------------------
  {
    id: 'bed',
    asset: 'structural.bed',
    label: 'BED',
    position: bedPositionForVisibleFloorPoint({ x: 220, y: 320 }), // WORLD POSITION — SAFE TO TUNE (the visible floor point, not the padded canvas anchor)
    layer: 'object',
    scale: BED_SCALE,
    collision: contentAlignedCollider(
      bedPositionForVisibleFloorPoint({ x: 220, y: 320 }),
      BED_NATURAL_SIZE,
      BED_CONTENT_BBOX,
      BED_SCALE,
    ),
    // No `interaction` — purely environmental furniture, nothing to open.
  },

  // -------------------------------------------------------------------
  // MIDDLE ROW: left/right content markers flanking the open center.
  // -------------------------------------------------------------------
  {
    id: 'experience',
    asset: 'content.experience',
    label: 'EXPERIENCE',
    position: { x: 380, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 380, y: 720 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EXPERIENCE' },
  },
  {
    id: 'skills',
    asset: 'content.skills',
    label: 'SKILLS',
    position: { x: 1540, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 1540, y: 720 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_SKILLS' },
  },
  {
    id: 'aboutMe',
    asset: 'content.aboutMe',
    label: 'ABOUT ME',
    // The exact world center — also the player's spawn point
    // (GameScene.ts: `{ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }`).
    // Reachable immediately with no walking, per PHASE 10B "About Me
    // somewhere accessible without blocking the main path".
    position: { x: 960, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // Intentionally no `collision` — an ambient/info area, not a physical
    // obstacle, and it must never block the player's own spawn point.
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_ABOUT' },
  },

  // -------------------------------------------------------------------
  // BOTTOM-LEFT: the EDUCATION workstation.
  // -------------------------------------------------------------------
  {
    id: 'education-desk',
    asset: 'furniture.educationDesk',
    label: 'EDUCATION DESK',
    position: { x: 300, y: 1080 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    scale: EDUCATION_DESK_SCALE,
    collision: deskCollider(
      { x: 300, y: 1080 },
      DESK_NATURAL_SIZE.educationDesk,
      EDUCATION_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — the separate "education" entry below owns OPEN_EDUCATION.
  },
  {
    id: 'education',
    asset: 'content.education',
    label: 'EDUCATION',
    position: { x: 300, y: 1180 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // PHASE 10B.1 CLEANUP: the default symmetric 96px box's bottom edge
    // (1228) redundantly overlapped ROOM_BOUNDARY_COLLIDERS' bottom wall
    // (1200) by 28px — both obstacles blocked the same strip, harmless but
    // removed for cleanliness. Only the bottom edge is clipped; reachability
    // is unaffected (see worldObjects.test.ts's reachability regression test).
    collision: centeredColliderClippedToBottom(
      { x: 300, y: 1180 },
      PLACEHOLDER_COLLIDER_SIZE,
      BOTTOM_WALL_INNER_Y,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EDUCATION' },
  },

  // -------------------------------------------------------------------
  // BOTTOM-MIDDLE: certificates, and the door near the bottom wall.
  // -------------------------------------------------------------------
  {
    id: 'certificates',
    asset: 'content.certificates',
    label: 'CERTIFICATES',
    position: { x: 960, y: 1100 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 960, y: 1100 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_CERTIFICATES' },
  },
  {
    id: 'door',
    asset: 'structural.door',
    label: 'DOOR',
    position: { x: 960, y: 1370 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    scale: DOOR_SCALE,
    collision: deskCollider(
      { x: 960, y: 1370 },
      DOOR_NATURAL_SIZE,
      DOOR_SCALE,
      DOOR_FOOTPRINT,
    ),
    // No `interaction` yet — physical/visual only this phase; door open/
    // close and room transition are explicitly out of scope (PHASE 09.1 /
    // PHASE 10B both exclude it).
  },

  // -------------------------------------------------------------------
  // BOTTOM-RIGHT: the RESUME workstation ("sofa" zone reserved beyond it,
  // toward x>1700 — deliberately left empty this phase).
  // -------------------------------------------------------------------
  {
    id: 'resume-desk',
    asset: 'furniture.resumeDesk',
    label: 'RESUME DESK',
    position: { x: 1480, y: 1080 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    scale: RESUME_DESK_SCALE,
    collision: deskCollider(
      { x: 1480, y: 1080 },
      DESK_NATURAL_SIZE.resumeDesk,
      RESUME_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — the separate "resume" entry below owns OPEN_RESUME.
  },
  {
    id: 'resume',
    asset: 'content.resume',
    label: 'RESUME',
    position: { x: 1480, y: 1180 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // PHASE 10B.1 CLEANUP: same redundant 28px overlap with the bottom wall
    // as "education" above — see that entry's comment.
    collision: centeredColliderClippedToBottom(
      { x: 1480, y: 1180 },
      PLACEHOLDER_COLLIDER_SIZE,
      BOTTOM_WALL_INNER_Y,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_RESUME' },
  },

  // -------------------------------------------------------------------
  // KITCHEN — the tiled-floor nook right of the main work desk
  // (Background2.png). Arrangement matches the approved reference
  // ("kitchen layout.png", KITCHEN LAYOUT ARRANGEMENT phase): fridge at
  // the *left* end of the back-wall run (immediately right of the desk),
  // then the main counter (sink + cooktop) and side counter continuing
  // right toward the wall, with the shelf/rack mounted above and the
  // dining set in the open tile floor to the right of the SKILLS marker.
  // Visual placement pass only (see the block comment above
  // `kitchenPositionForFloorPoint`): no collision, no interaction.
  // Draw order below is deliberately back-to-front — counters first, then
  // whatever sits on/above them — since World.ts draws array order, not a
  // Y-sort (PHASE-10A precedent: every object here is hand-ordered).
  // -------------------------------------------------------------------
  kitchenObject(
    'kitchen-fridge',
    'kitchen.fridge',
    'REFRIGERATOR',
    { x: 140, y: 280 }, // WORLD POSITION — SAFE TO TUNE — leftmost, right after the main work desk
    KITCHEN_ASSET_NATURAL_SIZE.fridge,
    KITCHEN_ASSET_CONTENT_BBOX.fridge,
    KITCHEN_SCALE.fridge,
  ),
  kitchenObject(
    'kitchen-main-counter',
    'kitchen.mainCounter',
    'KITCHEN COUNTER',
    { x: 1645, y: 870 }, // WORLD POSITION — SAFE TO TUNE
    KITCHEN_ASSET_NATURAL_SIZE.mainCounter,
    KITCHEN_ASSET_CONTENT_BBOX.mainCounter,
    KITCHEN_SCALE.mainCounter,
  ),
  kitchenObject(
    'kitchen-side-counter',
    'kitchen.sideCounter',
    'SIDE COUNTER',
    { x: 1800, y: 278 }, // WORLD POSITION — SAFE TO TUNE — connects/aligns with the main counter's right edge
    KITCHEN_ASSET_NATURAL_SIZE.sideCounter,
    KITCHEN_ASSET_CONTENT_BBOX.sideCounter,
    KITCHEN_SCALE.sideCounter,
  ),
  kitchenObject(
    'kitchen-wall-shelf',
    'kitchen.wallShelf',
    'WALL SHELF',
    { x: 1500, y: 95 }, // WORLD POSITION — SAFE TO TUNE — above the fridge/counter seam, per reference
    KITCHEN_ASSET_NATURAL_SIZE.wallShelf,
    KITCHEN_ASSET_CONTENT_BBOX.wallShelf,
    KITCHEN_SCALE.wallShelf,
  ),
  kitchenObject(
    'kitchen-hanging-pans',
    'kitchen.hangingPans',
    'HANGING PANS',
    { x: 1640, y: 120 }, // WORLD POSITION — SAFE TO TUNE — above the cooktop, per reference
    KITCHEN_ASSET_NATURAL_SIZE.hangingPans,
    KITCHEN_ASSET_CONTENT_BBOX.hangingPans,
    KITCHEN_SCALE.hangingPans,
  ),
  kitchenObject(
    'kitchen-light',
    'kitchen.light',
    'KITCHEN LIGHT',
    { x: 1770, y: 110 }, // WORLD POSITION — SAFE TO TUNE — near the coffee-machine end of the counter, per reference
    KITCHEN_ASSET_NATURAL_SIZE.light,
    KITCHEN_ASSET_CONTENT_BBOX.light,
    KITCHEN_SCALE.light,
  ),
  kitchenObject(
    'kitchen-cooktop',
    'kitchen.cooktop',
    'COOKTOP',
    { x: 1600, y: 178 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter
    KITCHEN_ASSET_NATURAL_SIZE.cooktop,
    KITCHEN_ASSET_CONTENT_BBOX.cooktop,
    KITCHEN_SCALE.cooktop,
  ),
  kitchenObject(
    'kitchen-coffee-machine',
    'kitchen.coffeeMachine',
    'COFFEE MACHINE',
    { x: 1715, y: 225 }, // WORLD POSITION — SAFE TO TUNE — sits at the counter's right/end, per reference
    KITCHEN_ASSET_NATURAL_SIZE.coffeeMachine,
    KITCHEN_ASSET_CONTENT_BBOX.coffeeMachine,
    KITCHEN_SCALE.coffeeMachine,
  ),
  kitchenObject(
    'kitchen-counter-prop-holder',
    'kitchen.propHolder',
    'UTENSIL HOLDER',
    { x: 1560, y: 222 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter, left of the cooktop, per reference
    KITCHEN_ASSET_NATURAL_SIZE.propHolder,
    KITCHEN_ASSET_CONTENT_BBOX.propHolder,
    KITCHEN_SCALE.propHolder,
  ),
  kitchenObject(
    'kitchen-counter-prop-salt',
    'kitchen.propSalt',
    'SALT SHAKER',
    { x: 1580, y: 220 }, // WORLD POSITION — SAFE TO TUNE — grouped with the utensil holder
    KITCHEN_ASSET_NATURAL_SIZE.propSalt,
    KITCHEN_ASSET_CONTENT_BBOX.propSalt,
    KITCHEN_SCALE.propSalt,
  ),
  kitchenObject(
    'kitchen-counter-prop-bowl',
    'kitchen.propBowl',
    'BOWL',
    { x: 1800, y: 252 }, // WORLD POSITION — SAFE TO TUNE — grouped on the side counter
    KITCHEN_ASSET_NATURAL_SIZE.propBowl,
    KITCHEN_ASSET_CONTENT_BBOX.propBowl,
    KITCHEN_SCALE.propBowl,
  ),
  kitchenObject(
    'kitchen-counter-prop-plate',
    'kitchen.propPlate',
    'PLATE',
    { x: 1820, y: 251 }, // WORLD POSITION — SAFE TO TUNE — grouped on the side counter
    KITCHEN_ASSET_NATURAL_SIZE.propPlate,
    KITCHEN_ASSET_CONTENT_BBOX.propPlate,
    KITCHEN_SCALE.propPlate,
  ),
  kitchenObject(
    'kitchen-dining-set',
    'kitchen.diningSet',
    'DINING TABLE',
    { x: 1680, y: 600 }, // WORLD POSITION — SAFE TO TUNE — open floor, right of the SKILLS marker, per reference
    KITCHEN_ASSET_NATURAL_SIZE.diningSet,
    KITCHEN_ASSET_CONTENT_BBOX.diningSet,
    KITCHEN_SCALE.diningSet,
  ),
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
