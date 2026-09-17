import type { Collider, WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  INTERACTION_RADIUS,
  PLACEHOLDER_COLLIDER_SIZE,
  centeredColliderClippedToBottom,
  contentAlignedCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * BOTTOM-LEFT: the EDUCATION room — the education desk (whose own artwork
 * already bakes in a pushed-in office chair, books, a small plant, a lamp,
 * a pen cup, an open notebook, and a whiteboard — see the block comment on
 * `EDUCATION_DESK_BODY_BBOX`/`EDUCATION_CHAIR_BBOX` below), plus its
 * "education" interaction marker, the newly added globe (resting on the
 * desk) and bookshelf (against the left wall).
 *
 * `desk_education.png` was inspected directly rather than assumed: it is a
 * fully dressed desk *scene*, not a bare desk. There is no separate
 * chair/books/lamp/study-accessory asset anywhere in the project to place
 * independently — per this phase's "use existing assets only, never
 * generate/duplicate" rule, none is added here; the desk's own art already
 * satisfies "chair in front of the desk" and "books/lamp/accessories on the
 * desk". Only its collision was still missing, which this file adds.
 */

/** Natural pixel dimensions of the approved desk PNG (assets/world/furniture/desk_education.png), read directly from the source file. */
const EDUCATION_DESK_NATURAL_SIZE = { width: 920, height: 787 }

/** Target rendered width (world px) — reproduces the previous shared `FURNITURE_SCALE = 0.28` exactly. Change this single number to resize just this desk. */
const EDUCATION_DESK_TARGET_WIDTH = 212.6
const EDUCATION_DESK_SCALE = scaleForWidth(
  EDUCATION_DESK_NATURAL_SIZE,
  EDUCATION_DESK_TARGET_WIDTH,
)

/**
 * The desk and its baked-in chair are visually interleaved in one canvas —
 * the chair's backrest is visible above/through the desk's knee space, and
 * its wheelbase pokes out below the desk's own legs — so a single bbox scan
 * can't cleanly separate "desk" from "chair". Measured directly instead, via
 * a per-row opaque-pixel scan of the actual PNG: the desk's own legs/drawer
 * silhouette fades out and is fully gone by native y=694 (confirmed by
 * scanning every row from y=680-700 for its exact disappearance point) —
 * only the chair's splayed caster wheels remain visible below that row, and
 * only the desk's own body (tabletop front edge, legs, drawer unit) is
 * present at/above it. `EDUCATION_DESK_BODY_BBOX` intentionally starts at
 * y=400, not y=0, to exclude the whiteboard/lamp/plant/book spines rising
 * above the tabletop — same "collider covers the body, not what rises above
 * the desktop" reasoning as `DESK_FOOTPRINT` (worldObjectHelpers.ts), just
 * hand-measured here instead of using that shared fraction, since this
 * asset's chair changes where the desk's own solid footprint actually ends.
 */
const EDUCATION_DESK_BODY_BBOX = { minX: 0, minY: 400, maxX: 919, maxY: 693 }
/** The baked-in chair's own protruding footprint (its caster-wheel splay below the desk's legs) — see the block comment above. */
const EDUCATION_CHAIR_BBOX = { minX: 298, minY: 694, maxX: 615, maxY: 786 }

const EDUCATION_DESK_POSITION = { x: 625, y: 1060 } // WORLD POSITION — SAFE TO TUNE

/**
 * The chair's collider is a plain `Collider`, not a second `WorldObject` —
 * it's already rendered as part of the desk's own sprite (see the block
 * comment above), so a second WorldObject here would duplicate the artwork.
 * Same "invisible, hand-authored obstacle, resolved through
 * CollisionSystem's existing extraObstacles list" precedent as
 * `hobbiesColliders`/`skillsColliders` (hobbiesRoom.ts/skillsRoom.ts) — no
 * change to the collision algorithm itself, and never rendered outside the
 * dev-only, opt-in collision debug overlay (World.ts).
 */
export const educationColliders: readonly Collider[] = [
  contentAlignedCollider(
    EDUCATION_DESK_POSITION,
    EDUCATION_DESK_NATURAL_SIZE,
    EDUCATION_CHAIR_BBOX,
    EDUCATION_DESK_SCALE,
  ),
]

/**
 * Natural pixel dimensions of the approved globe PNG
 * (assets/world/Education/Globe.png) and bookshelf PNG
 * (assets/world/Education/shelf-Photoroom.png), read directly from the
 * source files. Both carry transparent padding beyond their actual
 * silhouette; `*_CONTENT_BBOX` records where the solid artwork actually
 * sits inside that canvas, measured directly from the pixel data
 * (alpha-channel scan) — same approach as the Kitchen/Entrance assets.
 */
const GLOBE_NATURAL_SIZE = { width: 1024, height: 1024 }
const GLOBE_CONTENT_BBOX = { minX: 296, minY: 173, maxX: 768, maxY: 819 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~28px wide, a small desktop-scale globe next to the desk's own (baked-in) pen cup. */
const GLOBE_TARGET_WIDTH = 60
const GLOBE_SCALE = scaleForWidth(GLOBE_NATURAL_SIZE, GLOBE_TARGET_WIDTH)

const SHELF_NATURAL_SIZE = { width: 765, height: 1024 }
const SHELF_CONTENT_BBOX = { minX: 115, minY: 127, maxX: 649, maxY: 897 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~140px wide, a compact floor-standing bookshelf against the left wall. */
const SHELF_TARGET_WIDTH = 200.56
const SHELF_SCALE = scaleForWidth(SHELF_NATURAL_SIZE, SHELF_TARGET_WIDTH)

/** Same padding-correction idea as `kitchenPositionForFloorPoint` (kitchen.ts)/`entrancePositionForFloorPoint` (entrance.ts) — converts a desired *visible resting point* (floor, or here, the desk's own tabletop) into the `position` that actually produces it, given the canvas's own padding-below-content. */
function educationPositionForFloorPoint(
  visible: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: { readonly maxY: number },
  scale: number,
): { x: number; y: number } {
  const paddingBelowContent = naturalSize.height - contentBBox.maxY
  return { x: visible.x, y: visible.y + paddingBelowContent * scale }
}

/**
 * Rests toward the right side of the desk's tabletop (not centered) — clear
 * of the desk's own baked-in lamp/pen cup, sitting on the desk's front-edge
 * line (world y≈975, derived from the desk's own native content-bbox
 * geometry above), never floating beside/behind it.
 */
const globePosition = educationPositionForFloorPoint(
  { x: 695, y: 965 }, // WORLD POSITION — SAFE TO TUNE
  GLOBE_NATURAL_SIZE,
  GLOBE_CONTENT_BBOX,
  GLOBE_SCALE,
)

/**
 * Against the left wall (LEFT_WALL_INNER_X=140 — worldObjectHelpers.ts),
 * north of the desk, clear of the desk's own collider, the "education"
 * marker's collider, and the Experience/living-room furniture above it
 * (verified: its collider's left edge lands at world x≈145, ~5px clear of
 * the wall boundary, and its top edge at world y≈798, ~30px clear of the
 * "experience" marker's collider at y≤768).
 */
const shelfPosition = educationPositionForFloorPoint(
  { x: 215, y: 1000 }, // WORLD POSITION — SAFE TO TUNE
  SHELF_NATURAL_SIZE,
  SHELF_CONTENT_BBOX,
  SHELF_SCALE,
)

export const educationObjects: WorldObject[] = [
  {
    id: 'education-desk',
    asset: 'furniture.educationDesk',
    label: 'EDUCATION DESK',
    position: EDUCATION_DESK_POSITION,
    layer: 'object',
    transform: { width: EDUCATION_DESK_TARGET_WIDTH },
    collision: contentAlignedCollider(
      EDUCATION_DESK_POSITION,
      EDUCATION_DESK_NATURAL_SIZE,
      EDUCATION_DESK_BODY_BBOX,
      EDUCATION_DESK_SCALE,
    ),
    // No `interaction` — "education" below owns OPEN_EDUCATION.
  },
  {
    id: 'education-globe',
    asset: 'education.globe',
    label: 'GLOBE',
    position: globePosition,
    layer: 'object',
    transform: { width: GLOBE_TARGET_WIDTH },
    // No `collision` — a decorative tabletop object resting on the desk,
    // already covered by the desk's own collider underneath it.
  },
  {
    id: 'education-bookshelf',
    asset: 'education.bookshelf',
    label: 'BOOKSHELF',
    position: shelfPosition,
    layer: 'object',
    transform: { width: SHELF_TARGET_WIDTH },
    collision: contentAlignedCollider(
      shelfPosition,
      SHELF_NATURAL_SIZE,
      SHELF_CONTENT_BBOX,
      SHELF_SCALE,
    ),
  },
  {
    id: 'education',
    asset: 'content.education',
    label: 'EDUCATION',
    position: { x: 300, y: 1180 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredColliderClippedToBottom(
      { x: 300, y: 1180 },
      PLACEHOLDER_COLLIDER_SIZE,
      BOTTOM_WALL_INNER_Y,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EDUCATION' },
  },
]
