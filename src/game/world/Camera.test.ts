import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { Camera } from './Camera'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

describe('Camera (contain fit, panned/clamped when the room does not fit legibly)', () => {
  it('scale is 1 and the room is unshifted when the viewport exactly matches the world dimensions', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(WORLD_WIDTH, WORLD_HEIGHT)

    expect(target.scale.x).toBeCloseTo(1)
    expect(target.scale.y).toBeCloseTo(1)
    expect(target.position.x).toBeCloseTo(0)
    expect(target.position.y).toBeCloseTo(0)
  })

  it('a 1920x1080 viewport uses the uniform contain scale — the whole room fits, letterboxed left/right, never cropped', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(1920, 1080)

    const expectedScale = 1080 / WORLD_HEIGHT // the smaller of the two ratios
    expect(expectedScale).toBeLessThan(1920 / WORLD_WIDTH)
    expect(target.scale.x).toBeCloseTo(expectedScale)
    expect(target.scale.y).toBeCloseTo(expectedScale) // uniform — no independent x/y scale
    expect(target.scale.x).toBe(target.scale.y)

    const scaledWorldWidth = WORLD_WIDTH * expectedScale
    const scaledWorldHeight = WORLD_HEIGHT * expectedScale
    expect(scaledWorldHeight).toBeCloseTo(1080) // fills the viewport height exactly
    expect(scaledWorldWidth).toBeLessThan(1920) // the width axis has leftover space — contain, not cover

    // Letterboxed (centered, non-negative offset) — unlike a "cover" fit,
    // contain never crops, so the offset is never negative here.
    expect(target.position.x).toBeCloseTo((1920 - scaledWorldWidth) / 2)
    expect(target.position.x).toBeGreaterThan(0)
    expect(target.position.y).toBeCloseTo(0)
  })

  it('a 1366x768 laptop viewport also contains the whole room, letterboxed left/right', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(1366, 768)

    const expectedScale = 768 / WORLD_HEIGHT
    expect(expectedScale).toBeLessThan(1366 / WORLD_WIDTH)
    expect(target.scale.x).toBeCloseTo(expectedScale)
    expect(target.scale.y).toBeCloseTo(expectedScale)

    const scaledWorldWidth = WORLD_WIDTH * expectedScale
    expect(scaledWorldWidth).toBeLessThan(1366)
    expect(target.position.x).toBeCloseTo((1366 - scaledWorldWidth) / 2)
    expect(target.position.x).toBeGreaterThan(0)
    expect(target.position.y).toBeCloseTo(0)
  })

  it('a 1536x864 desktop viewport also contains the whole room', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(1536, 864)

    const expectedScale = 864 / WORLD_HEIGHT
    expect(target.scale.x).toBeCloseTo(expectedScale)
    expect(target.scale.y).toBeCloseTo(expectedScale)
    expect(WORLD_WIDTH * expectedScale).toBeLessThan(1536)
  })

  it('preserves aspect ratio — never applies different x/y scale, for any viewport shape', () => {
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

  it('recalculates cleanly across a resize sequence, always uniform', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(1280, 800)
    const firstScale = target.scale.x
    expect(target.scale.x).toBe(target.scale.y)

    camera.resize(1536, 864)
    const secondScale = target.scale.x
    expect(target.scale.x).toBe(target.scale.y)

    expect(secondScale).not.toBeCloseTo(firstScale)
    expect(secondScale).toBeCloseTo(864 / WORLD_HEIGHT)
  })
})

describe('Camera — panning a subsection on a viewport too small to contain the room legibly (PHASE 10B)', () => {
  const MOBILE_WIDTH = 390
  const MOBILE_HEIGHT = 844
  /** Below this the room would render illegibly small — Camera.ts's documented floor. */
  const MIN_SCALE = 0.5

  it('floors the scale instead of shrinking the whole room to fit a narrow mobile viewport', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    const containScale = Math.min(
      MOBILE_WIDTH / WORLD_WIDTH,
      MOBILE_HEIGHT / WORLD_HEIGHT,
    )
    expect(containScale).toBeLessThan(MIN_SCALE) // confirms this viewport actually exercises the floor
    expect(target.scale.x).toBeCloseTo(MIN_SCALE)
    expect(target.scale.y).toBeCloseTo(MIN_SCALE)
  })

  it('at the floor scale, the overflowing axis (width) centers on the default focus (world center) with no explicit follow() call yet', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    const scaledWorldWidth = WORLD_WIDTH * MIN_SCALE
    expect(scaledWorldWidth).toBeGreaterThan(MOBILE_WIDTH) // width genuinely overflows — panning is active

    // World-space center (WORLD_WIDTH/2) should draw at the viewport's own center.
    const worldCenterScreenX = (WORLD_WIDTH / 2) * MIN_SCALE + target.position.x
    expect(worldCenterScreenX).toBeCloseTo(MOBILE_WIDTH / 2)
  })

  it('the non-overflowing axis (height, on a tall mobile viewport) stays centered/letterboxed rather than panning', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)

    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    const scaledWorldHeight = WORLD_HEIGHT * MIN_SCALE
    expect(scaledWorldHeight).toBeLessThan(MOBILE_HEIGHT) // height fits — no panning needed on this axis
    expect(target.position.y).toBeCloseTo(
      (MOBILE_HEIGHT - scaledWorldHeight) / 2,
    )
  })

  it('follow() re-centers the panned axis on a new focus point', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    camera.follow(500, WORLD_HEIGHT / 2)

    const worldFocusScreenX = 500 * MIN_SCALE + target.position.x
    expect(worldFocusScreenX).toBeCloseTo(MOBILE_WIDTH / 2)
  })

  it('follow() clamps panning so the world edge never reveals space beyond world bounds (left edge)', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    // Focus far past the left edge of the world — the camera must not pan
    // past x=0 revealing empty space beyond the room's left wall.
    camera.follow(0, WORLD_HEIGHT / 2)

    const worldLeftEdgeScreenX = 0 * MIN_SCALE + target.position.x
    expect(worldLeftEdgeScreenX).toBeGreaterThanOrEqual(0)
    expect(worldLeftEdgeScreenX).toBeCloseTo(0) // clamped flush with the viewport's left edge
  })

  it('follow() clamps panning so the world edge never reveals space beyond world bounds (right edge)', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)

    camera.follow(WORLD_WIDTH, WORLD_HEIGHT / 2)

    const worldRightEdgeScreenX = WORLD_WIDTH * MIN_SCALE + target.position.x
    expect(worldRightEdgeScreenX).toBeLessThanOrEqual(MOBILE_WIDTH)
    expect(worldRightEdgeScreenX).toBeCloseTo(MOBILE_WIDTH) // clamped flush with the viewport's right edge
  })

  it('follow() is a no-op on a viewport large enough to contain the whole room (desktop) — the scale/position never move regardless of focus', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
    camera.resize(1920, 1080)

    const before = { x: target.position.x, y: target.position.y }

    camera.follow(0, 0)
    expect(target.position.x).toBeCloseTo(before.x)
    expect(target.position.y).toBeCloseTo(before.y)

    camera.follow(WORLD_WIDTH, WORLD_HEIGHT)
    expect(target.position.x).toBeCloseTo(before.x)
    expect(target.position.y).toBeCloseTo(before.y)
  })

  it('scale never changes because of follow() alone — only resize() changes scale', () => {
    const target = new Container()
    const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
    camera.resize(MOBILE_WIDTH, MOBILE_HEIGHT)
    const scaleBefore = target.scale.x

    camera.follow(1200, 300)

    expect(target.scale.x).toBe(scaleBefore)
    expect(target.scale.y).toBe(scaleBefore)
  })
})
