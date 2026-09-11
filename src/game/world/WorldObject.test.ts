import { Texture } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import {
  createDeskSprite,
  createWorldObjectPlaceholder,
  createWorldObjectView,
} from './WorldObject'
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

describe('createDeskSprite', () => {
  it('anchors bottom-center so `position` represents where the object meets the floor', () => {
    const sprite = createDeskSprite(Texture.WHITE, 1)

    expect(sprite.anchor.x).toBe(0.5)
    expect(sprite.anchor.y).toBe(1)
  })

  it('scales uniformly on both axes — never independent x/y scaling (no distortion)', () => {
    const sprite = createDeskSprite(Texture.WHITE, 0.28)

    expect(sprite.scale.x).toBe(0.28)
    expect(sprite.scale.y).toBe(0.28)
  })

  it('defaults to native scale (1) when none is given', () => {
    const sprite = createDeskSprite(Texture.WHITE)

    expect(sprite.scale.x).toBe(1)
    expect(sprite.scale.y).toBe(1)
  })
})

describe('createWorldObjectView', () => {
  const deskObject: WorldObject = {
    id: 'main-work-desk',
    asset: 'furniture.mainWorkDesk',
    label: 'MAIN WORK DESK',
    position: { x: 700, y: 250 },
    layer: 'object',
    scale: 0.28,
  }

  it('renders the dev placeholder for an object whose asset has no manifest mapping (unchanged behavior)', () => {
    const object: WorldObject = {
      id: 'projects',
      asset: 'content.projects',
      label: 'PROJECTS',
      position: { x: 300, y: 300 },
      layer: 'object',
    }

    const view = createWorldObjectView(object)

    expect(view.label).toBe('WorldObject:projects')
    expect(view.position.x).toBe(300)
    expect(view.position.y).toBe(300)
  })

  it("positions the view at the object's canonical coordinates for a manifest-mapped (desk) asset too", () => {
    const view = createWorldObjectView(deskObject)

    expect(view.label).toBe('WorldObject:main-work-desk')
    expect(view.position.x).toBe(700)
    expect(view.position.y).toBe(250)
  })

  it('moving only `position` moves the rendered view — no rendering/collision/interaction code involved', () => {
    const viewBefore = createWorldObjectView(deskObject)
    expect(viewBefore.position.x).toBe(700)
    expect(viewBefore.position.y).toBe(250)

    const moved: WorldObject = {
      ...deskObject,
      position: { x: 820, y: 300 },
    }
    const viewAfter = createWorldObjectView(moved)

    expect(viewAfter.position.x).toBe(820)
    expect(viewAfter.position.y).toBe(300)
  })

  it('does not throw when the manifest-mapped asset fails to resolve/load (jsdom has no real image pipeline)', () => {
    expect(() => createWorldObjectView(deskObject)).not.toThrow()
  })
})
