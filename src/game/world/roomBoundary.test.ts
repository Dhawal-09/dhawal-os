import { describe, expect, it } from 'vitest'
import { CollisionBody } from '../player/CollisionBody'
import { CollisionSystem, rectsOverlap, type Rect } from './CollisionSystem'
import { ROOM_BOUNDARY_COLLIDERS, worldObjects } from './worldObjects'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

/**
 * PHASE 10B.1 regression coverage: the player must never cross the visible
 * perimeter walls of Floor.png. Before this phase, CollisionSystem only
 * clamped movement to the full 1920×1440 canvas — nothing stopped the
 * player at the *visible* (inset) wall edge, so the player could walk
 * straight through the wall graphics. `ROOM_BOUNDARY_COLLIDERS` (see
 * worldObjects.ts) fixes this as pure collision data, no change to
 * CollisionSystem's resolution algorithm.
 */

const collisionBody = new CollisionBody()

/**
 * Walks a player-sized rect one small step at a time in a single direction
 * (mirroring real per-frame movement — PlayerController.ts moves only a few
 * world units per tick) until CollisionSystem stops it, or `maxSteps` is
 * reached. A single huge one-shot delta can jump clean over a collider in
 * one discrete step (CollisionSystem only tests the destination rect, not
 * the swept path) — small steps avoid that tunneling artifact.
 */
function walkUntilBlocked(
  collisionSystem: CollisionSystem,
  start: { x: number; y: number },
  direction: { dx: number; dy: number },
  stepSize: number,
  maxSteps: number,
): { x: number; y: number } {
  let rect = collisionBody.getRect(start.x, start.y)
  for (let i = 0; i < maxSteps; i++) {
    const resolved = collisionSystem.resolveMovement(
      rect,
      direction.dx * stepSize,
      direction.dy * stepSize,
    )
    if (resolved.x === rect.x && resolved.y === rect.y) break // fully blocked, no further progress
    rect = { ...rect, ...resolved }
  }
  return collisionBody.toOrigin(rect.x, rect.y)
}

describe('room boundary geometry (PHASE 10B.1)', () => {
  it('is exactly 4 rects, one per wall, each with a positive area', () => {
    expect(ROOM_BOUNDARY_COLLIDERS).toHaveLength(4)
    for (const wall of ROOM_BOUNDARY_COLLIDERS) {
      expect(wall.width).toBeGreaterThan(0)
      expect(wall.height).toBeGreaterThan(0)
    }
  })

  it('every wall rect stays within the canonical world bounds', () => {
    for (const wall of ROOM_BOUNDARY_COLLIDERS) {
      expect(wall.x).toBeGreaterThanOrEqual(0)
      expect(wall.y).toBeGreaterThanOrEqual(0)
      expect(wall.x + wall.width).toBeLessThanOrEqual(WORLD_WIDTH)
      expect(wall.y + wall.height).toBeLessThanOrEqual(WORLD_HEIGHT)
    }
  })

  it("the world center (the player's spawn point) is not inside any wall band", () => {
    const spawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
    const spawnRect = collisionBody.getRect(spawn.x, spawn.y)
    for (const wall of ROOM_BOUNDARY_COLLIDERS) {
      expect(rectsOverlap(spawnRect, wall)).toBe(false)
    }
  })
})

describe('boundary-only collision (isolated from furniture, precise wall-edge behavior)', () => {
  // A CollisionSystem with *only* the room walls as obstacles, so these
  // tests isolate wall behavior from any furniture that happens to sit
  // near a given column/row.
  const boundaryOnly = new CollisionSystem(
    WORLD_WIDTH,
    WORLD_HEIGHT,
    ROOM_BOUNDARY_COLLIDERS,
  )

  const TOP_WALL_INNER_Y = 310
  const BOTTOM_WALL_INNER_Y = 1200
  const LEFT_WALL_INNER_X = 250
  const RIGHT_WALL_INNER_X = 1650

  it('moving straight up stops at the top wall — never crosses it', () => {
    const result = walkUntilBlocked(
      boundaryOnly,
      { x: 960, y: 700 },
      { dx: 0, dy: -1 },
      10,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.y).toBeGreaterThanOrEqual(TOP_WALL_INNER_Y)
    // And it actually reached the wall (didn't just stop short somewhere in open floor).
    expect(rect.y).toBeLessThan(TOP_WALL_INNER_Y + 15)
  })

  it('moving straight down stops at the bottom wall — never crosses it', () => {
    const result = walkUntilBlocked(
      boundaryOnly,
      { x: 650, y: 900 },
      { dx: 0, dy: 1 },
      10,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.y + rect.height).toBeLessThanOrEqual(BOTTOM_WALL_INNER_Y)
    expect(rect.y + rect.height).toBeGreaterThan(BOTTOM_WALL_INNER_Y - 15)
  })

  it('moving straight left stops at the left wall — never crosses it', () => {
    const result = walkUntilBlocked(
      boundaryOnly,
      { x: 900, y: 700 },
      { dx: -1, dy: 0 },
      10,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.x).toBeGreaterThanOrEqual(LEFT_WALL_INNER_X)
    expect(rect.x).toBeLessThan(LEFT_WALL_INNER_X + 15)
  })

  it('moving straight right stops at the right wall — never crosses it', () => {
    const result = walkUntilBlocked(
      boundaryOnly,
      { x: 1000, y: 700 },
      { dx: 1, dy: 0 },
      10,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.x + rect.width).toBeLessThanOrEqual(RIGHT_WALL_INNER_X)
    expect(rect.x + rect.width).toBeGreaterThan(RIGHT_WALL_INNER_X - 15)
  })

  it.each([
    ['top-left', { dx: -1, dy: -1 }, { x: 900, y: 700 }],
    ['top-right', { dx: 1, dy: -1 }, { x: 1000, y: 700 }],
    ['bottom-left', { dx: -1, dy: 1 }, { x: 900, y: 700 }],
    ['bottom-right', { dx: 1, dy: 1 }, { x: 1000, y: 700 }],
  ])(
    'moving diagonally into the %s corner never escapes world bounds',
    (_name, direction, start) => {
      const result = walkUntilBlocked(boundaryOnly, start, direction, 10, 400)
      const rect = collisionBody.getRect(result.x, result.y)

      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(WORLD_WIDTH)
      expect(rect.y + rect.height).toBeLessThanOrEqual(WORLD_HEIGHT)

      // And specifically respects the *inset* wall line, not just the outer canvas.
      if (direction.dx < 0)
        expect(rect.x).toBeGreaterThanOrEqual(LEFT_WALL_INNER_X)
      if (direction.dx > 0)
        expect(rect.x + rect.width).toBeLessThanOrEqual(RIGHT_WALL_INNER_X)
      if (direction.dy < 0)
        expect(rect.y).toBeGreaterThanOrEqual(TOP_WALL_INNER_Y)
      if (direction.dy > 0)
        expect(rect.y + rect.height).toBeLessThanOrEqual(BOTTOM_WALL_INNER_Y)
    },
  )

  it("the door is decorative/non-traversable (PHASE 09.1 design) — the bottom wall has no opening at the door's location", () => {
    // The `door` WorldObject sits at x=960 (worldObjects.ts). Walking
    // straight down through that exact column must still stop at the
    // bottom wall line, proving no gap was carved there.
    const result = walkUntilBlocked(
      boundaryOnly,
      { x: 960, y: 900 },
      { dx: 0, dy: 1 },
      10,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.y + rect.height).toBeLessThanOrEqual(BOTTOM_WALL_INNER_Y)
    expect(rect.y + rect.height).toBeGreaterThan(BOTTOM_WALL_INNER_Y - 15)
  })
})

describe('combined system (real worldObjects + ROOM_BOUNDARY_COLLIDERS, as GameScene actually builds it)', () => {
  const combined = CollisionSystem.fromWorldObjects(
    worldObjects,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    ROOM_BOUNDARY_COLLIDERS,
  )

  it("the player's feet collider (CollisionBody, not the full sprite) is what's used for these boundary checks", () => {
    // Sanity-checks the fixture this whole file relies on: a small
    // feet-only box, independently sized from the visual body (Player.ts).
    const rect = collisionBody.getRect(960, 720)
    expect(rect.width).toBeLessThan(50)
    expect(rect.height).toBeLessThan(50)
  })

  it('spawn point is collision-free against the combined obstacle set (furniture + walls)', () => {
    const spawnRect = collisionBody.getRect(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
    const allObstacles: Rect[] = [...ROOM_BOUNDARY_COLLIDERS]
    for (const object of worldObjects) {
      if (object.collision) allObstacles.push(object.collision)
    }
    for (const obstacle of allObstacles) {
      expect(rectsOverlap(spawnRect, obstacle)).toBe(false)
    }
  })

  it('existing furniture collision still works alongside the new wall boundary (bed)', () => {
    const bed = worldObjects.find((o) => o.id === 'bed')!
    const result = walkUntilBlocked(
      combined,
      {
        x: bed.collision!.x + bed.collision!.width / 2,
        y: bed.collision!.y - 60,
      },
      { dx: 0, dy: 1 },
      5,
      200,
    )
    const rect = collisionBody.getRect(result.x, result.y)
    expect(rect.y + rect.height).toBeLessThanOrEqual(bed.collision!.y)
  })

  it('the player cannot escape the room in any direction even with a very large requested movement', () => {
    const hugeDelta = 5000
    const fromCenter = { x: 960, y: 720 }
    const rectStart = collisionBody.getRect(fromCenter.x, fromCenter.y)

    const up = combined.resolveMovement(rectStart, 0, -hugeDelta)
    const down = combined.resolveMovement(rectStart, 0, hugeDelta)
    const left = combined.resolveMovement(rectStart, -hugeDelta, 0)
    const right = combined.resolveMovement(rectStart, hugeDelta, 0)

    expect(up.y).toBeGreaterThanOrEqual(0)
    expect(down.y).toBeLessThanOrEqual(WORLD_HEIGHT)
    expect(left.x).toBeGreaterThanOrEqual(0)
    expect(right.x).toBeLessThanOrEqual(WORLD_WIDTH)
  })
})
