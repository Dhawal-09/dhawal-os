import type { WorldObject } from '../WorldObject'
import { contentAlignedCollider, scaleForWidth } from './worldObjectHelpers'

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
  fridge: { width: 2400, height: 1792 }, // Fridge1.png (developer magnets already on the door)
  cooktop: { width: 2400, height: 1792 }, // Stove.png
  coffeeMachine: { width: 1024, height: 765 }, // coffee-Makaer.png
  hangingPans: { width: 1200, height: 896 }, // Hanging Pans.png
  wallShelf: { width: 1200, height: 896 }, // Jars.png
  diningTable: { width: 1376, height: 768 }, // Dining/DiningTable.png
  diningChairBack: { width: 2400, height: 1792 }, // Dining/BackChaire.png
  diningChairFront: { width: 1200, height: 896 }, // Dining/Frontchair.png
  diningChairLeft: { width: 1024, height: 765 }, // Dining/LeftChair.png
  diningChairRight: { width: 1200, height: 896 }, // Dining/RightChair.png
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
  diningTable: { minX: 446, minY: 134, maxX: 928, maxY: 713 },
  diningChairBack: { minX: 794, minY: 214, maxX: 1605, maxY: 1676 },
  diningChairFront: { minX: 444, minY: 130, maxX: 779, maxY: 770 },
  diningChairLeft: { minX: 290, minY: 93, maxX: 723, maxY: 715 },
  diningChairRight: { minX: 382, minY: 88, maxX: 851, maxY: 822 },
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
  sideCounter: 100,
  fridge: 530,
  cooktop: 192,
  coffeeMachine: 245.76,
  hangingPans: 160,
  wallShelf: 170,
  diningTable: 342.6, // visible ~120px wide~
  diningChairBack: 177,
  diningChairFront: 177,
  diningChairLeft: 157,
  diningChairRight: 157,
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
  diningTable: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningTable,
    KITCHEN_TARGET_WIDTH.diningTable,
  ),
  diningChairBack: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningChairBack,
    KITCHEN_TARGET_WIDTH.diningChairBack,
  ),
  diningChairFront: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningChairFront,
    KITCHEN_TARGET_WIDTH.diningChairFront,
  ),
  diningChairLeft: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningChairLeft,
    KITCHEN_TARGET_WIDTH.diningChairLeft,
  ),
  diningChairRight: scaleForWidth(
    KITCHEN_ASSET_NATURAL_SIZE.diningChairRight,
    KITCHEN_TARGET_WIDTH.diningChairRight,
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
  contentBBox: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  },
  scale: number,
  targetWidth: number,
  rotationDegrees = 0,
  solid = false,
): WorldObject {
  const position = kitchenPositionForFloorPoint(
    visible,
    naturalSize,
    contentBBox,
    scale,
  )
  return {
    id,
    asset,
    label,
    position,
    layer: 'object',
    transform: {
      width: targetWidth,
      ...(rotationDegrees !== 0 && {
        rotation: (rotationDegrees * Math.PI) / 180,
      }),
    },
    // `solid` (default false) adds a collider matching the asset's own measured
    // visible footprint; every other kitchen piece stays visual-only.
    ...(solid && {
      collision: contentAlignedCollider(
        position,
        naturalSize,
        contentBBox,
        scale,
      ),
    }),
  }
}

/**
 * Kitchen accessories (assets/world/Kitchen/Acccesories/*.png): natural
 * canvas size, measured opaque bbox, and target rendered width. The small
 * items share the counter props' pixel scale (~0.22 world px per native px,
 * same as Utensil/holder.png); the second dining table (table + 4 chairs)
 * renders its content ~120 wide, matching the existing dining set.
 */
const KITCHEN_ACCESSORIES = {
  accDiningTable: {
    natural: { width: 369, height: 359 },
    bbox: { minX: 44, minY: 41, maxX: 346, maxY: 339 },
    width: 146.6,
  },
  accBottle: {
    natural: { width: 11, height: 272 },
    bbox: { minX: 14, minY: 59, maxX: 106, maxY: 236 },
    width: 38.8,
  },
  accMug: {
    natural: { width: 156, height: 149 },
    bbox: { minX: 31, minY: 28, maxX: 138, maxY: 134 },
    width: 34.3,
  },
  accDal: {
    natural: { width: 156, height: 152 },
    bbox: { minX: 18, minY: 25, maxX: 138, maxY: 141 },
    width: 34.3,
  },
  accFruits: {
    natural: { width: 173, height: 147 },
    bbox: { minX: 14, minY: 11, maxX: 158, maxY: 133 },
    width: 38.1,
  },
  accJar: {
    natural: { width: 108, height: 157 },
    bbox: { minX: 8, minY: 26, maxX: 95, maxY: 137 },
    width: 23.8,
  },
  accMobile: {
    natural: { width: 161, height: 170 },
    bbox: { minX: 25, minY: 21, maxX: 121, maxY: 150 },
    width: 35.4,
  },
  accPepper: {
    natural: { width: 160, height: 124 },
    bbox: { minX: 15, minY: 13, maxX: 146, maxY: 118 },
    width: 35.2,
  },
  accMeal: {
    natural: { width: 270, height: 152 },
    bbox: { minX: 17, minY: 11, maxX: 244, maxY: 146 },
    width: 59.4,
  },
  accPlates: {
    natural: { width: 189, height: 137 },
    bbox: { minX: 24, minY: 9, maxX: 151, maxY: 117 },
    width: 41.6,
  },
  accRamen: {
    natural: { width: 205, height: 171 },
    bbox: { minX: 10, minY: 2, maxX: 175, maxY: 160 },
    width: 45.1,
  },
  accWater: {
    natural: { width: 119, height: 128 },
    bbox: { minX: 20, minY: 13, maxX: 94, maxY: 121 },
    width: 26.2,
  },
  accSnacks: {
    natural: { width: 150, height: 119 },
    bbox: { minX: 17, minY: 14, maxX: 123, maxY: 107 },
    width: 53,
  },
} as const

/** A kitchen accessory at its visible resting point (bottom-center of the art). Visual-only unless `solid`. */
function kitchenAccessory(
  id: string,
  key: keyof typeof KITCHEN_ACCESSORIES,
  label: string,
  visible: { x: number; y: number },
  solid = false,
): WorldObject {
  const { natural, bbox, width } = KITCHEN_ACCESSORIES[key]
  return kitchenObject(
    id,
    `kitchen.${key}`,
    label,
    visible,
    natural,
    bbox,
    scaleForWidth(natural, width),
    width,
    0,
    solid,
  )
}

/**
 * Contextual interactions (INTERACTION_SPEC.md "Contextual messages"). Most
 * kitchen pieces are visual-only and several sit along one counter, so
 * each spot sets an `interactionPoint` on the floor where the player stands
 * to use it, with a small radius so neighbouring spots don't overlap:
 *
 * - interactive (`[E]` + short in-world response): fridge, cooktop, coffee
 *   machine, storage cabinet, dining table.
 * - flavor (text only, fades on its own): hanging pans, wall-shelf jars,
 *   counter. (The kitchen's plant line lives on the potted plant at the
 *   kitchen doorway, `entrance-plant-4` — the hanging plant here is right
 *   above the cooktop, where the cooktop's `[E]` would always win.)
 * - silent: counter props, chairs, hanging plant, café menu, light.
 */
const KITCHEN_SPOT_RADIUS = 45
/** Standing line just in front of the counter run. */
const COUNTER_FRONT_Y = 330

export const kitchenObjects: WorldObject[] = [
  {
    ...kitchenObject(
      'kitchen-fridge',
      'kitchen.fridge',
      'REFRIGERATOR',
      // WORLD POSITION — SAFE TO TUNE — the fridge's visible base, leftmost, right after the main work desk.
      // (360.67 reproduces the exact spot the old `y: -28` produced: that value
      // was tuned by eye while this asset's natural width was mis-recorded as
      // 400 instead of 2400, which inflated the padding offset; the width is
      // now correct so the collider below lines up with the art.)
      { x: 1453, y: 360.67 },
      KITCHEN_ASSET_NATURAL_SIZE.fridge,
      KITCHEN_ASSET_CONTENT_BBOX.fridge,
      KITCHEN_SCALE.fridge,
      KITCHEN_TARGET_WIDTH.fridge,
      0,
      true, // solid — collider matches the visible footprint
    ),
    // `position` is the padded canvas anchor, well below the fridge's base
    // (y≈361); stand right in front of it.
    interactionPoint: { x: 1453, y: 380 },
    interaction: {
      radius: 50,
      action: 'WORLD_RESPONSE',
      response: [
        'STATUS: FOOD AVAILABLE.',
        'DEVELOPER FUNCTIONALITY: QUESTIONABLE.',
      ],
    },
    message: { type: 'interactive', text: 'Check the fridge?' },
  },
  {
    ...kitchenObject(
      'kitchen-main-counter',
      'kitchen.mainCounter',
      'KITCHEN COUNTER',
      { x: 1675, y: 300 }, // WORLD POSITION — SAFE TO TUNE
      KITCHEN_ASSET_NATURAL_SIZE.mainCounter,
      KITCHEN_ASSET_CONTENT_BBOX.mainCounter,
      KITCHEN_SCALE.mainCounter,
      KITCHEN_TARGET_WIDTH.mainCounter,
    ),
    interactionPoint: { x: 1680, y: 420 },
    message: {
      type: 'flavor',
      text: 'This counter has seen more late nights than daylight.',
      radius: 40,
    },
  },
  {
    ...kitchenObject(
      'kitchen-side-counter',
      'kitchen.sideCounter',
      'SIDE COUNTER',
      { x: 1820, y: 478 }, // WORLD POSITION — SAFE TO TUNE — connects/aligns with the main counter's right edge
      KITCHEN_ASSET_NATURAL_SIZE.sideCounter,
      KITCHEN_ASSET_CONTENT_BBOX.sideCounter,
      KITCHEN_SCALE.sideCounter,
      KITCHEN_TARGET_WIDTH.sideCounter,
      // rotated 90° — see kitchenObject()'s note on anchor-point flipping
    ),
    // Solid: matches the side counter's full visible footprint as rendered
    // (Vertical-Coridor.png at width 100 → ~100×255, bottom-center at
    // (1820, ~532.7)), measured in-game.
    collision: { x: 1770, y: 277.4, width: 100, height: 255.3 },
    // The tall cabinet on the right wall; stand just left of it.
    interactionPoint: { x: 1760, y: 450 },
    interaction: {
      radius: KITCHEN_SPOT_RADIUS,
      action: 'WORLD_RESPONSE',
      response: ['STORAGE ACCESSED.', 'NOTHING SUSPICIOUS FOUND.'],
    },
    message: { type: 'interactive', text: 'Wanna stash something in here?' },
  },
  {
    ...kitchenObject(
      'kitchen-wall-shelf',
      'kitchen.wallShelf',
      'WALL SHELF',
      { x: 1750, y: 139 }, // WORLD POSITION — SAFE TO TUNE — above the fridge/counter seam, per reference
      KITCHEN_ASSET_NATURAL_SIZE.wallShelf,
      KITCHEN_ASSET_CONTENT_BBOX.wallShelf,
      KITCHEN_SCALE.wallShelf,
      KITCHEN_TARGET_WIDTH.wallShelf,
    ),
    // Just left of the (solid) side counter, below the coffee machine's spot.
    interactionPoint: { x: 1745, y: 385 },
    message: {
      type: 'flavor',
      text: 'A carefully engineered collection of things nobody remembers buying.',
      radius: 35,
    },
  },
  {
    ...kitchenObject(
      'kitchen-hanging-pans',
      'kitchen.hangingPans',
      'HANGING PANS',
      { x: 1590, y: 158 }, // WORLD POSITION — SAFE TO TUNE — above the cooktop, per reference
      KITCHEN_ASSET_NATURAL_SIZE.hangingPans,
      KITCHEN_ASSET_CONTENT_BBOX.hangingPans,
      KITCHEN_SCALE.hangingPans,
      KITCHEN_TARGET_WIDTH.hangingPans,
    ),
    interactionPoint: { x: 1565, y: COUNTER_FRONT_Y },
    message: {
      type: 'flavor',
      text: 'Someone actually uses these?',
      radius: KITCHEN_SPOT_RADIUS,
    },
  },
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
  {
    ...kitchenObject(
      'kitchen-cooktop',
      'kitchen.cooktop',
      'COOKTOP',
      { x: 1650, y: 230 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter
      KITCHEN_ASSET_NATURAL_SIZE.cooktop,
      KITCHEN_ASSET_CONTENT_BBOX.cooktop,
      KITCHEN_SCALE.cooktop,
      KITCHEN_TARGET_WIDTH.cooktop,
    ),
    interactionPoint: { x: 1648, y: COUNTER_FRONT_Y },
    interaction: {
      radius: KITCHEN_SPOT_RADIUS,
      action: 'WORLD_RESPONSE',
      response: ['NOTHING.', 'JUST LIKE YOUR CODE AT 2 AM.'],
    },
    message: { type: 'interactive', text: "What's cooking?" },
  },
  {
    ...kitchenObject(
      'kitchen-coffee-machine',
      'kitchen.coffeeMachine',
      'COFFEE MACHINE',
      { x: 1725, y: 205 }, // WORLD POSITION — SAFE TO TUNE — sits at the counter's right/end, per reference
      KITCHEN_ASSET_NATURAL_SIZE.coffeeMachine,
      KITCHEN_ASSET_CONTENT_BBOX.coffeeMachine,
      KITCHEN_SCALE.coffeeMachine,
      KITCHEN_TARGET_WIDTH.coffeeMachine,
    ),
    interactionPoint: { x: 1725, y: COUNTER_FRONT_Y },
    interaction: {
      radius: KITCHEN_SPOT_RADIUS,
      action: 'WORLD_RESPONSE',
      response: ['COFFEE DEPLOYED.', '+10 DEBUGGING ENERGY.'],
    },
    message: { type: 'interactive', text: 'Brew developer fuel?' },
  },
  kitchenObject(
    'kitchen-counter-prop-holder',
    'kitchen.propHolder',
    'UTENSIL HOLDER',
    { x: 1560, y: 210 }, // WORLD POSITION — SAFE TO TUNE — sits on kitchen-main-counter, left of the cooktop, per reference
    KITCHEN_ASSET_NATURAL_SIZE.propHolder,
    KITCHEN_ASSET_CONTENT_BBOX.propHolder,
    KITCHEN_SCALE.propHolder,
    KITCHEN_TARGET_WIDTH.propHolder,
  ),
  kitchenObject(
    'kitchen-counter-prop-salt',
    'kitchen.propSalt',
    'SALT SHAKER',
    { x: 1580, y: 210 }, // WORLD POSITION — SAFE TO TUNE — grouped with the utensil holder
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
    { x: 1620, y: 611 }, // WORLD POSITION — SAFE TO TUNE — grouped on the side counter
    KITCHEN_ASSET_NATURAL_SIZE.propPlate,
    KITCHEN_ASSET_CONTENT_BBOX.propPlate,
    KITCHEN_SCALE.propPlate,
    KITCHEN_TARGET_WIDTH.propPlate,
  ),
  {
    id: 'kitchen-cafe-menu',
    asset: 'frames.cafeMenu',
    label: 'CAFE MENU',
    position: { x: 1340, y: 180 }, // WORLD POSITION — SAFE TO TUNE — same open wall gap as projects-code-poster (projectsRoom.ts), right of it, clear of the fridge (x≥1395)
    layer: 'object',
    transform: { width: 100 },
    // No `collision` — wall-mounted decor, visual placement pass only.
  },
  {
    id: 'kitchen-hanging-plant',
    asset: 'special.hangingPlant',
    label: 'HANGING PLANT',
    position: { x: 1650, y: 85 }, // WORLD POSITION — SAFE TO TUNE — high on the back wall, above the wall-shelf/hanging-pans cluster
    layer: 'object',
    transform: { width: 55 },
    // No `collision` — wall/ceiling-mounted decor, visual placement pass only.
  },
  // Dining set — four separate chairs first, then the table LAST so it draws
  // on top of all of them (World.ts draws array order, not a Y-sort).
  kitchenObject(
    'kitchen-dining-chair-back',
    'kitchen.diningChairBack',
    'DINING CHAIR',
    { x: 1670, y: 689 }, // WORLD POSITION — SAFE TO TUNE — behind the table
    KITCHEN_ASSET_NATURAL_SIZE.diningChairBack,
    KITCHEN_ASSET_CONTENT_BBOX.diningChairBack,
    KITCHEN_SCALE.diningChairBack,
    KITCHEN_TARGET_WIDTH.diningChairBack,
    0,
    true, // solid — collider matches the visible footprint
  ),
  kitchenObject(
    'kitchen-dining-chair-left',
    'kitchen.diningChairLeft',
    'DINING CHAIR',
    { x: 1580, y: 630 }, // WORLD POSITION — SAFE TO TUNE — left of the table
    KITCHEN_ASSET_NATURAL_SIZE.diningChairLeft,
    KITCHEN_ASSET_CONTENT_BBOX.diningChairLeft,
    KITCHEN_SCALE.diningChairLeft,
    KITCHEN_TARGET_WIDTH.diningChairLeft,
    0,
    true, // solid — collider matches the visible footprint
  ),
  kitchenObject(
    'kitchen-dining-chair-right',
    'kitchen.diningChairRight',
    'DINING CHAIR',
    { x: 1745, y: 630 }, // WORLD POSITION — SAFE TO TUNE — right of the table
    KITCHEN_ASSET_NATURAL_SIZE.diningChairRight,
    KITCHEN_ASSET_CONTENT_BBOX.diningChairRight,
    KITCHEN_SCALE.diningChairRight,
    KITCHEN_TARGET_WIDTH.diningChairRight,
    0,
    true, // solid — collider matches the visible footprint
  ),
  kitchenObject(
    'kitchen-dining-chair-front',
    'kitchen.diningChairFront',
    'DINING CHAIR',
    { x: 1665, y: 570 }, // WORLD POSITION — SAFE TO TUNE — in front of the table
    KITCHEN_ASSET_NATURAL_SIZE.diningChairFront,
    KITCHEN_ASSET_CONTENT_BBOX.diningChairFront,
    KITCHEN_SCALE.diningChairFront,
    KITCHEN_TARGET_WIDTH.diningChairFront,
    0,
    true, // solid — collider matches the visible footprint
  ),
  {
    ...kitchenObject(
      'kitchen-dining-table',
      'kitchen.diningTable',
      'DINING TABLE',
      { x: 1670, y: 680 }, // WORLD POSITION — SAFE TO TUNE — drawn after all four chairs, so it sits on top of them
      KITCHEN_ASSET_NATURAL_SIZE.diningTable,
      KITCHEN_ASSET_CONTENT_BBOX.diningTable,
      KITCHEN_SCALE.diningTable,
      KITCHEN_TARGET_WIDTH.diningTable,
      0,
      true, // solid — collider matches the visible footprint
    ),
    // The dining set is solid; reachable from any side of the chairs.
    interactionPoint: { x: 1670, y: 580 },
    interaction: {
      radius: 150,
      action: 'WORLD_RESPONSE',
      response: [
        'BREAK DETECTED.',
        'DEVELOPER SHOULD PROBABLY',
        'GET BACK TO WORK.',
      ],
    },
    message: { type: 'interactive', text: 'Take a break?' },
  },
  // Accessories — listed last so they draw on top of the tables/counter
  // they sit on (World.ts draws array order, not a Y-sort).
  kitchenAccessory(
    'kitchen-acc-dining-table',
    'accDiningTable',
    'DINING TABLE',
    { x: 1468, y: 515 },
    true,
  ), // WORLD POSITION — SAFE TO TUNE — second table, open floor below the fridge
  // On the main counter.
  kitchenAccessory('kitchen-acc-fruits', 'accFruits', 'FRUIT BOWL', {
    x: 1532,
    y: 230,
  }), // WORLD POSITION — SAFE TO TUNE — counter's left end
  kitchenAccessory('kitchen-acc-jar', 'accJar', 'JAM JAR', { x: 1600, y: 226 }), // WORLD POSITION — SAFE TO TUNE — between the utensil holder and the cooktop
  // On the existing dining table.
  kitchenAccessory('kitchen-acc-water', 'accWater', 'WATER GLASS', {
    x: 1632,
    y: 575,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-ramen', 'accRamen', 'RAMEN', {
    x: 1705,
    y: 590,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-meal', 'accMeal', 'BREAKFAST PLATE', {
    x: 1662,
    y: 614,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-pepper', 'accPepper', 'SALT & PEPPER', {
    x: 1706,
    y: 618,
  }), // WORLD POSITION — SAFE TO TUNE
  // On the new second table.
  kitchenAccessory('kitchen-acc-bottle', 'accBottle', 'WATER BOTTLE', {
    x: 872,
    y: 80,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-mug', 'accMug', 'COFFEE MUG', {
    x: 1450,
    y: 470,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-mobile', 'accMobile', 'PHONE', {
    x: 1488,
    y: 472,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-dal', 'accDal', 'DAL BOWL', {
    x: 1450,
    y: 445,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-plates', 'accPlates', 'PLATE STACK', {
    x: 1505,
    y: 445,
  }), // WORLD POSITION — SAFE TO TUNE
  kitchenAccessory('kitchen-acc-snacks', 'accSnacks', 'SNACK BOWL', {
    x: 1117,
    y: 285,
  }), // WORLD POSITION — SAFE TO TUNE — between the dal and the plate stack
]
