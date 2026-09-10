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
