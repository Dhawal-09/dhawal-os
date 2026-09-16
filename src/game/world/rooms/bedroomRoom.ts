import type { WorldObject } from '../WorldObject'
import { contentAlignedCollider, scaleForWidth } from './worldObjectHelpers'

/**
 * TOP-LEFT: the bedroom. The bed is the room's one physical obstacle
 * (collision derived from its measured content bbox, same approach as
 * before); every other bedroom asset integrated here is visual-only
 * furniture — no collision box is invented for it, matching kitchen.ts's
 * "visual placement first, collision refinement later" precedent, so
 * there's no risk of an oversized box trapping the player.
 */

/**
 * Natural pixel dimensions of the approved double-bed PNG
 * (assets/world/structural/Double_bed.png), read directly from the source
 * file. Like the old bed art, this PNG carries transparent padding beyond
 * the actual bed silhouette; `BED_CONTENT_BBOX` records where the solid
 * artwork actually sits inside that canvas, measured directly from the
 * pixel data (alpha-channel scan), so the collision footprint below can
 * skip the padding entirely.
 */
const BED_NATURAL_SIZE = { width: 765, height: 1024 } // Double_bed.png
const BED_CONTENT_BBOX = { minX: 113, minY: 102, maxX: 651, maxY: 904 }

/** Target rendered width (world px) — chosen so the bed's footprint reads at roughly the same in-room scale as the desks while fitting the top-left corner. Change this single number to resize just the bed. */
const BED_TARGET_WIDTH = 300
const BED_SCALE = scaleForWidth(BED_NATURAL_SIZE, BED_TARGET_WIDTH)

/**
 * The bed's Sprite renders from the full (padded) canvas, so its anchor
 * point — `position`, the canvas's bottom-center — sits below the visible
 * footboard by the padding measured in `BED_CONTENT_BBOX`. This offset
 * converts a *desired visible floor point* into the `position` value that
 * actually produces it, so the bed's own position below can be authored in
 * terms of "where the bed should visually sit" rather than requiring the
 * padding math to be redone by hand every time it's retuned.
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

const bedPosition = bedPositionForVisibleFloorPoint({ x: 230, y: 490 }) // WORLD POSITION — SAFE TO TUNE (the visible floor point, not the padded canvas anchor)

const bedObject: WorldObject = {
  id: 'bed',
  asset: 'structural.bed',
  label: 'BED',
  position: bedPosition,
  layer: 'object',
  transform: { width: BED_TARGET_WIDTH },
  collision: contentAlignedCollider(
    bedPosition,
    BED_NATURAL_SIZE,
    BED_CONTENT_BBOX,
    BED_SCALE,
  ),
  // No `interaction` — purely environmental furniture, nothing to open.
}

export const bedroomObjects: WorldObject[] = [
  bedObject,
  {
    id: 'bedroom-wall-lamp',
    asset: 'bedroom.wallLamp',
    label: 'BEDSIDE LAMP',
    position: { x: 320, y: 280 }, // WORLD POSITION — SAFE TO TUNE — wall-mounted, right of the bed's headboard
    layer: 'object',
    transform: { width: 50 },
    // No `collision` — wall-mounted decor, visual placement pass only.
  },
  {
    id: 'bedroom-art',
    asset: 'bedroom.art',
    label: 'WALL ART',
    position: { x: 750, y: 175 }, // WORLD POSITION — SAFE TO TUNE — back wall, right of the lamp
    layer: 'object',
    transform: { width: 70 },
  },
  {
    id: 'bedroom-hanging-shelf',
    asset: 'bedroom.hangingShelf',
    label: 'HANGING SHELF',
    position: { x: 200, y: 220 }, // WORLD POSITION — SAFE TO TUNE — back wall, further right
    layer: 'object',
    transform: { width: 260 },
  },
  {
    id: 'bedroom-beanbag',
    asset: 'bedroom.beanbag',
    label: 'BEANBAG CHAIR',
    position: { x: 755, y: 320 }, // WORLD POSITION — SAFE TO TUNE — open floor at the foot of the bed
    layer: 'object',
    transform: { width: 230 },
  },
  {
    id: 'bedroom-jersey-rack',
    asset: 'bedroom.jerseyRack',
    label: 'JERSEY RACK',
    position: { x: 450, y: 340 }, // WORLD POSITION — SAFE TO TUNE — open floor, right side of the room
    layer: 'object',
    transform: { width: 160 },
  },
]
