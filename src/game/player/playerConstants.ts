/** Walking speed, canonical world units per second. Independent of `WALK_ANIMATION_FPS`. */
export const PLAYER_SPEED_PER_SECOND = 220

/** Walk-cycle playback rate. Independent of movement speed — the 4-frame cycle loops at this rate however fast the player moves. */
export const WALK_ANIMATION_FPS = 8

/**
 * Where the player starts, in world space — the point CollisionBody's feet
 * box is measured from (the player's origin), not the sprite's feet.
 *
 * The main entrance / About Me nook: on the open floor in front of the left
 * armchair, just left of the side table holding the ID card (`aboutMe`,
 * 1670×1040) — offset sideways so the 160-unit-tall sprite doesn't hide
 * the table. 117 units from the card, inside its 130-unit interaction
 * radius, so the first prompt a visitor sees is "Wanna see his ID card?". Verified clear of every wall/furniture
 * collider with a margin (see the spawn tests in worldObjects.test.ts,
 * roomBoundary.test.ts and playerWorldMovement.test.ts). If the entrance
 * furniture is ever moved, retune it here.
 */
export const PLAYER_SPAWN_POSITION: { readonly x: number; readonly y: number } =
  { x: 1610, y: 1070 }

/**
 * Rendered height of the character in world px, measured head-to-feet on
 * the visible art (the sheets' frames carry transparent padding, so this is
 * not the canvas height). The one number to change to resize the player.
 */
export const PLAYER_SPRITE_HEIGHT = 160
