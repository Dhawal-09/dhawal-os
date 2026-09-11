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
const LEFT_WALL_INNER_X = 250
const RIGHT_WALL_INNER_X = 1650

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

/** Uniform render scale for all furniture — never independent x/y (PHASE-10A "Asset scale" forbids distortion). */
const FURNITURE_SCALE = 0.28

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
 * Uniform render scale for the door — its approved PNG (assets/world/structural/door.png)
 * is already only 141×185, close to the size it should occupy in-world, so
 * it renders at native pixel size (no upscaling, no downscaling).
 */
const DOOR_SCALE = 1

/**
 * Natural pixel dimensions of the approved door PNG, read directly from the
 * source file — never assumed (same discipline as `DESK_NATURAL_SIZE`).
 */
const DOOR_NATURAL_SIZE = { width: 141, height: 185 } // door.png

/** The door's art fills almost its entire canvas (verified: opaque pixels cover ~93% of it) — only a thin anti-aliased edge is trimmed from the footprint. */
const DOOR_FOOTPRINT = { widthFraction: 0.9, heightFraction: 0.95 }

/**
 * Uniform render scale for the bed. Chosen so it reads at roughly the same
 * in-room scale as the desks while still fitting the top-left corner
 * without overlapping `main-work-desk` (PHASE 09.1 "Bed collision").
 */
const BED_SCALE = 0.16

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
const BED_NATURAL_SIZE = { width: 1536, height: 1024 } // Bed.png
const BED_CONTENT_BBOX = { minX: 377, minY: 113, maxX: 1162, maxY: 901 }

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
    scale: FURNITURE_SCALE,
    collision: deskCollider(
      { x: 1300, y: 300 },
      DESK_NATURAL_SIZE.mainWorkDesk,
      FURNITURE_SCALE,
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
    scale: FURNITURE_SCALE,
    collision: deskCollider(
      { x: 300, y: 1080 },
      DESK_NATURAL_SIZE.educationDesk,
      FURNITURE_SCALE,
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
    scale: FURNITURE_SCALE,
    collision: deskCollider(
      { x: 1480, y: 1080 },
      DESK_NATURAL_SIZE.resumeDesk,
      FURNITURE_SCALE,
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
