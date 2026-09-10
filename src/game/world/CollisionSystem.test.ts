import { describe, expect, it } from 'vitest'
import type { WorldObject } from './WorldObject'
import { CollisionSystem, rectsOverlap, type Rect } from './CollisionSystem'

const WORLD_WIDTH = 400
const WORLD_HEIGHT = 300
const PLAYER: Rect = { x: 100, y: 100, width: 20, height: 10 }

describe('rectsOverlap', () => {
  it('is true for overlapping rects', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 },
      ),
    ).toBe(true)
  })

  it('is false for rects that only touch edges (no interpenetration)', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false)
  })

  it('is false for disjoint rects', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 100, y: 100, width: 10, height: 10 },
      ),
    ).toBe(false)
  })
})

describe('CollisionSystem — open space and world boundary', () => {
  it('applies movement freely with no obstacles', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT)

    const result = system.resolveMovement(PLAYER, 10, -5)

    expect(result).toEqual({ x: 110, y: 95 })
  })

  it('clamps movement at the right/bottom world edge', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT)
    const nearEdge: Rect = {
      x: WORLD_WIDTH - 25,
      y: WORLD_HEIGHT - 15,
      width: 20,
      height: 10,
    }

    const result = system.resolveMovement(nearEdge, 50, 50)

    expect(result.x).toBe(WORLD_WIDTH - 20)
    expect(result.y).toBe(WORLD_HEIGHT - 10)
  })

  it('clamps movement at the left/top world edge (negative coordinates)', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT)
    const nearOrigin: Rect = { x: 5, y: 5, width: 20, height: 10 }

    const result = system.resolveMovement(nearOrigin, -50, -50)

    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('never places the collider outside bounds even from a candidate already past the edge', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT)

    const result = system.resolveMovement(PLAYER, 10_000, 10_000)

    expect(result.x).toBeLessThanOrEqual(WORLD_WIDTH - PLAYER.width)
    expect(result.y).toBeLessThanOrEqual(WORLD_HEIGHT - PLAYER.height)
  })
})

describe('CollisionSystem — obstacle collision', () => {
  const wall: Rect = { x: 150, y: 90, width: 20, height: 30 }

  it('blocks movement into an obstacle on the X axis', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT, [wall])

    // Moving right, would land at x=140..160, overlapping the wall at x=150.
    const result = system.resolveMovement(PLAYER, 40, 0)

    expect(result.x).toBe(wall.x - PLAYER.width) // flush against the wall's left edge
  })

  it('does not block movement away from the obstacle it is currently touching', () => {
    const touching: Rect = {
      x: wall.x - PLAYER.width,
      y: 100,
      width: 20,
      height: 10,
    }
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT, [wall])

    const result = system.resolveMovement(touching, -10, 0)

    expect(result.x).toBe(touching.x - 10)
  })

  it('does not block movement that stays clear of the obstacle', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT, [wall])

    const result = system.resolveMovement(PLAYER, -10, 0)

    expect(result.x).toBe(PLAYER.x - 10)
  })

  it('resolves X and Y independently, allowing the mover to slide along the obstacle', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT, [wall])
    // Approaching the wall diagonally: X would hit the wall, Y should still succeed.
    const approaching: Rect = { x: 120, y: 100, width: 20, height: 10 }

    const result = system.resolveMovement(approaching, 40, 20)

    expect(result.x).toBe(wall.x - approaching.width) // X blocked, flush
    expect(result.y).toBe(approaching.y + 20) // Y unaffected — this is the slide
  })

  it('does not get stuck at a corner — once pinned on X, Y keeps advancing frame to frame', () => {
    const system = new CollisionSystem(WORLD_WIDTH, WORLD_HEIGHT, [wall])
    let mover: Rect = { x: 130, y: 110, width: 20, height: 10 }

    // This mover is already touching the wall on X; each step below should
    // stay pinned on X while Y keeps making progress — not freeze entirely.
    const step = () => {
      const resolved = system.resolveMovement(mover, 5, 5)
      mover = { ...mover, x: resolved.x, y: resolved.y }
    }

    step()
    expect(mover).toEqual({
      x: wall.x - mover.width,
      y: 115,
      width: 20,
      height: 10,
    })

    step()
    expect(mover).toEqual({
      x: wall.x - mover.width,
      y: 120,
      width: 20,
      height: 10,
    })
  })
})

describe('CollisionSystem.fromWorldObjects', () => {
  const objects: WorldObject[] = [
    {
      id: 'blocking',
      asset: 'content.a',
      label: 'A',
      position: { x: 50, y: 50 },
      layer: 'object',
      collision: { x: 20, y: 20, width: 60, height: 60 },
    },
    {
      id: 'not-blocking',
      asset: 'content.b',
      label: 'B',
      position: { x: 200, y: 200 },
      layer: 'object',
      // no `collision` field — must not participate in collision.
    },
  ]

  it('only includes objects with a configured collider', () => {
    const system = CollisionSystem.fromWorldObjects(
      objects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    )

    // Passing straight through where "not-blocking" sits must be unobstructed.
    const throughNonBlocking = system.resolveMovement(
      { x: 190, y: 195, width: 10, height: 10 },
      20,
      0,
    )
    expect(throughNonBlocking.x).toBe(210)

    // The configured blocking object still stops movement.
    const intoBlocking = system.resolveMovement(
      { x: 0, y: 45, width: 10, height: 10 },
      30,
      0,
    )
    expect(intoBlocking.x).toBe(objects[0].collision!.x - 10)
  })
})
