import type { Rect } from '../world/CollisionSystem'

/**
 * The player's physical collider: a small box around the feet, not the full
 * sprite (COLLISION_SPEC.md "Rule"). Independently sized/offset from the
 * visual body in Player.ts — changing one never implicitly changes the other.
 */
export const PLAYER_COLLIDER_WIDTH = 20
export const PLAYER_COLLIDER_HEIGHT = 12
/** Vertical offset from the player's origin (visual center) down to the top of the feet box. */
const COLLIDER_OFFSET_Y = 6
/** Vertical offset from the player's origin down to the bottom of the feet box — where the character's feet visually stand. */
export const PLAYER_FEET_OFFSET_Y = COLLIDER_OFFSET_Y + PLAYER_COLLIDER_HEIGHT

export class CollisionBody {
  /** World-space collider rect for a player currently at (originX, originY). */
  getRect(originX: number, originY: number): Rect {
    return {
      x: originX - PLAYER_COLLIDER_WIDTH / 2,
      y: originY + COLLIDER_OFFSET_Y,
      width: PLAYER_COLLIDER_WIDTH,
      height: PLAYER_COLLIDER_HEIGHT,
    }
  }

  /** Inverse of getRect's offset — converts a resolved collider top-left back to the player's origin. */
  toOrigin(rectX: number, rectY: number): { x: number; y: number } {
    return {
      x: rectX + PLAYER_COLLIDER_WIDTH / 2,
      y: rectY - COLLIDER_OFFSET_Y,
    }
  }
}
