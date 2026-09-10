import { describe, expect, it } from 'vitest'
import {
  CollisionBody,
  PLAYER_COLLIDER_HEIGHT,
  PLAYER_COLLIDER_WIDTH,
} from './CollisionBody'

describe('CollisionBody', () => {
  it('is smaller than a full-sprite-sized box — a feet collider, not the whole sprite', () => {
    const FULL_SPRITE_SIZE = 28 // Player's visual body diameter (BODY_RADIUS * 2)

    expect(PLAYER_COLLIDER_WIDTH).toBeLessThan(FULL_SPRITE_SIZE)
    expect(PLAYER_COLLIDER_HEIGHT).toBeLessThan(FULL_SPRITE_SIZE)
  })

  it('positions the collider below the origin — the lower body/feet area', () => {
    const body = new CollisionBody()

    const rect = body.getRect(100, 100)

    expect(rect.y).toBeGreaterThan(100)
    expect(rect.x).toBe(100 - PLAYER_COLLIDER_WIDTH / 2)
    expect(rect.width).toBe(PLAYER_COLLIDER_WIDTH)
    expect(rect.height).toBe(PLAYER_COLLIDER_HEIGHT)
  })

  it('toOrigin is the exact inverse of getRect', () => {
    const body = new CollisionBody()

    const rect = body.getRect(357, 842)
    const origin = body.toOrigin(rect.x, rect.y)

    expect(origin.x).toBeCloseTo(357)
    expect(origin.y).toBeCloseTo(842)
  })
})
