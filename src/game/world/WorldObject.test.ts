import { describe, expect, it } from 'vitest'
import { createWorldObjectPlaceholder } from './WorldObject'
import type { WorldObject } from './WorldObject'

describe('createWorldObjectPlaceholder', () => {
  const object: WorldObject = {
    id: 'projects',
    asset: 'content.projects',
    label: 'PROJECTS',
    position: { x: 300, y: 300 },
    layer: 'object',
  }

  it("positions the view at the object's canonical coordinates", () => {
    const view = createWorldObjectPlaceholder(object)

    expect(view.position.x).toBe(300)
    expect(view.position.y).toBe(300)
  })

  it('labels the view with the object id, for layer/lookup assertions', () => {
    const view = createWorldObjectPlaceholder(object)

    expect(view.label).toBe('WorldObject:projects')
  })

  it('does not throw for any declared layer', () => {
    const layers: WorldObject['layer'][] = [
      'background',
      'object',
      'foreground',
    ]

    for (const layer of layers) {
      expect(() =>
        createWorldObjectPlaceholder({ ...object, layer }),
      ).not.toThrow()
    }
  })
})
