import { describe, expect, it } from 'vitest'
import type { WorldObject } from './WorldObject'
import { World } from './World'

const fixtures: WorldObject[] = [
  {
    id: 'bg-1',
    asset: 'content.bg',
    label: 'BG',
    position: { x: 10, y: 10 },
    layer: 'background',
  },
  {
    id: 'obj-1',
    asset: 'content.obj',
    label: 'OBJ',
    position: { x: 20, y: 20 },
    layer: 'object',
  },
  {
    id: 'fg-1',
    asset: 'content.fg',
    label: 'FG',
    position: { x: 30, y: 30 },
    layer: 'foreground',
  },
]

describe('World', () => {
  it('exposes the four layer containers in back-to-front draw order (a dev-only debug overlay may follow)', () => {
    const world = new World([])

    expect(world.children.slice(0, 4)).toEqual([
      world.backgroundLayer,
      world.objectsLayer,
      world.playerLayer,
      world.foregroundLayer,
    ])
  })

  it('places each configured object into the layer container matching its `layer` field', () => {
    const world = new World(fixtures)

    expect(
      world.objectsLayer.children.some(
        (child) => child.label === 'WorldObject:obj-1',
      ),
    ).toBe(true)
    expect(
      world.foregroundLayer.children.some(
        (child) => child.label === 'WorldObject:fg-1',
      ),
    ).toBe(true)
    expect(
      world.backgroundLayer.children.some(
        (child) => child.label === 'WorldObject:bg-1',
      ),
    ).toBe(true)

    // and never cross-placed into a layer it doesn't belong to
    expect(
      world.objectsLayer.children.some(
        (child) => child.label === 'WorldObject:fg-1',
      ),
    ).toBe(false)
  })

  it('the player layer stays empty — no WorldObject targets it', () => {
    const world = new World(fixtures)

    expect(world.playerLayer.children).toHaveLength(0)
  })

  it('constructs cleanly with an empty object list', () => {
    expect(() => new World([])).not.toThrow()
  })

  it('draws a dev-only collision debug overlay on top, for configured colliders only', () => {
    const withCollider: WorldObject = {
      id: 'blocking',
      asset: 'content.blocking',
      label: 'BLOCKING',
      position: { x: 50, y: 50 },
      layer: 'object',
      collision: { x: 20, y: 20, width: 60, height: 60 },
    }
    const world = new World([withCollider, fixtures[1]]) // fixtures[1] has no collision

    const overlay = world.children.find(
      (child) => child.label === 'CollisionDebugOverlay',
    )

    expect(overlay).toBeDefined()
    expect(overlay?.children).toHaveLength(1) // only the object with `collision`
    expect(world.children.at(-1)).toBe(overlay) // drawn last (on top)
  })
})
