import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { Camera } from './Camera'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 1024

describe('Camera', () => {
  it('scales to "contain" the world and centers it when the viewport is wider than the world aspect ratio', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    // 2000x1024 viewport: height is the limiting dimension.
    camera.resize(2000, 1024)

    const expectedScale = 1024 / WORLD_HEIGHT // 1
    expect(target.scale.x).toBeCloseTo(expectedScale)
    expect(target.scale.y).toBeCloseTo(expectedScale)
    expect(target.position.x).toBeCloseTo(
      (2000 - WORLD_WIDTH * expectedScale) / 2,
    )
    expect(target.position.y).toBeCloseTo(0)
  })

  it('scales to "contain" the world and centers it when the viewport is taller than the world aspect ratio', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    // 720x1024 viewport: width is the limiting dimension.
    camera.resize(720, 1024)

    const expectedScale = 720 / WORLD_WIDTH // 0.5
    expect(target.scale.x).toBeCloseTo(expectedScale)
    expect(target.scale.y).toBeCloseTo(expectedScale)
    expect(target.position.x).toBeCloseTo(0)
    expect(target.position.y).toBeCloseTo(
      (1024 - WORLD_HEIGHT * expectedScale) / 2,
    )
  })

  it('preserves aspect ratio — never applies different x/y scale', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(900, 300)

    expect(target.scale.x).toBe(target.scale.y)
  })

  it('ignores non-positive viewport dimensions', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(800, 600)
    const before = { x: target.scale.x, y: target.scale.y }

    camera.resize(0, 600)
    camera.resize(800, -1)

    expect(target.scale.x).toBe(before.x)
    expect(target.scale.y).toBe(before.y)
  })
})
