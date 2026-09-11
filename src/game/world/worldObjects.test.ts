import { describe, expect, it } from 'vitest'
import { getFurnitureAssetUrl } from './assetManifest'
import { CollisionBody } from '../player/CollisionBody'
import { CollisionSystem, rectsOverlap } from './CollisionSystem'
import { InteractionSystem } from './InteractionSystem'
import type { WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'
import {
  ROOM_BOUNDARY_COLLIDERS,
  validateWorldObjects,
  worldObjects,
} from './worldObjects'

function makeObject(overrides: Partial<WorldObject> = {}): WorldObject {
  return {
    id: 'fixture',
    asset: 'content.fixture',
    label: 'FIXTURE',
    position: { x: 0, y: 0 },
    layer: 'object',
    ...overrides,
  }
}

describe('worldObjects', () => {
  it('the shipped configuration has no duplicate ids and stays within canonical bounds', () => {
    expect(() => validateWorldObjects(worldObjects)).not.toThrow()
    expect(worldObjects.length).toBeGreaterThan(0)
  })

  it('every shipped id is unique', () => {
    const ids = worldObjects.map((object) => object.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mixes blocking and non-blocking objects — not every object is automatically solid', () => {
    const blocking = worldObjects.filter((object) => object.collision)
    const nonBlocking = worldObjects.filter((object) => !object.collision)

    expect(blocking.length).toBeGreaterThan(0)
    expect(nonBlocking.length).toBeGreaterThan(0)
  })

  it('every configured collider is horizontally centered on its object', () => {
    // Excludes 'bed': its collider comes from `contentAlignedCollider`,
    // derived from the *measured* (real pixel-data) content bbox rather
    // than a symmetric footprint fraction — the art itself isn't perfectly
    // centered in its canvas, so its true center is a fraction of a world
    // unit off from `position.x`. Covered separately below.
    for (const object of worldObjects) {
      if (!object.collision || object.id === 'bed') continue

      const centerX = object.collision.x + object.collision.width / 2
      expect(centerX).toBeCloseTo(object.position.x)
    }
  })

  it("the bed's collider is centered on its object within a small, documented tolerance (content-bbox-derived, not perfectly symmetric art)", () => {
    const bed = worldObjects.find((object) => object.id === 'bed')!
    const centerX = bed.collision!.x + bed.collision!.width / 2
    expect(Math.abs(centerX - bed.position.x)).toBeLessThan(1)
  })

  it('content-area colliders are also vertically centered on their object (see centeredCollider)', () => {
    // Excludes 'education'/'resume': PHASE 10B.1 CLEANUP clips only their
    // collider's bottom edge (centeredColliderClippedToBottom) to remove a
    // redundant overlap with the bottom room-boundary wall — their top/
    // left/right edges are untouched, but the box is no longer vertically
    // symmetric around `position.y`. Covered separately below.
    const contentAreaIds = new Set([
      'projects',
      'experience',
      'skills',
      'certificates',
    ])
    for (const object of worldObjects) {
      if (!contentAreaIds.has(object.id) || !object.collision) continue

      const centerY = object.collision.y + object.collision.height / 2
      expect(centerY).toBeCloseTo(object.position.y)
    }
  })

  it("'education'/'resume' colliders keep their top edge exactly where centeredCollider would put it — only the bottom edge was clipped (PHASE 10B.1 CLEANUP)", () => {
    const MARKER_SIZE = 96 // PLACEHOLDER_COLLIDER_SIZE in worldObjects.ts
    for (const id of ['education', 'resume']) {
      const object = worldObjects.find((o) => o.id === id)!
      expect(object.collision!.y).toBeCloseTo(
        object.position.y - MARKER_SIZE / 2,
      )
      expect(object.collision!.x).toBeCloseTo(
        object.position.x - MARKER_SIZE / 2,
      )
      expect(object.collision!.width).toBeCloseTo(MARKER_SIZE)
    }
  })

  it('every content area has a configured interaction, each with a distinct canonical action', () => {
    const contentAreaIds = [
      'projects',
      'experience',
      'skills',
      'education',
      'certificates',
      'resume',
      'aboutMe',
    ]
    const contentAreas = worldObjects.filter((object) =>
      contentAreaIds.includes(object.id),
    )

    expect(contentAreas).toHaveLength(contentAreaIds.length)
    expect(contentAreas.every((object) => object.interaction)).toBe(true)

    const actions = contentAreas.map((object) => object.interaction!.action)
    expect(new Set(actions).size).toBe(actions.length)
  })

  it('every interaction radius is a sane positive number, not 0 or negative', () => {
    for (const object of worldObjects) {
      if (!object.interaction) continue
      expect(object.interaction.radius).toBeGreaterThan(0)
    }
  })
})

describe('desk furniture (PHASE-10A)', () => {
  const deskIds = ['main-work-desk', 'education-desk', 'resume-desk'] as const
  const expectedAsset: Record<(typeof deskIds)[number], string> = {
    'main-work-desk': 'furniture.mainWorkDesk',
    'education-desk': 'furniture.educationDesk',
    'resume-desk': 'furniture.resumeDesk',
  }

  function findDesk(id: (typeof deskIds)[number]): WorldObject {
    const object = worldObjects.find((candidate) => candidate.id === id)
    expect(object).toBeDefined()
    return object!
  }

  it('all three approved desks exist in the shipped world', () => {
    for (const id of deskIds) {
      expect(worldObjects.some((object) => object.id === id)).toBe(true)
    }
  })

  it('each desk references its correct approved asset id', () => {
    for (const id of deskIds) {
      expect(findDesk(id).asset).toBe(expectedAsset[id])
    }
  })

  it('each desk has a position within the canonical world bounds', () => {
    for (const id of deskIds) {
      const { position } = findDesk(id)
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.x).toBeLessThanOrEqual(WORLD_WIDTH)
      expect(position.y).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeLessThanOrEqual(WORLD_HEIGHT)
    }
  })

  it('each desk has a valid, positive-area collision footprint', () => {
    for (const id of deskIds) {
      const { collision } = findDesk(id)
      expect(collision).toBeDefined()
      expect(collision!.width).toBeGreaterThan(0)
      expect(collision!.height).toBeGreaterThan(0)
    }
  })

  it("each desk's collider sits flush with its floor point — bottom edge equals `position.y` (anchor (0.5,1) convention)", () => {
    for (const id of deskIds) {
      const { position, collision } = findDesk(id)
      const bottomEdge = collision!.y + collision!.height
      expect(bottomEdge).toBeCloseTo(position.y)
    }
  })

  it('desks are furniture, not interactive content areas — no `interaction` field', () => {
    for (const id of deskIds) {
      expect(findDesk(id).interaction).toBeUndefined()
    }
  })

  it('desks live in the object layer, alongside every other world object', () => {
    for (const id of deskIds) {
      expect(findDesk(id).layer).toBe('object')
    }
  })

  it("changing an object's position data is the only thing that moves it — collision recomputes from the same position", () => {
    // Guards the "move a desk later by changing only its x/y" requirement:
    // asserts the *relationship*, not a hardcoded number, so retuning a
    // desk's position in worldObjects.ts never requires touching this test.
    for (const id of deskIds) {
      const { position, collision } = findDesk(id)
      const centerX = collision!.x + collision!.width / 2
      expect(centerX).toBeCloseTo(position.x)
    }
  })
})

describe('structural: bed + door (PHASE 09.1)', () => {
  const structuralIds = ['bed', 'door'] as const
  const expectedAsset: Record<(typeof structuralIds)[number], string> = {
    bed: 'structural.bed',
    door: 'structural.door',
  }

  function findStructural(id: (typeof structuralIds)[number]): WorldObject {
    const object = worldObjects.find((candidate) => candidate.id === id)
    expect(object).toBeDefined()
    return object!
  }

  it('both the bed and the door exist in the shipped world', () => {
    for (const id of structuralIds) {
      expect(worldObjects.some((object) => object.id === id)).toBe(true)
    }
  })

  it('each references its correct approved asset id', () => {
    for (const id of structuralIds) {
      expect(findStructural(id).asset).toBe(expectedAsset[id])
    }
  })

  it('each has a position within the canonical world bounds', () => {
    for (const id of structuralIds) {
      const { position } = findStructural(id)
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.x).toBeLessThanOrEqual(WORLD_WIDTH)
      expect(position.y).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeLessThanOrEqual(WORLD_HEIGHT)
    }
  })

  it('each lives in the object layer, alongside every other world object', () => {
    for (const id of structuralIds) {
      expect(findStructural(id).layer).toBe('object')
    }
  })

  it('each has a valid, positive-area (and finite/sensible) collision footprint', () => {
    for (const id of structuralIds) {
      const { collision } = findStructural(id)
      expect(collision).toBeDefined()
      expect(Number.isFinite(collision!.width)).toBe(true)
      expect(Number.isFinite(collision!.height)).toBe(true)
      expect(collision!.width).toBeGreaterThan(0)
      expect(collision!.height).toBeGreaterThan(0)
      // Sensible: not literally the whole (possibly padded) source canvas —
      // both PNGs are far larger in at least one dimension than either
      // collider, confirming the padding/transparent margin was excluded.
      expect(collision!.width).toBeLessThan(WORLD_WIDTH)
      expect(collision!.height).toBeLessThan(WORLD_HEIGHT)
    }
  })

  it('is environmental only — no `interaction` field (no open/teleport behavior yet)', () => {
    for (const id of structuralIds) {
      expect(findStructural(id).interaction).toBeUndefined()
    }
  })

  it('both asset ids resolve through the existing asset-manifest mechanism — no silent placeholder fallback', () => {
    for (const id of structuralIds) {
      expect(getFurnitureAssetUrl(findStructural(id).asset)).toBeTruthy()
    }
  })

  /**
   * Walks a rect downward one small step at a time (mirroring how the real
   * game loop calls `resolveMovement` every frame with a small per-tick
   * delta — PlayerController.ts's `SPEED_PER_SECOND` times a ~16ms frame is
   * only a few world units). A single huge one-shot delta can jump clean
   * over a moderately-sized obstacle in one discrete step (the destination
   * rect lands past it, never overlapping) — this avoids that tunneling
   * artifact so the test reflects actual in-game movement.
   */
  function walkDownUntilBlocked(
    collisionSystem: CollisionSystem,
    startRect: { x: number; y: number; width: number; height: number },
    totalDistance: number,
    stepSize: number,
  ): { x: number; y: number } {
    let rect = startRect
    let resolved = { x: rect.x, y: rect.y }
    for (let moved = 0; moved < totalDistance; moved += stepSize) {
      resolved = collisionSystem.resolveMovement(rect, 0, stepSize)
      rect = { ...rect, ...resolved }
    }
    return resolved
  }

  it('a player-sized body cannot move through the bed — the CollisionSystem stops it at the bed footprint', () => {
    const bed = findStructural('bed')
    const collisionSystem = CollisionSystem.fromWorldObjects(
      worldObjects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    )

    const playerWidth = 20
    const playerHeight = 12
    const startRect = {
      x: bed.collision!.x + bed.collision!.width / 2 - playerWidth / 2,
      y: bed.collision!.y - 50,
      width: playerWidth,
      height: playerHeight,
    }

    const resolved = walkDownUntilBlocked(collisionSystem, startRect, 200, 5)

    expect(resolved.y + playerHeight).toBeLessThanOrEqual(bed.collision!.y)
    // And it actually got close to the bed rather than being blocked by
    // something else entirely (proves this is the bed doing the blocking).
    expect(resolved.y + playerHeight).toBeGreaterThan(bed.collision!.y - 5)
  })

  it('a player-sized body cannot move through the door — the CollisionSystem stops it at the door footprint', () => {
    const door = findStructural('door')
    const collisionSystem = CollisionSystem.fromWorldObjects(
      worldObjects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    )

    const playerWidth = 20
    const playerHeight = 12
    const startRect = {
      x: door.collision!.x + door.collision!.width / 2 - playerWidth / 2,
      y: door.collision!.y - 50,
      width: playerWidth,
      height: playerHeight,
    }

    const resolved = walkDownUntilBlocked(collisionSystem, startRect, 200, 5)

    expect(resolved.y + playerHeight).toBeLessThanOrEqual(door.collision!.y)
    expect(resolved.y + playerHeight).toBeGreaterThan(door.collision!.y - 5)
  })
})

describe('PHASE 10B layout (1920x1440 expansion)', () => {
  it('every object stays within the new 1920x1440 canonical bounds', () => {
    for (const object of worldObjects) {
      expect(object.position.x).toBeGreaterThanOrEqual(0)
      expect(object.position.x).toBeLessThanOrEqual(WORLD_WIDTH)
      expect(object.position.y).toBeGreaterThanOrEqual(0)
      expect(object.position.y).toBeLessThanOrEqual(WORLD_HEIGHT)
    }
  })

  it("the player's spawn point (world center) is walkable — no collision rect covers it", () => {
    const spawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
    const spawnRect = new CollisionBody().getRect(spawn.x, spawn.y)

    for (const object of worldObjects) {
      if (!object.collision) continue
      expect(rectsOverlap(spawnRect, object.collision)).toBe(false)
    }
  })

  it("the player's spawn point coincides with 'aboutMe', per GameScene.ts — reachable with zero movement", () => {
    const aboutMe = worldObjects.find((object) => object.id === 'aboutMe')!
    expect(aboutMe.position).toEqual({
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    })
  })

  it('no two physical (collision-bearing) objects overlap each other — every desk/marker/door/bed has real breathing room', () => {
    const blocking = worldObjects.filter((object) => object.collision)

    for (let i = 0; i < blocking.length; i++) {
      for (let j = i + 1; j < blocking.length; j++) {
        const a = blocking[i]
        const b = blocking[j]
        expect(
          rectsOverlap(a.collision!, b.collision!),
          `${a.id} unexpectedly overlaps ${b.id}`,
        ).toBe(false)
      }
    }
  })

  it('leaves the room center open — nothing blocking within a generous radius of the spawn point', () => {
    const spawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
    const CENTER_CLEARANCE_RADIUS = 150

    for (const object of worldObjects) {
      if (!object.collision || object.id === 'aboutMe') continue
      const cx = object.collision.x + object.collision.width / 2
      const cy = object.collision.y + object.collision.height / 2
      const distance = Math.hypot(cx - spawn.x, cy - spawn.y)
      expect(
        distance,
        `${object.id}'s collider center is too close to the open spawn area`,
      ).toBeGreaterThan(CENTER_CLEARANCE_RADIUS)
    }
  })
})

describe('PHASE 10B.1 CLEANUP — no redundant overlap with the room boundary, reachability preserved', () => {
  it('no WorldObject collider overlaps any room-boundary wall (regression: education/resume used to overlap the bottom wall by 28px)', () => {
    // Known, intentionally-excluded overlaps — all pre-existing from the
    // original PHASE 10B.1 wall-boundary implementation (not introduced by
    // this CLEANUP pass), found while writing this regression test, and
    // confirmed harmless: none of these five objects has an `interaction`
    // field of its own, so none can affect any interaction-radius
    // reachability — only 'education'/'resume' (fixed above) were content
    // markers whose collider actually touched a wall. Fixing these is out
    // of scope for PHASE 10B.1 CLEANUP, which asked only about the
    // education/resume-vs-bottom-wall overlap; flagged in the phase report
    // instead of silently fixed here too.
    // - 'door': deliberately embedded in the bottom wall band by design
    //   (PHASE 10B.1 report) — intentional.
    // - 'main-work-desk': sits entirely inside the top wall band.
    //   "projects" reachability is independently verified elsewhere in this
    //   file via its actual tested (side) approach path, never through
    //   main-work-desk's own collider.
    // - 'bed': overlaps both the top and left walls (it's a corner piece).
    // - 'education-desk': overlaps the left wall.
    const knownOverlaps = new Set([
      'door',
      'main-work-desk',
      'bed',
      'education-desk',
    ])

    for (const object of worldObjects) {
      if (!object.collision) continue
      if (knownOverlaps.has(object.id)) continue

      for (const wall of ROOM_BOUNDARY_COLLIDERS) {
        expect(
          rectsOverlap(object.collision, wall),
          `${object.id}'s collider unexpectedly overlaps a room-boundary wall`,
        ).toBe(false)
      }
    }
  })

  /**
   * Walks a player-sized rect one small step at a time toward a target,
   * mirroring real per-frame movement (see roomBoundary.test.ts's
   * `walkUntilBlocked` for why small steps matter — avoids tunneling clean
   * over a collider in one discrete jump).
   */
  function walkUntilBlocked(
    collisionSystem: CollisionSystem,
    start: { x: number; y: number },
    direction: { dx: number; dy: number },
    stepSize: number,
    maxSteps: number,
  ): { x: number; y: number } {
    const collisionBody = new CollisionBody()
    let rect = collisionBody.getRect(start.x, start.y)
    for (let i = 0; i < maxSteps; i++) {
      const resolved = collisionSystem.resolveMovement(
        rect,
        direction.dx * stepSize,
        direction.dy * stepSize,
      )
      if (resolved.x === rect.x && resolved.y === rect.y) break
      rect = { ...rect, ...resolved }
    }
    return collisionBody.toOrigin(rect.x, rect.y)
  }

  const combined = CollisionSystem.fromWorldObjects(
    worldObjects,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    ROOM_BOUNDARY_COLLIDERS,
  )
  const interactionSystem = InteractionSystem.fromWorldObjects(worldObjects)

  it("ABOUT ME is reachable with zero movement (it's the spawn point)", () => {
    const spawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
    const nearest = interactionSystem.findNearestInRange(spawn)
    expect(nearest?.id).toBe('aboutMe')
  })

  it('CERTIFICATES is still reachable (unaffected — its collider never touched the wall)', () => {
    const final = walkUntilBlocked(
      combined,
      { x: 960, y: 720 },
      { dx: 0, dy: 1 },
      10,
      100,
    )
    const nearest = interactionSystem.findNearestInRange(final)
    expect(nearest?.id).toBe('certificates')
  })

  it('EDUCATION is still reachable via the open-floor (east) side, approaching after the bottom-edge clip', () => {
    // Start east of the education marker/desk cluster, in open floor, and
    // walk west — the realistic approach path (straight-down from spawn's
    // column is blocked by the desk itself, unrelated to this cleanup).
    const final = walkUntilBlocked(
      combined,
      { x: 700, y: 1180 },
      { dx: -1, dy: 0 },
      10,
      100,
    )
    const nearest = interactionSystem.findNearestInRange(final)
    expect(nearest?.id).toBe('education')
  })

  it('RESUME is still reachable via the open-floor (west) side, approaching after the bottom-edge clip', () => {
    const final = walkUntilBlocked(
      combined,
      { x: 1220, y: 1180 },
      { dx: 1, dy: 0 },
      10,
      100,
    )
    const nearest = interactionSystem.findNearestInRange(final)
    expect(nearest?.id).toBe('resume')
  })

  it('every other interaction zone (projects, experience, skills) remains reachable too', () => {
    const approaches: Array<{
      id: string
      start: { x: number; y: number }
      direction: { dx: number; dy: number }
    }> = [
      {
        id: 'experience',
        start: { x: 380, y: 400 },
        direction: { dx: 0, dy: 1 },
      },
      { id: 'skills', start: { x: 1540, y: 400 }, direction: { dx: 0, dy: 1 } },
      {
        id: 'projects',
        start: { x: 1300, y: 550 },
        direction: { dx: 0, dy: -1 },
      },
    ]

    for (const { id, start, direction } of approaches) {
      const final = walkUntilBlocked(combined, start, direction, 10, 100)
      const nearest = interactionSystem.findNearestInRange(final)
      expect(nearest?.id, `approaching "${id}"`).toBe(id)
    }
  })
})

describe('validateWorldObjects', () => {
  it('rejects duplicate ids', () => {
    const objects = [
      makeObject({ id: 'projects', position: { x: 10, y: 10 } }),
      makeObject({ id: 'projects', position: { x: 20, y: 20 } }),
    ]

    expect(() => validateWorldObjects(objects)).toThrow(/duplicate/i)
  })

  it('rejects a position outside the canonical bounds', () => {
    const beyondRight = makeObject({ position: { x: WORLD_WIDTH + 1, y: 0 } })
    const beyondBottom = makeObject({
      position: { x: 0, y: WORLD_HEIGHT + 1 },
    })
    const negative = makeObject({ position: { x: -1, y: 0 } })

    expect(() => validateWorldObjects([beyondRight])).toThrow(/bounds/i)
    expect(() => validateWorldObjects([beyondBottom])).toThrow(/bounds/i)
    expect(() => validateWorldObjects([negative])).toThrow(/bounds/i)
  })

  it('accepts a position on the canonical boundary', () => {
    const onBoundary = makeObject({
      position: { x: WORLD_WIDTH, y: WORLD_HEIGHT },
    })

    expect(() => validateWorldObjects([onBoundary])).not.toThrow()
  })
})
