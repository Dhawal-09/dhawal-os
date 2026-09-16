import { Texture } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import {
  createDeskSprite,
  createWorldObjectPlaceholder,
  createWorldObjectView,
  resolveAssetSize,
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
  it('anchors bottom-center by default so `position` represents where the object meets the floor', () => {
    const sprite = createDeskSprite(Texture.WHITE)

    expect(sprite.anchor.x).toBe(0.5)
    expect(sprite.anchor.y).toBe(1)
  })

  it('an explicit anchor overrides the (0.5, 1) default', () => {
    const sprite = createDeskSprite(Texture.WHITE, {
      anchor: { x: 0, y: 0 },
    })

    expect(sprite.anchor.x).toBe(0)
    expect(sprite.anchor.y).toBe(0)
  })

  it('defaults to native texture size when no transform is given', () => {
    const sprite = createDeskSprite(Texture.WHITE)

    expect(sprite.width).toBe(Texture.WHITE.width)
    expect(sprite.height).toBe(Texture.WHITE.height)
  })

  it('width and height can be set independently — changing one never changes the other', () => {
    const wideOnly = createDeskSprite(Texture.WHITE, { width: 200 })
    expect(wideOnly.width).toBe(200)
    expect(wideOnly.height).toBe(
      200 * (Texture.WHITE.height / Texture.WHITE.width),
    )

    const tallOnly = createDeskSprite(Texture.WHITE, { height: 300 })
    expect(tallOnly.height).toBe(300)
    expect(tallOnly.width).toBe(
      300 * (Texture.WHITE.width / Texture.WHITE.height),
    )

    const both = createDeskSprite(Texture.WHITE, { width: 150, height: 90 })
    expect(both.width).toBe(150)
    expect(both.height).toBe(90)
  })

  it('applies rotation when given', () => {
    const sprite = createDeskSprite(Texture.WHITE, { rotation: Math.PI / 4 })
    expect(sprite.rotation).toBe(Math.PI / 4)
  })
})

describe('resolveAssetSize', () => {
  const natural = { width: 200, height: 100 }

  it('uses the texture natural size when no transform is given', () => {
    expect(resolveAssetSize(natural)).toEqual({ width: 200, height: 100 })
    expect(resolveAssetSize(natural, {})).toEqual({ width: 200, height: 100 })
  })

  it('width only: height follows the natural aspect ratio', () => {
    expect(resolveAssetSize(natural, { width: 400 })).toEqual({
      width: 400,
      height: 200,
    })
  })

  it('height only: width follows the natural aspect ratio', () => {
    expect(resolveAssetSize(natural, { height: 50 })).toEqual({
      width: 100,
      height: 50,
    })
  })

  it('width and height both given: used exactly, independent of natural aspect ratio', () => {
    expect(resolveAssetSize(natural, { width: 500, height: 500 })).toEqual({
      width: 500,
      height: 500,
    })
  })

  it('when both are explicit, changing width alone never changes height, and vice versa', () => {
    const base = resolveAssetSize(natural, { width: 400, height: 50 })
    expect(base).toEqual({ width: 400, height: 50 })

    const widerOnly = resolveAssetSize(natural, { width: 600, height: 50 })
    expect(widerOnly.height).toBe(base.height)
    expect(widerOnly.width).toBe(600)

    const tallerOnly = resolveAssetSize(natural, { width: 400, height: 80 })
    expect(tallerOnly.width).toBe(base.width)
    expect(tallerOnly.height).toBe(80)
  })
})

describe('createWorldObjectView', () => {
  const deskObject: WorldObject = {
    id: 'main-work-desk',
    asset: 'furniture.mainWorkDesk',
    label: 'MAIN WORK DESK',
    position: { x: 700, y: 250 },
    layer: 'object',
    transform: { width: 358.12 },
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
