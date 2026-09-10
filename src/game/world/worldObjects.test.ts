import { describe, expect, it } from 'vitest'
import type { WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'
import { validateWorldObjects, worldObjects } from './worldObjects'

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

  it('every configured collider is centered on its object — collision geometry stays in sync with placement', () => {
    for (const object of worldObjects) {
      if (!object.collision) continue

      const centerX = object.collision.x + object.collision.width / 2
      const centerY = object.collision.y + object.collision.height / 2
      expect(centerX).toBeCloseTo(object.position.x)
      expect(centerY).toBeCloseTo(object.position.y)
    }
  })

  it('every content area has a configured interaction, each with a distinct canonical action', () => {
    const interactive = worldObjects.filter((object) => object.interaction)

    expect(interactive.length).toBe(worldObjects.length)

    const actions = interactive.map((object) => object.interaction!.action)
    expect(new Set(actions).size).toBe(actions.length)
  })

  it('every interaction radius is a sane positive number, not 0 or negative', () => {
    for (const object of worldObjects) {
      if (!object.interaction) continue
      expect(object.interaction.radius).toBeGreaterThan(0)
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
