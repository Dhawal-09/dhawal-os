import type { WorldObject } from '../WorldObject'
import { scaleForWidth } from './worldObjectHelpers'

/**
 * KITCHEN — the tiled-floor nook right of the main work desk
 * (Background2.png). Arrangement matches the approved reference ("kitchen
 * layout.png"): fridge at the *left* end of the back-wall run (immediately
 * right of the desk), then the main counter (sink + cooktop) and side
 * counter continuing right toward the wall, with the shelf/rack mounted
 * above and the dining set in the open tile floor to the right of the
 * SKILLS marker. Visual placement pass only — no collision, no interaction.
 * Draw order below is deliberately back-to-front — counters first, then
 * whatever sits on/above them — since World.ts draws array order, not a
 * Y-sort.
 */

/**
 * The approved Kitchen PNGs (assets/world/Kitchen/*.png) are AI-exported on
 * an oversized, mostly-transparent canvas with the actual artwork centered
 * inside it. Measured directly from each file's pixel data (never guessed),
 * `KITCHEN_ASSET_CONTENT_BBOX` records where each asset's real content sits
 * inside its canvas. These assets are also horizontally centered within
 * their canvas (verified per-file), so `kitchenPositionForFloorPoint` only
 * needs to correct the vertical (padding-below-content) offset.
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
  fridge: { width: 400, height: 1792 }, // Fridge1.png (developer magnets already on the door)
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
 * Target rendered *width* (world px) per kitchen asset — retuned to match
 * the reference layout ("kitchen layout.png"): the fridge sits at the
 * *left* end of the back-wall run (right after the main work desk), so the
 * whole run — fridge, main counter, side counter — has to fit in the
 * narrower strip between the desk and the right wall.
 *
 * Every asset gets its own independent number — including the four counter
 * props, split out so each one (holder/salt/bowl/plate) can be resized
 * without moving the others. Change one number to resize just that asset.
 */
const KITCHEN_TARGET_WIDTH = {
  mainCounter: 538,
  sideCounter: 330,
  fridge: 530,
  cooktop: 192,
  coffeeMachine: 245.76,
  hangingPans: 160,
  wallShelf: 170,
  diningSet: 432,
  light: 202,
  propHolder: 31.24,
  propSalt: 23.1,
  propBowl: 25.74,
  propPlate: 30.36,
} as const

/** The uniform scale each target width implies — used only for the collision-adjacent position offset math above (`kitchenPositionForFloorPoint`), independent of the actual rendered Sprite (which sizes itself from `transform.width`). */
const KITCHEN_SCALE = {
  mainCounter: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.mainCounter,
    KITCHEN_TARGET_WIDTH.mainCounter,
  ),
  sideCounter: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.sideCounter,
    KITCHEN_TARGET_WIDTH.sideCounter,
  ),
  fridge: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.fridge,
    KITCHEN_TARGET_WIDTH.fridge,
  ),
  cooktop: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.cooktop,
    KITCHEN_TARGET_WIDTH.cooktop,
  ),
  coffeeMachine: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.coffeeMachine,
    KITCHEN_TARGET_WIDTH.coffeeMachine,
  ),
  hangingPans: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.hangingPans,
    KITCHEN_TARGET_WIDTH.hangingPans,
  ),
  wallShelf: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.wallShelf,
    KITCHEN_TARGET_WIDTH.wallShelf,
  ),
  diningSet: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningSet,
    KITCHEN_TARGET_WIDTH.diningSet,
  ),
  light: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.light,
    KITCHEN_TARGET_WIDTH.light,
  ),
  propHolder: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.propHolder,
    KITCHEN_TARGET_WIDTH.propHolder,
  ),
  propSalt: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.propSalt,
    KITCHEN_TARGET_WIDTH.propSalt,
  ),
  propBowl: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.propBowl,
    KITCHEN_TARGET_WIDTH.propBowl,
  ),
  propPlate: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.propPlate,
    KITCHEN_TARGET_WIDTH.propPlate,
  ),
} as const

/** Builds a kitchen WorldObject's `position` from its intended visible floor/counter point, and its `transform` from the asset's own independent target width — see `kitchenPositionForFloorPoint`. `rotationDegrees` (default 0) is authored in plain degrees and converted to the radians Pixi's `Sprite.rotation` expects; it turns the sprite around its own anchor point (bottom-center), so a 180° turn also flips which side of that point the art renders on — reposition `visible` afterward if the rotated art no longer sits on the intended floor point. */
function kitchenObject(
  id: string,
  asset: string,
  label: string,
  visible: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: { readonly maxY: number },
  scale: number,
  targetWidth: number,
  rotationDegrees = 0,
): WorldObject {
  return {
    id,
    asset,
    label,
    position: kitchenPositionForFloorPoint(visible, naturalSize, contentBBox, scale),
    layer: 'object',
    transform: {
      width: targetWidth,
      ...(rotationDegrees !== 0 && {
        rotation: (rotationDegrees * Math.PI) / 180,
      }),
    },
    // No `collision` — visual placement pass only.
  }
}

export const kitchenObjects: WorldObject[] = [
  kitchenObject(
    'kitchen-fridge',
    'kitchen.fridge',
    'REFRIGERATOR',
    { x: 1453, y: -28 }, // WORLD POSITION — SAFE TO TUNE — leftmost, right after the main work desk
    KITCHEN_ASSET_NATURAL_SIZE.fridge,
    KITCHEN_ASSET_CONTENT_BBOX.fridge,
    KITCHEN_SCALE.fridge,
    KITCHEN_TARGET_WIDTH.fridge,
  ),
  kitchenObject(
    'kitchen-main-counter',
    'kitchen.mainCounter',
    'KITCHEN COUNTER',
    { x: 1675, y: 300 }, // WORLD POSITION — SAFE TO TUNE
    KITCHEN_ASSET_NATURAL_SIZE.mainCounter,
    KITCHEN_ASSET_CONTENT_BBOX.mainCounter,
    KITCHEN_SCALE.mainCounter,
    KITCHEN_TARGET_WIDTH.mainCounter,
  ),
  kitchenObject(
    'kitchen-side-counter',
    'kitchen.sideCounter',
    'SIDE COUNTER',
    { x: 1700, y: 278 }, // WORLD POSITION — SAFE TO TUNE — connects/aligns with the main counter's right edge
    KITCHEN_ASSET_NATURAL_SIZE.sideCounter,
    KITCHEN_ASSET_CONTENT_BBOX.sideCounter,
    KITCHEN_SCALE.sideCounter,
    KITCHEN_TARGET_WIDTH.sideCounter,
    90, // rotated 90° — see kitchenObject()'s note on anchor-point flipping
  ),
  kitchenObject(
    'kitchen-wall-shelf',
    'kitchen.wallShelf',
    'WALL SHELF',
    { x: 1750, y: 139 }, // WORLD POSITION — SAFE TO TUNE — above the fridge/counter seam, per reference
    KITCHEN_ASSET_NATURAL_SIZE.wallShelf,
    KITCHEN_ASSET_CONTENT_BBOX.wallShelf,
    KITCHEN_SCALE.wallShelf,
    KITCHEN_TARGET_WIDTH.wallShelf,
  ),
  kitchenObject(
    'kitchen-hanging-pans',
    'kitchen.hangingPans',
    'HANGING PANS',
    { x: 1590, y: 158 }, // WORLD POSITION — SAFE TO TUNE — above the cooktop, per reference
    KITCHEN_ASSET_NATURAL_SIZE.hangingPans,
    KITCHEN_ASSET_CONTENT_BBOX.hangingPans,
    KITCHEN_SCALE.hangingPans,
    KITCHEN_TARGET_WIDTH.hangingPans,
  ),
  kitchenObject(
    'kitchen-light',
    'kitchen.light',
    'KITCHEN LIGHT',
    { x: 1620, y: 1170 }, // WORLD POSITION — SAFE TO TUNE — near the coffee-machine end of the counter, per reference
    KITCHEN_ASSET_NATURAL_SIZE.light,
    KITCHEN_ASSET_CONTENT_BBOX.light,
    KITCHEN_SCALE.light,
    KITCHEN_TARGET_WIDTH.light,
  ),
  kitchenObject(
    'kitchen-cooktop',
    'kitchen.cooktop',
    'COOKTOP',
    { x: 1650, y: 230 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter
    KITCHEN_ASSET_NATURAL_SIZE.cooktop,
    KITCHEN_ASSET_CONTENT_BBOX.cooktop,
    KITCHEN_SCALE.cooktop,
    KITCHEN_TARGET_WIDTH.cooktop,
  ),
  kitchenObject(
    'kitchen-coffee-machine',
    'kitchen.coffeeMachine',
    'COFFEE MACHINE',
    { x: 1725, y: 205 }, // WORLD POSITION — SAFE TO TUNE — sits at the counter's right/end, per reference
    KITCHEN_ASSET_NATURAL_SIZE.coffeeMachine,
    KITCHEN_ASSET_CONTENT_BBOX.coffeeMachine,
    KITCHEN_SCALE.coffeeMachine,
    KITCHEN_TARGET_WIDTH.coffeeMachine,
  ),
  kitchenObject(
    'kitchen-counter-prop-holder',
    'kitchen.propHolder',
    'UTENSIL HOLDER',
    { x: 1560, y: 222 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter, left of the cooktop, per reference
    KITCHEN_ASSET_NATURAL_SIZE.propHolder,
    KITCHEN_ASSET_CONTENT_BBOX.propHolder,
    KITCHEN_SCALE.propHolder,
    KITCHEN_TARGET_WIDTH.propHolder,
  ),
  kitchenObject(
    'kitchen-counter-prop-salt',
    'kitchen.propSalt',
    'SALT SHAKER',
    { x: 1580, y: 220 }, // WORLD POSITION — SAFE TO TUNE — grouped with the utensil holder
    KITCHEN_ASSET_NATURAL_SIZE.propSalt,
    KITCHEN_ASSET_CONTENT_BBOX.propSalt,
    KITCHEN_SCALE.propSalt,
    KITCHEN_TARGET_WIDTH.propSalt,
  ),
  kitchenObject(
    'kitchen-counter-prop-bowl',
    'kitchen.propBowl',
    'BOWL',
    { x: 1800, y: 252 }, // WORLD POSITION — SAFE TO TUNE — grouped on the side counter
    KITCHEN_ASSET_NATURAL_SIZE.propBowl,
    KITCHEN_ASSET_CONTENT_BBOX.propBowl,
    KITCHEN_SCALE.propBowl,
    KITCHEN_TARGET_WIDTH.propBowl,
  ),
  kitchenObject(
    'kitchen-counter-prop-plate',
    'kitchen.propPlate',
    'PLATE',
    { x: 1820, y: 251 }, // WORLD POSITION — SAFE TO TUNE — grouped on the side counter
    KITCHEN_ASSET_NATURAL_SIZE.propPlate,
    KITCHEN_ASSET_CONTENT_BBOX.propPlate,
    KITCHEN_SCALE.propPlate,
    KITCHEN_TARGET_WIDTH.propPlate,
  ),
  kitchenObject(
    'kitchen-dining-set',
    'kitchen.diningSet',
    'DINING TABLE',
    { x: 1680, y: 600 }, // WORLD POSITION — SAFE TO TUNE — open floor, right of the SKILLS marker, per reference
    KITCHEN_ASSET_NATURAL_SIZE.diningSet,
    KITCHEN_ASSET_CONTENT_BBOX.diningSet,
    KITCHEN_SCALE.diningSet,
    KITCHEN_TARGET_WIDTH.diningSet,
  ),
]
