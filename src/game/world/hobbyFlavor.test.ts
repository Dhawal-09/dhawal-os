import { describe, expect, it } from 'vitest'
import { CollisionBody } from '../player/CollisionBody'
import { PLAYER_SPAWN_POSITION } from '../player/playerConstants'
import { CollisionSystem } from './CollisionSystem'
import {
  HOBBY_WRAP_GLYPHS,
  hobbyAmbientCandidates,
  hobbyFlavorObjects,
} from './hobbyFlavor'
import { AMBIENT_STICKINESS, InteractionSystem } from './InteractionSystem'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'
import { EXTRA_COLLIDERS, worldObjects } from './worldObjects'

const candidates = hobbyAmbientCandidates(worldObjects)
const interactions = InteractionSystem.fromWorldObjects(
  worldObjects,
  candidates,
)

/** Every position the player can walk to from spawn (10-unit grid, real collision). */
function reachablePoints(): { x: number; y: number }[] {
  const collision = CollisionSystem.fromWorldObjects(
    worldObjects,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    EXTRA_COLLIDERS,
  )
  const body = new CollisionBody()
  const step = 10
  const reachable: { x: number; y: number }[] = []
  const seen = new Set([
    `${PLAYER_SPAWN_POSITION.x},${PLAYER_SPAWN_POSITION.y}`,
  ])
  const queue = [{ ...PLAYER_SPAWN_POSITION }]
  while (queue.length > 0) {
    const point = queue.pop()!
    reachable.push(point)
    const rect = body.getRect(point.x, point.y)
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const resolved = collision.resolveMovement(rect, dx, dy)
      if (resolved.x !== rect.x + dx || resolved.y !== rect.y + dy) continue
      const next = { x: point.x + dx, y: point.y + dy }
      const key = `${next.x},${next.y}`
      if (seen.has(key)) continue
      seen.add(key)
      queue.push(next)
    }
  }
  return reachable
}

describe('hobby flavor data', () => {
  it('defines each hobby once, with a message and at least one spot', () => {
    const ids = hobbyFlavorObjects.map((hobby) => hobby.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([
      'hobby-football-jersey',
      'hobby-running-medals',
      'hobby-gym-equipment',
      'hobby-gaming-corner',
      'hobby-drawing',
    ])
    for (const hobby of hobbyFlavorObjects) {
      expect(hobby.message.trim(), hobby.id).toBe(hobby.message)
      expect(hobby.message.length, hobby.id).toBeGreaterThan(0)
      expect(hobby.spots.length, hobby.id).toBeGreaterThan(0)
    }
  })

  it('keeps every caption compact: at most two wrapped lines of message and three of secondary text', () => {
    for (const hobby of hobbyFlavorObjects) {
      expect(hobby.message.length, hobby.id).toBeLessThanOrEqual(
        HOBBY_WRAP_GLYPHS * 2,
      )
      expect(hobby.secondaryMessage?.length ?? 0, hobby.id).toBeLessThanOrEqual(
        HOBBY_WRAP_GLYPHS * 3,
      )
    }
  })

  it('ties every spot to a real world object, and stays close to it', () => {
    const byId = new Map(worldObjects.map((object) => [object.id, object]))
    for (const hobby of hobbyFlavorObjects) {
      for (const spot of hobby.spots) {
        expect(byId.has(spot.object), `${hobby.id} -> ${spot.object}`).toBe(
          true,
        )
        expect(spot.radius).toBeGreaterThan(0)
        // The trigger point is beside the object, not somewhere else in the house.
        expect(Math.hypot(spot.trigger.x, spot.trigger.y)).toBeLessThan(200)
      }
    }
  })

  it('refuses a hobby that names an object missing from the world', () => {
    expect(() =>
      hobbyAmbientCandidates(worldObjects, [
        {
          id: 'hobby-x',
          message: 'x',
          spots: [
            {
              object: 'no-such-object',
              trigger: { x: 0, y: 0 },
              pointer: { x: 0, y: 0 },
              radius: 10,
            },
          ],
        },
      ]),
    ).toThrow(/no-such-object/)
  })
})

describe('hobby flavor candidates', () => {
  it('are ambient info messages: no action, no key hint, shown while in range', () => {
    expect(candidates.length).toBe(
      hobbyFlavorObjects.reduce((n, hobby) => n + hobby.spots.length, 0),
    )
    for (const candidate of candidates) {
      expect('action' in candidate).toBe(false)
      expect(candidate.message.type).toBe('info')
      expect(candidate.message.radius).toBe(candidate.radius)
    }
  })

  it('carry the hobby’s message and secondary line', () => {
    for (const hobby of hobbyFlavorObjects) {
      const own = candidates.filter((candidate) => candidate.id === hobby.id)
      expect(own).toHaveLength(hobby.spots.length)
      for (const candidate of own) {
        expect(candidate.message.text).toBe(hobby.message)
        expect(candidate.message.secondaryText).toBe(hobby.secondaryMessage)
      }
    }
  })

  it('never claim a point where an interactable is in range — a real [E] prompt always wins', () => {
    for (const candidate of candidates) {
      expect(
        interactions.findNearestInRange(candidate.position),
        candidate.id,
      ).toBeNull()
    }
  })

  it('every spot can actually be triggered from somewhere the player can stand', () => {
    const reachable = reachablePoints()
    const untriggered = candidates.filter(
      (candidate) =>
        !reachable.some(
          (point) =>
            !interactions.findNearestInRange(point) &&
            interactions.findNearestAmbientInRange(point) === candidate,
        ),
    )
    expect(
      untriggered.map((c) => `${c.id}@${c.position.x},${c.position.y}`),
    ).toEqual([])
  })

  it('only one message at a time: any standing point resolves to a single spot, and the active one is sticky', () => {
    const [first, second] = candidates
    const system = new InteractionSystem(
      [],
      [
        { ...first, position: { x: 0, y: 0 }, radius: 100 },
        { ...second, position: { x: 100, y: 0 }, radius: 100 },
      ],
    )
    const justPastMidpoint = { x: 50 + AMBIENT_STICKINESS / 2 - 1, y: 0 }
    const a = system.findNearestAmbientInRange({ x: 10, y: 0 })!
    const b = system.findNearestAmbientInRange({ x: 90, y: 0 })!
    expect(a.id).toBe(first.id)
    expect(b.id).toBe(second.id)

    // Without a current spot the nearer one wins; the spot already showing
    // keeps the prompt until the other is clearly nearer.
    expect(system.findNearestAmbientInRange(justPastMidpoint)).toBe(b)
    expect(system.findNearestAmbientInRange(justPastMidpoint, a)).toBe(a)
    expect(system.findNearestAmbientInRange({ x: 80, y: 0 }, a)).toBe(b)

    // …and stays in range slightly past its own radius, then lets go.
    expect(
      system.findNearestAmbientInRange(
        { x: -100 - AMBIENT_STICKINESS + 1, y: 0 },
        a,
      ),
    ).toBe(a)
    expect(system.findNearestAmbientInRange({ x: -105, y: 0 })).toBeNull()
    expect(
      system.findNearestAmbientInRange(
        { x: -101 - AMBIENT_STICKINESS, y: 0 },
        a,
      ),
    ).toBeNull()
  })
})
