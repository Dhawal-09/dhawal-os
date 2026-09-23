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
 * "education" interaction marker, the globe (resting on the desk) and
 * bookshelf (against the left wall), plus a later "study/reading corner"
 * assembly pass (certificate, reading chair + side table, small plant,
 * sleeping cat) — see the block comment above `READING_CHAIR_NATURAL_SIZE`
 * below for that pass's own asset-inventory notes.
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
/**
 * Placeholder architectural wall collider for the Education room —
 * independent, hand-authored geometry (same "invisible, resolved through
 * CollisionSystem's extraObstacles list" precedent as the desk's own
 * baked-in chair collider above, `hobbiesColliders`, `skillsColliders`, and
 * `entranceColliders`'s mantel-lip collider), never a change to the
 * collision algorithm itself, and never rendered outside the dev-only,
 * opt-in collision debug overlay (World.ts).
 *
 * CUSTOMIZE ME: `x`/`y` is the collider's top-left corner, `width`/`height`
 * its size, all in world px — edit these four numbers directly to place and
 * size it wherever/however large it needs to be. Add more plain `{x, y,
 * width, height}` objects to this array for additional wall segments; none
 * of them render anything, so there's no matching asset to keep in sync.
 */
const EDUCATION_WALL_COLLIDER: Collider = {  //shelf one 
  x: 110, 
  y: 800, 
  width: 240, 
  height: 170, 
}

/** Copy #2 of the wall collider above — same shape, same handling; only the numbers differ. */
const EDUCATION_WALL_COLLIDER_2: Collider = {  // DEsk one
  x: 480,        
  y: 800, 
  width: 285, 
  height: 150, 
}

/** Copy #3 of the wall collider above. */
const EDUCATION_WALL_COLLIDER_3: Collider = {  //small
  x: 140, 
  y: 750, 
  width: 70, 
  height: 40, 
}

/** Copy #4 of the wall collider above. */
const EDUCATION_WALL_COLLIDER_4: Collider = {  //bottom
  x: 740,   
  y: 1110,  
  width: 30, 
  height: 90,   
}

const EDUCATION_WALL_COLLIDER_5: Collider = {    //side wall
  x: 740,   
  y: 940,   
  width: 30,  
  height: 100,  
}
const EDUCATION_WALL_COLLIDER_6: Collider = {    //side wall
  x: 230,   
  y: 1110,   
  width: 100,  
  height: 100,  
}
/**
 * Colliders drawn as a yellow bordered box in dev, so you can see what you're
 * tuning. Remove an entry (or empty this array) when it's placed.
 */
export const educationVisibleColliders: readonly Collider[] = [
  EDUCATION_WALL_COLLIDER,
  EDUCATION_WALL_COLLIDER_2,
  EDUCATION_WALL_COLLIDER_3,
  EDUCATION_WALL_COLLIDER_4,
  EDUCATION_WALL_COLLIDER_5,
  EDUCATION_WALL_COLLIDER_6
]

export const educationColliders: readonly Collider[] = [
  contentAlignedCollider(
    EDUCATION_DESK_POSITION,
    EDUCATION_DESK_NATURAL_SIZE,
    EDUCATION_CHAIR_BBOX,
    EDUCATION_DESK_SCALE,
  ),
  EDUCATION_WALL_COLLIDER,
  EDUCATION_WALL_COLLIDER_2,
  EDUCATION_WALL_COLLIDER_3,
  EDUCATION_WALL_COLLIDER_4,
  EDUCATION_WALL_COLLIDER_5,
  EDUCATION_WALL_COLLIDER_6
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
const SHELF_TARGET_WIDTH = 180.56
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
  { x: 148, y: 990 }, // WORLD POSITION — SAFE TO TUNE
  SHELF_NATURAL_SIZE,
  SHELF_CONTENT_BBOX,
  SHELF_SCALE,
)

/**
 * Study/reading-corner assembly pass — integrates the newly approved
 * Education assets (assets/world/Education/Edu_chair.png,
 * assets/world/Education/certificate.png,
 * assets/world/Education/smalltable-Photoroom.png,
 * assets/world/special/small plant-Photoroom.png,
 * assets/world/special/cat.png) alongside the desk/globe/bookshelf above.
 * Every natural size and `*_CONTENT_BBOX` below was read/measured directly
 * from the real PNG (alpha-channel scan), same method as the desk/globe/
 * shelf constants above.
 *
 * Two items from the requested asset list are intentionally *not* separate
 * objects here, to avoid duplicating what the approved art already depicts:
 *
 * - "Education chair": the desk's own baked-in office chair
 *   (`EDUCATION_CHAIR_BBOX` above) already fills that role in front of the
 *   desk. `Edu_chair.png` — a distinct wood-and-navy lounge armchair, not an
 *   office chair — is used for the READING_CHAIR role below instead, so the
 *   desk never gets a second, overlapping chair.
 * "Reading rug": no separate rug asset exists either — `cat.png` itself is
 * a sleeping orange cat rendered curled up *on* a small rug, one baked-in
 * scene (same "art already depicts the combo" reasoning as the desk's own
 * chair), so `READING_CAT` below supplies both the rug and the cat.
 *
 * The study pinboard (`pin board-Photoroom.png`) and the document/file
 * storage box (`Files.png`) arrived after the first pass of this file and
 * are folded in below too: the pinboard is mounted on the same left wall as
 * the bookshelf/certificate, stacked *above* the certificate rather than
 * beside it (this house is an open-plan loft — the only real wall surface
 * this bottom-left zone touches is the left perimeter wall, so "near the
 * desk, on a wall" and "complements rather than competes with the
 * certificate" both point at the same vertical stack); the files box sits
 * on the floor immediately beside the book stack, still within the
 * bookshelf/storage cluster.
 *
 * Not integrated at all (no matching approved asset exists in the project
 * to place, per the "never generate a new asset" rule): a distinct storage
 * unit separate from the bookshelf. The long collaborative table is
 * explicitly excluded from this pass (its camera angle isn't finalized
 * yet).
 */

/** Natural pixel dimensions of the approved reading-chair PNG (assets/world/Education/Edu_chair.png), read directly from the source file — a fairly tight Photoroom-style crop. */
const READING_CHAIR_NATURAL_SIZE = { width: 359, height: 376 }
const READING_CHAIR_CONTENT_BBOX = { minX: 24, minY: 13, maxX: 336, maxY: 369 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~78px wide, a compact accent armchair (smaller than the desk's own office-chair footprint). */
const READING_CHAIR_TARGET_WIDTH = 150
const READING_CHAIR_SCALE = scaleForWidth(
  READING_CHAIR_NATURAL_SIZE,
  READING_CHAIR_TARGET_WIDTH,
)

/** Natural pixel dimensions of the approved reading side-table PNG (assets/world/Education/smalltable-Photoroom.png), read directly from the source file. */
const READING_TABLE_NATURAL_SIZE = { width: 1024, height: 559 }
const READING_TABLE_CONTENT_BBOX = {
  minX: 384,
  minY: 162,
  maxX: 639,
  maxY: 391,
}
/** Target rendered width (world px, full padded canvas) — visible content reads at ~45px wide, matching the Entrance sitting-nook's own side table scale (entrance.ts). */
const READING_TABLE_TARGET_WIDTH = 290
const READING_TABLE_SCALE = scaleForWidth(
  READING_TABLE_NATURAL_SIZE,
  READING_TABLE_TARGET_WIDTH,
)

/** Natural pixel dimensions of the approved sleeping-cat-on-rug PNG (assets/world/special/cat.png), read directly from the source file — the rug and the curled-up cat are one baked-in scene (see the block comment above). */
const READING_CAT_NATURAL_SIZE = { width: 1536, height: 1024 }
const READING_CAT_CONTENT_BBOX = { minX: 464, minY: 366, maxX: 1064, maxY: 728 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~113px wide, a small accent rug scaled to the reading corner rather than the living room's main rug. */
const READING_CAT_TARGET_WIDTH = 290
const READING_CAT_SCALE = scaleForWidth(
  READING_CAT_NATURAL_SIZE,
  READING_CAT_TARGET_WIDTH,
)

/** Natural pixel dimensions of the approved small potted-plant PNG (assets/world/special/small plant-Photoroom.png), read directly from the source file. */
const SMALL_PLANT_NATURAL_SIZE = { width: 1024, height: 559 }
const SMALL_PLANT_CONTENT_BBOX = {
  minX: 439,
  minY: 182,
  maxX: 584,
  maxY: 371,
}
/** Target rendered width (world px, full padded canvas) — visible content reads at ~26px wide, a small corner accent (comparable in scale to the desk's own globe). */
const SMALL_PLANT_TARGET_WIDTH = 484
const SMALL_PLANT_SCALE = scaleForWidth(
  SMALL_PLANT_NATURAL_SIZE,
  SMALL_PLANT_TARGET_WIDTH,
)

/** Natural pixel dimensions of the approved floor book-stack PNG (assets/world/Education/Books.png), read directly from the source file. */
const BOOKS_NATURAL_SIZE = { width: 2400, height: 1309 }
const BOOKS_CONTENT_BBOX = { minX: 619, minY: 239, maxX: 1750, maxY: 1158 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~55px wide, a small supplementary stack (clearly smaller than the bookshelf itself). */
const BOOKS_TARGET_WIDTH = 117
const BOOKS_SCALE = scaleForWidth(BOOKS_NATURAL_SIZE, BOOKS_TARGET_WIDTH)

/** Natural pixel dimensions of the approved study pinboard PNG (assets/world/Education/pin board-Photoroom.png), read directly from the source file. */
const PINBOARD_NATURAL_SIZE = { width: 1024, height: 559 }
const PINBOARD_CONTENT_BBOX = { minX: 341, minY: 144, maxX: 682, maxY: 392 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~50px wide, deliberately smaller than the certificate so it reads as a supporting element, not competing for attention. */
const PINBOARD_TARGET_WIDTH = 150
const PINBOARD_SCALE = scaleForWidth(PINBOARD_NATURAL_SIZE, PINBOARD_TARGET_WIDTH)

/** Natural pixel dimensions of the approved document/file storage box PNG (assets/world/Education/Files.png), read directly from the source file. */
const FILES_NATURAL_SIZE = { width: 1024, height: 559 }
const FILES_CONTENT_BBOX = { minX: 328, minY: 89, maxX: 695, maxY: 485 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~45px wide, a small floor box comparable in scale to the book stack it sits beside. */
const FILES_TARGET_WIDTH = 125
const FILES_SCALE = scaleForWidth(FILES_NATURAL_SIZE, FILES_TARGET_WIDTH)

/** Natural pixel dimensions of the approved certificate PNG (assets/world/Education/certificate.png), read directly from the source file. */
const CERTIFICATE_NATURAL_SIZE = { width: 1568, height: 1003 }
const CERTIFICATE_CONTENT_BBOX = {
  minX: 478,
  minY: 293,
  maxX: 1089,
  maxY: 731,
}
/** Target rendered width (world px, full padded canvas) — visible content reads at ~55px wide, compact and proportional to the bookshelf beneath it (never a "certificate wall"). */
const CERTIFICATE_TARGET_WIDTH = 190
const CERTIFICATE_SCALE = scaleForWidth(
  CERTIFICATE_NATURAL_SIZE,
  CERTIFICATE_TARGET_WIDTH,
)

/**
 * Reading corner — chair, side table and rug/cat — sits in the open floor
 * gap east of the "education" marker's collider (x252-348, clipped to
 * y1132-1200) and west of the desk/chair collision cluster (x518.7-731,
 * y970-1060), clear of both. Kept visually separate from the desk (per the
 * assembly spec: never overlapping the desk or bookshelf, never blocking
 * the bottom-wall walkway).
 */
const readingChairPosition = educationPositionForFloorPoint(
  { x: 165, y: 1100 }, // WORLD POSITION — SAFE TO TUNE
  READING_CHAIR_NATURAL_SIZE,
  READING_CHAIR_CONTENT_BBOX,
  READING_CHAIR_SCALE,
)
const readingTablePosition = educationPositionForFloorPoint(
  { x: 275, y: 1090 }, // WORLD POSITION — SAFE TO TUNE — clear of the desk's own collider (x≥518.7)
  READING_TABLE_NATURAL_SIZE,
  READING_TABLE_CONTENT_BBOX,
  READING_TABLE_SCALE,
)
const readingCatPosition = educationPositionForFloorPoint(
  { x: 470, y: 745 }, // WORLD POSITION — SAFE TO TUNE — under the chair/table, near the bottom wall
  READING_CAT_NATURAL_SIZE,
  READING_CAT_CONTENT_BBOX,
  READING_CAT_SCALE,
)

/**
 * Small corner plant — the bottom-left pocket between the bookshelf
 * (ends x≈211, y≈990) and the "education" marker's collider (starts
 * x≈252), well clear of both and of the reading corner further east.
 */
const smallPlantPosition = educationPositionForFloorPoint(
  { x: 1330, y: 290 }, // WORLD POSITION — SAFE TO TUNE
  SMALL_PLANT_NATURAL_SIZE,
  SMALL_PLANT_CONTENT_BBOX,
  SMALL_PLANT_SCALE,
)

/**
 * Floor book stack — directly below the bookshelf's own bottom edge
 * (y≈990), in the same left-wall column, well above the small plant
 * further down and clear of the "education" marker (starts x≈252).
 */
const booksPosition = educationPositionForFloorPoint(
  { x: 270, y: 1055 }, // WORLD POSITION — SAFE TO TUNE
  BOOKS_NATURAL_SIZE,
  BOOKS_CONTENT_BBOX,
  BOOKS_SCALE,
)

/**
 * Document/file storage box — on the floor immediately beside the book
 * stack (ends x≈227), still within the bookshelf/storage cluster, clear of
 * the "education" marker (starts x≈252 — the box ends before that too) and
 * well above the marker's own collider (starts y≈1132).
 */
const filesPosition = educationPositionForFloorPoint(
  { x: 285, y: 1055 }, // WORLD POSITION — SAFE TO TUNE
  FILES_NATURAL_SIZE,
  FILES_CONTENT_BBOX,
  FILES_SCALE,
)

/**
 * Certificate — wall-mounted, above the bookshelf (the closest existing
 * storage furniture; no separate "storage unit" asset exists in the
 * project — see the block comment above). Its x is its own independent
 * constant rather than reusing `shelfPosition.x` — tune it freely without
 * touching (or being tied to) the bookshelf's own position.
 */
const CERTIFICATE_POSITION_X = 270 // WORLD POSITION — SAFE TO TUNE, independent of the bookshelf's x
const certificatePosition = educationPositionForFloorPoint(
  { x: CERTIFICATE_POSITION_X, y: 898 }, // WORLD POSITION — SAFE TO TUNE
  CERTIFICATE_NATURAL_SIZE,
  CERTIFICATE_CONTENT_BBOX,
  CERTIFICATE_SCALE,
)

/**
 * Study pinboard — same wall as the certificate, but its x is likewise its
 * own independent constant (not tied to the bookshelf's or the
 * certificate's x) — see the block comment above for why this wall reads
 * as "near the desk, complementing the certificate" in this open-plan
 * house.
 */
const PINBOARD_POSITION_X = 548 // WORLD POSITION — SAFE TO TUNE, independent of the bookshelf's/certificate's x
const pinboardPosition = educationPositionForFloorPoint(
  { x: PINBOARD_POSITION_X, y: 878 }, // WORLD POSITION — SAFE TO TUNE
  PINBOARD_NATURAL_SIZE,
  PINBOARD_CONTENT_BBOX,
  PINBOARD_SCALE,
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
    id: 'education-certificate',
    asset: 'education.certificate',
    label: 'CERTIFICATE',
    position: certificatePosition,
    layer: 'object',
    transform: { width: CERTIFICATE_TARGET_WIDTH },
    // No `collision` — wall-mounted decor, visual placement pass only.
  },
  {
    id: 'education-small-plant',
    asset: 'education.smallPlant',
    label: 'PLANT',
    position: smallPlantPosition,
    layer: 'object',
    transform: { width: SMALL_PLANT_TARGET_WIDTH },
    // No `collision` — small decorative corner plant, never blocks the walkway.
  },
  {
    id: 'education-books',
    asset: 'education.books',
    label: 'BOOKS',
    position: booksPosition,
    layer: 'object',
    transform: { width: BOOKS_TARGET_WIDTH },
    // No `collision` — a low floor book stack, never a player obstacle.
  },
  {
    id: 'education-files',
    asset: 'education.files',
    label: 'FILE BOX',
    position: filesPosition,
    layer: 'object',
    transform: { width: FILES_TARGET_WIDTH },
    // No `collision` — a small floor storage box, never a player obstacle.
  },
  {
    id: 'education-pinboard',
    asset: 'education.pinboard',
    label: 'PINBOARD',
    position: pinboardPosition,
    layer: 'object',
    transform: { width: PINBOARD_TARGET_WIDTH },
    // No `collision` — wall-mounted decor, visual placement pass only.
  },
  {
    id: 'education-reading-cat',
    asset: 'education.readingCat',
    label: 'READING NOOK RUG',
    // Drawn before the chair/table so it always layers underneath them
    // (World.ts draws array order, not a Y-sort).
    position: readingCatPosition,
    layer: 'object',
    transform: { width: READING_CAT_TARGET_WIDTH },
    // Content-aligned collider over the cat/rug's own measured footprint —
    // same approach as every other solid object in this room. Requested
    // explicitly (this asset was originally decorative-only); the "[E]
    // INTERACT" prompt below is entirely generic (Player.ts) and needs no
    // extra UI work of its own.
    collision: contentAlignedCollider(
      readingCatPosition,
      READING_CAT_NATURAL_SIZE,
      READING_CAT_CONTENT_BBOX,
      READING_CAT_SCALE,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_CAT' },
  },
  {
    id: 'education-reading-chair',
    asset: 'education.readingChair',
    label: 'READING CHAIR',
    position: readingChairPosition,
    layer: 'object',
    transform: { width: READING_CHAIR_TARGET_WIDTH },
    collision: contentAlignedCollider(
      readingChairPosition,
      READING_CHAIR_NATURAL_SIZE,
      READING_CHAIR_CONTENT_BBOX,
      READING_CHAIR_SCALE,
    ),
  },
  {
    id: 'education-reading-table',
    asset: 'education.readingTable',
    label: 'READING SIDE TABLE',
    position: readingTablePosition,
    layer: 'object',
    transform: { width: READING_TABLE_TARGET_WIDTH },
    collision: contentAlignedCollider(
      readingTablePosition,
      READING_TABLE_NATURAL_SIZE,
      READING_TABLE_CONTENT_BBOX,
      READING_TABLE_SCALE,
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
