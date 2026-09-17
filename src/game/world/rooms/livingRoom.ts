import type { WorldObject } from '../WorldObject'
import {
  INTERACTION_RADIUS,
  centeredCollider,
  contentAlignedCollider,
} from './worldObjectHelpers'

/**
 * MIDDLE-LEFT: the "experience"/lounge content marker, plus the Experience
 * room's furniture. Every furniture item below is visual-only (no
 * collision — visual placement pass only, same precedent as kitchen.ts).
 * The "experience" marker is deliberately the *last* entry so it always
 * draws on top of the furniture beneath it (World.ts draws array order,
 * not a Y-sort) — its label/hotspot must never be hidden behind the rug or
 * furniture placed near it.
 */

/**
 * Natural pixel dimensions of the approved TV-console PNG
 * (assets/world/ExpiernceRoom/BelowTv.png) and TV PNG
 * (assets/world/ExpiernceRoom/TV.png), read directly from the source files
 * — used only for their `contentAlignedCollider` colliders below; their
 * `position`/`transform` predate this and are untouched.
 * `*_CONTENT_BBOX` records where the solid artwork actually sits inside
 * each (padded) canvas, measured directly from the pixel data.
 */
const LIVING_TV_CONSOLE_NATURAL_SIZE = { width: 1200, height: 896 }
const LIVING_TV_CONSOLE_CONTENT_BBOX = {
  minX: 179,
  minY: 285,
  maxX: 1020,
  maxY: 583,
}
const LIVING_TV_NATURAL_SIZE = { width: 1024, height: 765 }
const LIVING_TV_CONTENT_BBOX = { minX: 162, minY: 187, maxX: 861, maxY: 577 }

const LIVING_TV_CONSOLE_TARGET_WIDTH = 360
const LIVING_TV_CONSOLE_SCALE =
  LIVING_TV_CONSOLE_TARGET_WIDTH / LIVING_TV_CONSOLE_NATURAL_SIZE.width
/** WORLD POSITION — SAFE TO TUNE. Independent of `LIVING_TV_POSITION` below — moving the console no longer moves the TV; retune each one on its own. */
const LIVING_TV_CONSOLE_POSITION = { x: 440, y: 714 }

const LIVING_TV_TARGET_WIDTH = 220
const LIVING_TV_SCALE = LIVING_TV_TARGET_WIDTH / LIVING_TV_NATURAL_SIZE.width
/** WORLD POSITION — SAFE TO TUNE. Independent of `LIVING_TV_CONSOLE_POSITION` above (started here, directly above the console, purely as a starting point — not derived from it, so retuning the console's position/size never moves the TV). */
const LIVING_TV_POSITION = { x: 440, y: 580.47 }

/**
 * Natural pixel dimensions of the approved sofa PNG
 * (assets/world/ExpiernceRoom/sofa-Photoroom.png), read directly from the
 * source file — a tall/narrow, already-rotated-looking sofa render (the art
 * itself depicts it from the side), replacing the original wide/landscape
 * Sofa.png. Only lightly padded (a tight Photoroom crop); `SOFA_CONTENT_BBOX`
 * records where the solid artwork actually sits inside that canvas,
 * measured directly from the pixel data (alpha-channel scan).
 */
const SOFA_NATURAL_SIZE = { width: 765, height: 1024 }
const SOFA_CONTENT_BBOX = { minX: 215, minY: 76, maxX: 550, maxY: 973 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~90px wide × ~240px tall, a compact side-on sofa matching this room's furniture scale. */
const SOFA_TARGET_WIDTH = 175.5
const SOFA_SCALE = SOFA_TARGET_WIDTH / SOFA_NATURAL_SIZE.width

/** WORLD POSITION — SAFE TO TUNE (the visible floor point, not the padded-canvas anchor below) — south of the rug, facing the TV, clear of the storage cabinet (x245-395) and bookshelf (well above, y≤675). */
const SOFA_VISIBLE_POSITION = { x: 685, y: 760 }
/** Converts `SOFA_VISIBLE_POSITION` into the actual `position` the padded canvas needs (same padding-below-content correction as kitchen.ts/entrance.ts) — the sofa's own canvas has ~51px of transparent padding below its visible silhouette. */
const SOFA_POSITION = {
  x: SOFA_VISIBLE_POSITION.x,
  y:
    SOFA_VISIBLE_POSITION.y +
    (SOFA_NATURAL_SIZE.height - SOFA_CONTENT_BBOX.maxY) * SOFA_SCALE,
}

/**
 * Natural pixel dimensions of the approved "left" sofa PNG
 * (assets/world/ExpiernceRoom/leftsofa-Photoroom.png) — the mirror-image
 * companion to sofa-Photoroom.png (armrest on the opposite side), read
 * directly from the source file. Same tightly-cropped Photoroom shape as
 * the other sofa; `SOFA_LEFT_CONTENT_BBOX` records where the solid artwork
 * actually sits inside the canvas, measured from the pixel data.
 */
const SOFA_LEFT_NATURAL_SIZE = { width: 687, height: 1024 }
const SOFA_LEFT_CONTENT_BBOX = { minX: 183, minY: 73, maxX: 496, maxY: 963 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~90px wide × ~256px tall, matching the other sofa's scale. */
const SOFA_LEFT_TARGET_WIDTH = 157.5
const SOFA_LEFT_SCALE = SOFA_LEFT_TARGET_WIDTH / SOFA_LEFT_NATURAL_SIZE.width

/** WORLD POSITION — SAFE TO TUNE (visible floor point) — flanks the rug/TV on the opposite side from the other sofa (x520), clear of the "experience" marker's collider (x332-428) and the storage cabinet (further below, y=960). */
const SOFA_LEFT_VISIBLE_POSITION = { x: 240, y: 760 }
/** Same padding-below-content correction as `SOFA_POSITION` above. */
const SOFA_LEFT_POSITION = {
  x: SOFA_LEFT_VISIBLE_POSITION.x,
  y:
    SOFA_LEFT_VISIBLE_POSITION.y +
    (SOFA_LEFT_NATURAL_SIZE.height - SOFA_LEFT_CONTENT_BBOX.maxY) *
      SOFA_LEFT_SCALE,
}

/**
 * Natural pixel dimensions of the approved floor-speaker PNG
 * (assets/world/ExpiernceRoom/speaker-Photoroom.png) — a tall, slim tower
 * speaker, read directly from the source file. This replaced the original
 * Speaker.png (different canvas: 1024x1024 vs. the old 1024x1536), so its
 * own content bbox was re-measured rather than reused. `SPEAKER_CONTENT_BBOX`
 * records where the solid artwork actually sits inside its canvas, measured
 * directly from the pixel data.
 */
const SPEAKER_NATURAL_SIZE = { width: 1024, height: 1024 }
const SPEAKER_CONTENT_BBOX = { minX: 383, minY: 114, maxX: 640, maxY: 933 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~35px wide × ~112px tall, slim enough to flank the TV/console without crowding the rest of the room. */
const SPEAKER_TARGET_WIDTH = 210
const SPEAKER_SCALE = SPEAKER_TARGET_WIDTH / SPEAKER_NATURAL_SIZE.width

/** WORLD POSITION — SAFE TO TUNE (visible floor point) — beside the TV console, past the bookshelf's right edge, clear of the sofa/bookshelf cluster; the indoor plant (x675) sits well above (y=305) so its footprint doesn't reach down here. */
const SPEAKER_VISIBLE_POSITION = { x: 610, y: 618 }
/** Same padding-below-content correction as `SOFA_POSITION` above. */
const SPEAKER_POSITION = {
  x: SPEAKER_VISIBLE_POSITION.x,
  y:
    SPEAKER_VISIBLE_POSITION.y +
    (SPEAKER_NATURAL_SIZE.height - SPEAKER_CONTENT_BBOX.maxY) *
      SPEAKER_SCALE,
}

/**
 * Natural pixel dimensions of the approved small round rug PNG
 * (assets/world/ExpiernceRoom/smallrug-Photoroom.png) — a separate, smaller
 * accent rug layered on top of the original rug (Rug.png/`living.rug`
 * below), not a replacement for it — both exist. `SMALL_RUG_CONTENT_BBOX`
 * records where the solid artwork actually sits inside its (lightly padded)
 * canvas, measured directly from the pixel data.
 */
const SMALL_RUG_NATURAL_SIZE = { width: 1024, height: 559 }
const SMALL_RUG_CONTENT_BBOX = { minX: 311, minY: 110, maxX: 712, maxY: 447 }
/** Target rendered width (world px, full padded canvas) — visible content reads at ~150px wide × ~126px tall, smaller than the main rug so it reads as a layered accent rug rather than a duplicate. */
const SMALL_RUG_TARGET_WIDTH = 182
const SMALL_RUG_SCALE = SMALL_RUG_TARGET_WIDTH / SMALL_RUG_NATURAL_SIZE.width

/** WORLD POSITION — SAFE TO TUNE (the visible floor point, not the padded-canvas anchor below) — centered on the main rug's own spot, layered on top of it (smaller footprint nested inside the bigger rug's own). */
const SMALL_RUG_VISIBLE_POSITION = { x: 610, y: 650 }
/** Same padding-below-content correction as `SOFA_POSITION` above. */
const SMALL_RUG_POSITION = {
  x: SMALL_RUG_VISIBLE_POSITION.x,
  y:
    SMALL_RUG_VISIBLE_POSITION.y +
    (SMALL_RUG_NATURAL_SIZE.height - SMALL_RUG_CONTENT_BBOX.maxY) *
      SMALL_RUG_SCALE,
}

export const livingRoomObjects: WorldObject[] = [
  {
    id: 'living-rug',
    asset: 'living.rug',
    label: 'RUG',
    position: { x: 440, y: 820 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 320 },
  },
  {
    id: 'living-rug-small',
    asset: 'living.rugSmall',
    label: 'SMALL RUG',
    // Drawn right after the main rug, so it layers on top (World.ts draws
    // array order) — never hidden underneath it.
    position: SMALL_RUG_POSITION,
    layer: 'object',
    transform: { width: SMALL_RUG_TARGET_WIDTH },
  },
  {
    id: 'living-sofa',
    asset: 'living.sofa',
    label: 'SOFA',
    position: SOFA_POSITION,
    layer: 'object',
    transform: { width: SOFA_TARGET_WIDTH },
    collision: contentAlignedCollider(
      SOFA_POSITION,
      SOFA_NATURAL_SIZE,
      SOFA_CONTENT_BBOX,
      SOFA_SCALE,
    ),
  },
  {
    id: 'living-sofa-left',
    asset: 'living.sofaLeft',
    label: 'SOFA',
    position: SOFA_LEFT_POSITION,
    layer: 'object',
    transform: { width: SOFA_LEFT_TARGET_WIDTH },
    collision: contentAlignedCollider(
      SOFA_LEFT_POSITION,
      SOFA_LEFT_NATURAL_SIZE,
      SOFA_LEFT_CONTENT_BBOX,
      SOFA_LEFT_SCALE,
    ),
  },
  {
    id: 'living-storage-cabinet',
    asset: 'living.storageCabinet',
    label: 'STORAGE CABINET',
    position: { x: 320, y: 960 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 150 },
  },
  {
    id: 'living-tv-console',
    asset: 'living.tvConsole',
    label: 'TV CONSOLE',
    position: LIVING_TV_CONSOLE_POSITION,
    layer: 'object',
    transform: { width: LIVING_TV_CONSOLE_TARGET_WIDTH },
    collision: contentAlignedCollider(
      LIVING_TV_CONSOLE_POSITION,
      LIVING_TV_CONSOLE_NATURAL_SIZE,
      LIVING_TV_CONSOLE_CONTENT_BBOX,
      LIVING_TV_CONSOLE_SCALE,
    ),
  },
  {
    id: 'living-tv',
    asset: 'living.tv',
    label: 'TV',
    position: LIVING_TV_POSITION,
    layer: 'object',
    transform: { width: LIVING_TV_TARGET_WIDTH },
    collision: contentAlignedCollider(
      LIVING_TV_POSITION,
      LIVING_TV_NATURAL_SIZE,
      LIVING_TV_CONTENT_BBOX,
      LIVING_TV_SCALE,
    ),
  },
  {
    id: 'living-bookshelf',
    asset: 'living.bookshelf',
    label: 'BOOKSHELF',
    position: { x: 1594, y: 675 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 200 },
  },
  {
    id: 'living-speaker',
    asset: 'living.speaker',
    label: 'SPEAKER',
    position: SPEAKER_POSITION,
    layer: 'object',
    transform: { width: SPEAKER_TARGET_WIDTH },
    collision: contentAlignedCollider(
      SPEAKER_POSITION,
      SPEAKER_NATURAL_SIZE,
      SPEAKER_CONTENT_BBOX,
      SPEAKER_SCALE,
    ),
  },
  {
    id: 'living-big-plant',
    asset: 'living.bigPlant',
    label: 'INDOOR PLANT',
    position: { x: 675, y: 305 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 200 },
  },
  
  {
    id: 'experience',
    asset: 'content.experience',
    label: 'EXPERIENCE',
    position: { x: 380, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 380, y: 720 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EXPERIENCE' },
  },
]
