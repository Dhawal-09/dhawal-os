import type { AssetTransform, Collider, WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  contentAlignedCollider,
  placeByVisibleContent,
} from './worldObjectHelpers'

/**
 * BOTTOM-CENTER: the Hobbies/gym room. Only the two currently-approved gym
 * assets exist (vertical dumbbell rack + a combined home-gym-station/bench
 * unit) — no football storage/footballs art has been generated yet, so
 * neither is added (per "do not invent missing assets"), and the punching
 * bag is explicitly out of scope for this pass. The three big floor pieces
 * — dumbbell rack, gym station and stand — are solid (see
 * `spriteFootprintCollider` below); everything else here is visual-only.
 * No interaction (there is no "hobbies" content marker/action in the
 * interaction system yet).
 */

/**
 * The Hobbies room's interior — a brick-and-steel-framed panel baked into
 * the shared house background (assets/world/structural/Background2.png),
 * distinct from the plain wood-panel wall used elsewhere. Measured directly
 * from that PNG's pixel data (scanning for the steel frame's blue-gray tone
 * against the brick fill's warm gray-brown, at texture scale ×1.328 — the
 * same `Math.max(WORLD_WIDTH/textureWidth, WORLD_HEIGHT/textureHeight)`
 * uniform scale `worldPlaceholders.ts` uses to place that background), so
 * the floor/trim below can align with it exactly rather than guessing.
 * `HOBBIES_INTERIOR_TOP` is the frame's own inner/bottom edge — where the
 * brick backdrop ends and the room's own interior begins; the interior's
 * bottom is pinned to the canonical `BOTTOM_WALL_INNER_Y` room-boundary
 * constant instead of the raw measurement, so it always meets that wall
 * exactly, with no gap, even if the boundary is ever retuned.
 */
const HOBBIES_INTERIOR_LEFT = 773
const HOBBIES_INTERIOR_RIGHT = 1324
const HOBBIES_INTERIOR_TOP = 858
const HOBBIES_INTERIOR_BOTTOM = BOTTOM_WALL_INNER_Y // 1200 — meets the existing wall cleanly
const HOBBIES_INTERIOR_HEIGHT = HOBBIES_INTERIOR_BOTTOM - HOBBIES_INTERIOR_TOP

/**
 * The conceptual brick/floor split line — the midpoint of the interior. The
 * transition trim straddles this line (half above, half below), so it
 * visually overlaps both the brick's bottom edge and the floor's top edge
 * enough to hide any 1px seam between them, per "the trim should visually
 * overlap the seam enough to hide any tiny gap." The trim is deliberately
 * thin (`TRIM_HEIGHT`) — a skirting line, not a second wall — so the room
 * still reads as an approximate 50/50 brick-wall/gym-floor split overall
 * (brick ≈ 47%, trim ≈ 5%, floor ≈ 47% of the interior height).
 */
const HOBBIES_SPLIT_Y = HOBBIES_INTERIOR_TOP + HOBBIES_INTERIOR_HEIGHT * 0.5
const TRIM_HEIGHT = 18
const HOBBIES_TRIM_TOP = HOBBIES_SPLIT_Y - TRIM_HEIGHT / 2
const HOBBIES_TRIM_BOTTOM = HOBBIES_SPLIT_Y + TRIM_HEIGHT / 2

/** The floor begins exactly where the trim ends — no gap, and the trim (not the floor) owns the seam overlap. */
const HOBBIES_FLOOR_TOP = HOBBIES_TRIM_BOTTOM
const HOBBIES_FLOOR_BOTTOM = HOBBIES_INTERIOR_BOTTOM

/**
 * Invisible AABB collision for the Hobbies back wall — purely gameplay
 * geometry, never a WorldObject (a WorldObject always renders *something*,
 * either its real sprite or the dev placeholder box+label, so it can't be
 * made invisible; a wall isn't a positioned/labeled/asset-bearing thing the
 * way furniture is anyway). Same precedent as the world's own
 * `ROOM_BOUNDARY_COLLIDERS` in `worldObjectHelpers.ts`: independent,
 * hand-authored geometry describing what the *art* depicts, resolved
 * through `CollisionSystem`'s existing `extraObstacles` list — no change to
 * the collision algorithm itself, and never rendered outside the dev-only
 * collision debug overlay.
 *
 * `HOBBIES_WALL_TOP` is the steel frame's own outer top edge (measured the
 * same way as `HOBBIES_INTERIOR_TOP` above) — slightly above the brick fill,
 * so the collider covers the full visible wall structure (frame + brick),
 * not just the brick's own fill. Both colliders stop at `HOBBIES_TRIM_TOP`:
 * short of the trim/floor, so neither extends into the walkable gym floor
 * or creates a gap against the visible wall above.
 */
const HOBBIES_WALL_TOP = 828
const HOBBIES_WALL_BOTTOM = HOBBIES_TRIM_TOP
/** Measured thickness of the right-side steel frame post (world x ≈1308–1348), read from Background2.png's pixel data the same way as the rest of this frame's geometry. */
const HOBBIES_WALL_RIGHT_THICKNESS = 40

export const hobbiesColliders: readonly Collider[] = [
  // Top: the brick back wall itself, spanning the room's full interior
  // width — the player can't walk up into the wall art.
  {
    x: HOBBIES_INTERIOR_LEFT,
    y: HOBBIES_WALL_TOP,
    width: HOBBIES_INTERIOR_RIGHT - HOBBIES_INTERIOR_LEFT,
    height: HOBBIES_WALL_BOTTOM - HOBBIES_WALL_TOP,
  },
  // Right: the frame's right-side post, flush against the top collider's
  // right edge (touching at x = HOBBIES_INTERIOR_RIGHT, so the two connect
  // with no gap) and the same height, so it stops at the same row the top
  // collider does — short of the gym floor/trim, leaving the room's own
  // open floor (the legitimate approach to Hobbies) completely unblocked.
  {
    x: HOBBIES_INTERIOR_RIGHT,
    y: HOBBIES_WALL_TOP,
    width: HOBBIES_WALL_RIGHT_THICKNESS,
    height: HOBBIES_WALL_BOTTOM - HOBBIES_WALL_TOP,
  },
]

interface ContentBBox {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

interface TargetRect {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Fits an asset's *visible content* (not its padded canvas) exactly into a
 * target world-space rectangle, for a sprite anchored bottom-center (the
 * default for every furniture sprite — see `createDeskSprite`). Independent
 * x/y scale (via `AssetTransform`'s independent width/height) fills the
 * target rectangle exactly on both axes, absorbing any small aspect-ratio
 * mismatch between the art and the space it needs to fill as a barely
 * perceptible stretch rather than under/over-filling one axis — the same
 * approach `bedroomRoom.ts`'s bed and the original gym-floor placement use,
 * generalized here since the trim needs the identical padding-correction
 * math.
 */
function fitContentToRect(
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: ContentBBox,
  target: TargetRect,
): { position: { x: number; y: number }; transform: AssetTransform } {
  const contentWidth = contentBBox.maxX - contentBBox.minX
  const contentHeight = contentBBox.maxY - contentBBox.minY
  const scaleX = (target.right - target.left) / contentWidth
  const scaleY = (target.bottom - target.top) / contentHeight

  const contentCenterX = (contentBBox.minX + contentBBox.maxX) / 2
  const canvasCenterX = naturalSize.width / 2
  const paddingBelowContent = naturalSize.height - contentBBox.maxY

  return {
    position: {
      x:
        (target.left + target.right) / 2 +
        (canvasCenterX - contentCenterX) * scaleX,
      y: target.bottom + paddingBelowContent * scaleY,
    },
    transform: {
      width: naturalSize.width * scaleX,
      height: naturalSize.height * scaleY,
    },
  }
}

/**
 * Natural pixel dimensions of the approved gym-floor PNG
 * (assets/world/HobbiesRoom/GymFloor.png), read directly from the source
 * file. Like the bed/kitchen assets, it carries transparent padding beyond
 * the actual floor-mat silhouette (a soft drop-shadow border); `CONTENT_BBOX`
 * records where the solid artwork actually sits inside that canvas,
 * measured directly from the pixel data (alpha-channel scan).
 *
 * VISUAL QUALITY NOTE: this asset's material reads as a realistic/photo-like
 * rubber-mat texture, noticeably smoother and more literal than the rest of
 * DHAWAL.OS's chunky hand-shaded pixel-art furniture (bed, desks, brick
 * wall). Per this pass's explicit instructions, the PNG itself was not
 * repainted, filtered, or otherwise modified — see the phase report:
 * "Gym floor asset should be regenerated with stronger pixel-art treatment."
 */
const GYM_FLOOR_NATURAL_SIZE = { width: 1200, height: 896 }
const GYM_FLOOR_CONTENT_BBOX = { minX: 87, minY: 122, maxX: 1109, maxY: 799 }

const gymFloorFit = fitContentToRect(GYM_FLOOR_NATURAL_SIZE, GYM_FLOOR_CONTENT_BBOX, {
  left: HOBBIES_INTERIOR_LEFT,
  right: HOBBIES_INTERIOR_RIGHT,
  top: HOBBIES_FLOOR_TOP,
  bottom: HOBBIES_FLOOR_BOTTOM,
})

/**
 * Natural pixel dimensions of the approved transition/skirting PNG
 * (assets/world/HobbiesRoom/TransitionTrim.png) — a thin horizontal
 * architectural strip meant to sit exactly on the brick/floor seam, hiding
 * any hairline gap between the two. Measured the same way as the gym floor.
 */
const TRIM_NATURAL_SIZE = { width: 1190, height: 896 }
const TRIM_CONTENT_BBOX = { minX: 89, minY: 394, maxX: 1110, maxY: 501 }

const trimFit = fitContentToRect(TRIM_NATURAL_SIZE, TRIM_CONTENT_BBOX, {
  left: HOBBIES_INTERIOR_LEFT,
  right: HOBBIES_INTERIOR_RIGHT,
  top: HOBBIES_TRIM_TOP,
  bottom: HOBBIES_TRIM_BOTTOM,
})

/**
 * Natural pixel dimensions of the approved football-rack PNG
 * (assets/world/HobbiesRoom/Rack.png) — a tall, narrow rack on a wide,
 * mostly-transparent canvas (the visible rack is only ~16% of the canvas
 * width), so a plain width-only `transform` renders it as a barely-visible
 * sliver; `fitContentToRect` is used here too, same as the floor/trim,
 * purely to size it sensibly — not for architectural alignment.
 */
const FOOTBALL_RACK_NATURAL_SIZE = { width: 1200, height: 896 }
const FOOTBALL_RACK_CONTENT_BBOX = { minX: 503, minY: 252, maxX: 696, maxY: 680 }

const footballRackFit = fitContentToRect(
  FOOTBALL_RACK_NATURAL_SIZE,
  FOOTBALL_RACK_CONTENT_BBOX,
  {
    left: 1247.5,
    right: 1292.5, // 45 world px wide, visually similar scale to the dumbbell rack
    top: 1075,
    bottom: 1175,
  },
)

/**
 * Wall trophy plaque, mirror and floor stand — each measured from its own
 * PNG's alpha channel and placed by *visible* size/position via
 * `placeByVisibleContent`, so the numbers below are what you actually see.
 */
const WALL_TROPHY_PLACEMENT = placeByVisibleContent(
  { width: 1024, height: 559 }, // stand-Photoroom.png
  { minX: 357, maxX: 666, maxY: 451 },
  90, // visible width — SAFE TO TUNE
  { x: 850, y: 985 }, // WORLD POSITION — SAFE TO TUNE — brick wall, left of the artwork
)
const MIRROR_PLACEMENT = placeByVisibleContent(
  { width: 1024, height: 559 }, // mirror-Photoroom.png
  { minX: 383, maxX: 631, maxY: 486 },
  55, // visible width — SAFE TO TUNE
  { x: 935, y: 995 }, // WORLD POSITION — SAFE TO TUNE — brick wall, between the trophy and the artwork
)
const STAND_PLACEMENT = placeByVisibleContent(
  { width: 1581, height: 1025 }, // Stand.png
  { minX: 607, maxX: 1010, maxY: 861 },
  62, // visible width — SAFE TO TUNE
  { x: 1010, y: 1175 }, // WORLD POSITION — SAFE TO TUNE — gym floor, between the dumbbell rack and the gym station
)

/**
 * Natural canvas size + measured opaque-content bbox (alpha-channel scan) of
 * the three solid gym pieces. The colliders below are derived from these, so
 * each one is exactly the size of what's visible in its image — not the
 * padded canvas.
 */
const DUMBBELL_RACK_NATURAL_SIZE = { width: 1200, height: 896 } // Dumbel rack.png
const DUMBBELL_RACK_CONTENT_BBOX = { minX: 232, minY: 245, maxX: 967, maxY: 673 }
const GYM_STATION_NATURAL_SIZE = { width: 1024, height: 1024 } // workout-Photoroom.png
const GYM_STATION_CONTENT_BBOX = { minX: 276, minY: 147, maxX: 747, maxY: 916 }
const STAND_NATURAL_SIZE = { width: 1581, height: 995 } // Stand.png (true file size)
const STAND_CONTENT_BBOX = { minX: 607, minY: 150, maxX: 1010, maxY: 861 }

/** Collider matching a width-only-scaled sprite's visible content — anchor (0.5, 1), uniform scale = `transform.width / naturalSize.width`. */
function spriteFootprintCollider(
  position: { x: number; y: number },
  transform: { width: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: ContentBBox,
): Collider {
  return contentAlignedCollider(
    position,
    naturalSize,
    contentBBox,
    transform.width / naturalSize.width,
  )
}

const DUMBBELL_RACK_POSITION = { x: 860, y: 1240 } // WORLD POSITION — SAFE TO TUNE
const DUMBBELL_RACK_TRANSFORM = { width: 250 }
const GYM_STATION_POSITION = { x: 1140, y: 1180 } // WORLD POSITION — SAFE TO TUNE
const GYM_STATION_TRANSFORM = { width: 280 }

export const hobbiesObjects: WorldObject[] = [
  {
    id: 'hobbies-gym-floor',
    asset: 'hobbies.gymFloor',
    label: 'GYM FLOOR',
    position: gymFloorFit.position,
    layer: 'object',
    transform: gymFloorFit.transform,
    // No `collision` — a pure floor surface, not an obstacle.
  },
  {
    id: 'hobbies-transition-trim',
    asset: 'hobbies.transitionTrim',
    label: 'TRANSITION TRIM',
    position: trimFit.position,
    layer: 'object',
    transform: trimFit.transform,
    // No `collision` — purely decorative skirting; the existing wall
    // boundary (ROOM_BOUNDARY_COLLIDERS) already provides the correct
    // physical boundary here, so this doesn't need its own.
  },

  // BACK/WALL AREA — decorative displays mounted on the brick wall band
  // (y ≈ 828-1020), left to right: personal artwork, jersey, scarf. Plain
  // width-only transforms (no content-bbox fit) — same lightweight pattern
  // as the bedroom's wall decor, appropriate for small decorative pieces
  // where pixel-perfect alignment isn't required.
  {
    id: 'hobbies-artwork',
    asset: 'hobbies.artwork',
    label: 'ARTWORK',
    position: { x: 1010, y: 990 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 170 },
  },
  {
    id: 'hobbies-jersey',
    asset: 'hobbies.jersey',
    label: 'JERSEY DISPLAY',
    position: { x: 1100, y: 990 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 130 },
  },
  {
    id: 'hobbies-scarf',
    asset: 'hobbies.scarf',
    label: 'SCARF DISPLAY',
    position: { x: 1230, y: 1020 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 280 },
  },

  {
    id: 'hobbies-wall-trophy',
    asset: 'hobbies.wallTrophy',
    label: 'WALL TROPHY',
    position: WALL_TROPHY_PLACEMENT.position,
    layer: 'object',
    transform: WALL_TROPHY_PLACEMENT.transform,
    // No `collision` — wall-mounted decor.
  },
  {
    id: 'hobbies-mirror',
    asset: 'hobbies.mirror',
    label: 'MIRROR',
    position: MIRROR_PLACEMENT.position,
    layer: 'object',
    transform: MIRROR_PLACEMENT.transform,
    // No `collision` — wall-mounted decor.
  },

  // ONE SIDE — dumbbell rack + accessories storage, left portion of the floor.
  {
    id: 'hobbies-stand',
    asset: 'hobbies.stand',
    label: 'STAND',
    position: STAND_PLACEMENT.position,
    layer: 'object',
    transform: STAND_PLACEMENT.transform,
    collision: spriteFootprintCollider(
      STAND_PLACEMENT.position,
      STAND_PLACEMENT.transform,
      STAND_NATURAL_SIZE,
      STAND_CONTENT_BBOX,
    ),
  },
  {
    id: 'hobbies-dumbbell-rack',
    asset: 'hobbies.dumbbellRack',
    label: 'DUMBBELL RACK',
    position: DUMBBELL_RACK_POSITION,
    layer: 'object',
    transform: DUMBBELL_RACK_TRANSFORM,
    collision: spriteFootprintCollider(
      DUMBBELL_RACK_POSITION,
      DUMBBELL_RACK_TRANSFORM,
      DUMBBELL_RACK_NATURAL_SIZE,
      DUMBBELL_RACK_CONTENT_BBOX,
    ),
  },
  // VISUAL QUALITY NOTE: Storage.png has no real transparency — its
  // background was flattened to an opaque checkerboard (alpha=255
  // everywhere, verified against the raw pixel data) instead of being
  // exported with an alpha channel around the cabinet. It will render with
  // a visible light-gray checkered square around it rather than blending
  // into the floor. Not fixed here per this pass's "do not
  // generate/modify/redraw artwork" scope — see the phase report:
  // "Storage.png should be re-exported with a real transparent background."
  {
    id: 'hobbies-storage',
    asset: 'hobbies.storage',
    label: 'STORAGE RACK',
    position: { x: 1260, y: 1100 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 210 },
  },

  // MAIN GYM AREA — the combined cable-machine/bench unit, center of the floor.
  {
    id: 'hobbies-gym-station',
    asset: 'hobbies.gymStation',
    label: 'GYM STATION',
    position: GYM_STATION_POSITION,
    layer: 'object',
    message: {
      type: 'flavor',
      text: 'Debugging burns calories too.',
      radius: 160,
    },
    transform: GYM_STATION_TRANSFORM,
    collision: spriteFootprintCollider(
      GYM_STATION_POSITION,
      GYM_STATION_TRANSFORM,
      GYM_STATION_NATURAL_SIZE,
      GYM_STATION_CONTENT_BBOX,
    ),
  },

  // FOOTBALL AREA — the ball rack, right portion of the floor. (Only one
  // such asset exists — see the phase report: it fulfills both the
  // "football display rack" and "football storage rack + footballs" roles
  // from the brief, since there's no second distinct asset for either.)
  {
    id: 'hobbies-football-rack',
    asset: 'hobbies.footballRack',
    label: 'FOOTBALL RACK',
    position: footballRackFit.position,
    layer: 'object',
    message: {
      type: 'flavor',
      text: 'Some problems need a different tackle.',
      radius: 130,
    },
    transform: footballRackFit.transform,
  },
]
