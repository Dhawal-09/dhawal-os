import { WORLD_HEIGHT, WORLD_WIDTH } from '../world/worldConstants'

/** Walking speed, canonical world units per second. Independent of `WALK_ANIMATION_FPS`. */
export const PLAYER_SPEED_PER_SECOND = 220

/** Walk-cycle playback rate. Independent of movement speed — the 4-frame cycle loops at this rate however fast the player moves. */
export const WALK_ANIMATION_FPS = 8

/**
 * Where the player starts, in world space — the point CollisionBody's feet
 * box is measured from (the player's origin), not the sprite's feet.
 *
 * The world center: verified walkable open wood floor between the living
 * room and the kitchen — clear of every wall/furniture collider with plenty
 * of room to move (see the spawn tests in worldObjects.test.ts /
 * roomBoundary.test.ts, which check it against the real, current collider
 * set). If furniture is ever moved onto this spot, retune it here.
 */
export const PLAYER_SPAWN_POSITION = {
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
} as const

/**
 * Rendered height of the character in world px, measured head-to-feet on
 * the visible art (the sheets' frames carry transparent padding, so this is
 * not the canvas height). The one number to change to resize the player.
 */
export const PLAYER_SPRITE_HEIGHT = 160
