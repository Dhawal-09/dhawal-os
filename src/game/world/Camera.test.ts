import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { Camera } from './Camera'
import { CAMERA_CONFIG, CameraMode } from './cameraConstants'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

const FRAME_MS = 1000 / 60

function makeCamera(
  viewportWidth: number,
  viewportHeight: number,
  focus = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
) {
  const target = new Container()
  const camera = new Camera(target, WORLD_WIDTH, WORLD_HEIGHT)
  camera.follow(focus.x, focus.y)
  camera.resize(viewportWidth, viewportHeight)
  return { target, camera }
}

const containScale = (w: number, h: number) =>
  Math.min(w / WORLD_WIDTH, h / WORLD_HEIGHT)

/** Where a world point is drawn on screen under the camera's current transform. */
function toScreen(target: Container, worldX: number, worldY: number) {
  return {
    x: worldX * target.scale.x + target.position.x,
    y: worldY * target.scale.y + target.position.y,
  }
}

function run(camera: Camera, frames: number, frameMS = FRAME_MS) {
  for (let i = 0; i < frames; i++) camera.update(frameMS)
}

/** Enough frames to finish a mode transition and settle the follow. */
const SETTLE_FRAMES = 240

describe('Camera — configuration', () => {
  it('explore zoom sits inside its tuning range; overview is 1.0', () => {
    const { exploreZoom, exploreZoomRange, overviewZoom } = CAMERA_CONFIG
    expect(exploreZoom).toBeGreaterThanOrEqual(exploreZoomRange.min)
    expect(exploreZoom).toBeLessThanOrEqual(exploreZoomRange.max)
    expect(overviewZoom).toBe(1)
  })
})

describe('Camera — EXPLORE (default)', () => {
  it('starts in EXPLORE at the configured zoom × the whole-world fit on desktop', () => {
    for (const [w, h] of [
      [1920, 1080],
      [1440, 900],
      [1280, 720],
    ]) {
      const { target, camera } = makeCamera(w, h)
      expect(camera.mode).toBe(CameraMode.EXPLORE)
      expect(camera.debugState.zoom).toBeCloseTo(CAMERA_CONFIG.exploreZoom)
      expect(target.scale.x).toBeCloseTo(
        containScale(w, h) * CAMERA_CONFIG.exploreZoom,
      )
      expect(target.scale.x).toBe(target.scale.y) // uniform, never distorted
    }
  })

  it('floors the explore scale on phones so the player stays readable', () => {
    for (const [w, h] of [
      [390, 844],
      [844, 390],
    ]) {
      const { target } = makeCamera(w, h)
      expect(target.scale.x).toBeGreaterThanOrEqual(
        CAMERA_CONFIG.minExploreScale,
      )
      expect(target.scale.x).toBe(target.scale.y)
    }
  })

  it('the first resize snaps straight onto the spawn point (no easing in)', () => {
    const spawn = { x: 1610, y: 1140 }
    const { target, camera } = makeCamera(1440, 900, spawn)
    const { cameraX, cameraY, bounds } = camera.debugState
    expect(cameraX).toBe(Math.min(spawn.x, bounds.maxX))
    expect(cameraY).toBe(Math.min(spawn.y, bounds.maxY))
    // The spawn is on screen.
    const p = toScreen(target, spawn.x, spawn.y)
    expect(p.x).toBeGreaterThan(0)
    expect(p.x).toBeLessThan(1440)
    expect(p.y).toBeGreaterThan(0)
    expect(p.y).toBeLessThan(900)
  })

  it('does not show the whole world — both axes can pan on desktop', () => {
    const { bounds } = makeCamera(1920, 1080).camera.debugState
    expect(bounds.maxX).toBeGreaterThan(bounds.minX)
    expect(bounds.maxY).toBeGreaterThan(bounds.minY)
  })

  it('does not snap: one frame moves only part of the way toward a distant target', () => {
    const { camera } = makeCamera(1440, 900)
    const before = camera.debugState.cameraY
    camera.follow(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 300)
    camera.update(FRAME_MS)
    const moved = camera.debugState.cameraY - before
    expect(moved).toBeGreaterThan(0)
    expect(moved).toBeLessThan(300)
  })

  it('small moves inside the deadzone do not move the camera', () => {
    const { target, camera } = makeCamera(1440, 900)
    const before = { x: target.position.x, y: target.position.y }
    camera.follow(WORLD_WIDTH / 2 + 15, WORLD_HEIGHT / 2 - 15)
    run(camera, 60)
    expect(target.position.x).toBe(before.x)
    expect(target.position.y).toBe(before.y)
  })

  it('follows down/up and left/right to each world edge, stopping flush with it', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.follow(WORLD_WIDTH / 2, WORLD_HEIGHT - 40)
    run(camera, SETTLE_FRAMES)
    expect(toScreen(target, 0, WORLD_HEIGHT).y).toBe(900)

    camera.follow(WORLD_WIDTH / 2, 40)
    run(camera, SETTLE_FRAMES)
    expect(toScreen(target, 0, 0).y).toBe(0)

    camera.follow(40, WORLD_HEIGHT / 2)
    run(camera, SETTLE_FRAMES)
    expect(toScreen(target, 0, 0).x).toBe(0)

    camera.follow(WORLD_WIDTH - 40, WORLD_HEIGHT / 2)
    run(camera, SETTLE_FRAMES)
    expect(toScreen(target, WORLD_WIDTH, 0).x).toBe(1440)
  })

  it('settles without oscillating once the target stops', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.follow(1500, 1100)
    const xs: number[] = []
    for (let i = 0; i < SETTLE_FRAMES; i++) {
      camera.update(FRAME_MS)
      xs.push(target.position.x)
    }
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThanOrEqual(xs[i - 1]) // monotonic, no overshoot
    }
    expect(xs.at(-1)).toBe(xs.at(-30)) // at rest
  })

  it('is frame-rate independent: 30 FPS and 144 FPS land in the same place after the same time', () => {
    const a = makeCamera(1440, 900)
    const b = makeCamera(1440, 900)
    a.camera.follow(1400, 1000)
    b.camera.follow(1400, 1000)
    run(a.camera, 15, 1000 / 30) // 0.5s
    run(b.camera, 72, 1000 / 144) // 0.5s
    const sa = a.camera.debugState
    const sb = b.camera.debugState
    expect(Math.abs(sa.cameraX - sb.cameraX)).toBeLessThan(0.5)
    expect(Math.abs(sa.cameraY - sb.cameraY)).toBeLessThan(0.5)
  })

  it('keeps a walking player comfortably on screen', () => {
    const { target, camera } = makeCamera(1440, 900)
    let x = WORLD_WIDTH / 2
    const speedPerMS = 220 / 1000
    // ~1.5s of walking right — short of the right-edge clamp.
    for (let i = 0; i < 90; i++) {
      x += speedPerMS * FRAME_MS
      camera.follow(x, WORLD_HEIGHT / 2)
      camera.update(FRAME_MS)
      const sx = toScreen(target, x, 0).x
      expect(sx).toBeGreaterThan(720 - 150)
      expect(sx).toBeLessThan(720 + 150)
    }
  })

  it('writes whole-pixel offsets (no subpixel shimmer on pixel art)', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.follow(1234.567, 987.654)
    for (let i = 0; i < 30; i++) {
      camera.update(FRAME_MS)
      expect(Number.isInteger(target.position.x)).toBe(true)
      expect(Number.isInteger(target.position.y)).toBe(true)
    }
  })
})

describe('Camera — OVERVIEW', () => {
  it('transitions smoothly (no instant jump) and ends showing the whole world, centered', () => {
    const w = 1440
    const h = 900
    const { target, camera } = makeCamera(w, h, { x: 1670, y: 1140 })
    const exploreScale = target.scale.x

    camera.setMode(CameraMode.OVERVIEW)
    camera.update(FRAME_MS)
    expect(target.scale.x).toBeLessThan(exploreScale)
    expect(target.scale.x).toBeGreaterThan(containScale(w, h)) // not there yet
    expect(camera.transitioning).toBe(true)

    // Zoom only ever decreases on the way out.
    let prev = target.scale.x
    for (let i = 0; i < SETTLE_FRAMES; i++) {
      camera.update(FRAME_MS)
      expect(target.scale.x).toBeLessThanOrEqual(prev)
      prev = target.scale.x
    }
    expect(camera.transitioning).toBe(false)
    expect(camera.debugState.zoom).toBe(1)
    expect(target.scale.x).toBeCloseTo(containScale(w, h))

    // Entire world visible, centered (letterboxed on the spare axis).
    const topLeft = toScreen(target, 0, 0)
    const bottomRight = toScreen(target, WORLD_WIDTH, WORLD_HEIGHT)
    expect(topLeft.x).toBeGreaterThanOrEqual(0)
    expect(topLeft.y).toBeGreaterThanOrEqual(0)
    expect(bottomRight.x).toBeLessThanOrEqual(w + 0.5)
    expect(bottomRight.y).toBeLessThanOrEqual(h + 0.5)
    expect(Math.abs(topLeft.x - (w - bottomRight.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(topLeft.y - (h - bottomRight.y))).toBeLessThanOrEqual(1)
  })

  it('finishes the transition within the configured duration', () => {
    const { camera } = makeCamera(1440, 900)
    camera.setMode(CameraMode.OVERVIEW)
    const frames = Math.ceil(CAMERA_CONFIG.zoomTransitionMs / FRAME_MS)
    run(camera, frames)
    expect(camera.transitioning).toBe(false)
  })

  it('ignores the follow point while in OVERVIEW', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.setMode(CameraMode.OVERVIEW)
    run(camera, SETTLE_FRAMES)
    const before = { x: target.position.x, y: target.position.y }
    camera.follow(100, 100)
    run(camera, 60)
    expect(target.position.x).toBe(before.x)
    expect(target.position.y).toBe(before.y)
  })

  it('fits the whole world on a portrait phone without distortion', () => {
    const { target, camera } = makeCamera(390, 844)
    camera.setMode(CameraMode.OVERVIEW)
    run(camera, SETTLE_FRAMES)
    expect(target.scale.x).toBeCloseTo(390 / WORLD_WIDTH)
    expect(target.scale.x).toBe(target.scale.y)
    expect(toScreen(target, 0, 0).x).toBe(0)
  })
})

describe('Camera — returning to EXPLORE', () => {
  it('eases back onto the follow point at explore zoom', () => {
    const player = { x: 300, y: 1200 } // e.g. the far left/bottom
    const { target, camera } = makeCamera(1440, 900, player)
    const exploreScale = target.scale.x
    const exploreCamera = camera.debugState

    camera.setMode(CameraMode.OVERVIEW)
    run(camera, SETTLE_FRAMES)
    camera.setMode(CameraMode.EXPLORE)
    camera.update(FRAME_MS)
    expect(camera.transitioning).toBe(true)
    expect(target.scale.x).toBeLessThan(exploreScale) // not an instant jump

    run(camera, SETTLE_FRAMES)
    expect(camera.mode).toBe(CameraMode.EXPLORE)
    expect(target.scale.x).toBeCloseTo(exploreScale)
    expect(camera.debugState.cameraX).toBeCloseTo(exploreCamera.cameraX)
    expect(camera.debugState.cameraY).toBeCloseTo(exploreCamera.cameraY)
  })

  it('reversing mid-transition carries on smoothly from the in-flight zoom', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.setMode(CameraMode.OVERVIEW)
    run(camera, 10)
    const midScale = target.scale.x
    camera.setMode(CameraMode.EXPLORE)
    camera.update(FRAME_MS)
    expect(Math.abs(target.scale.x - midScale)).toBeLessThan(0.02)
  })
})

describe('Camera — world bounds', () => {
  const viewports: [number, number][] = [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [390, 844],
    [844, 390],
  ]
  const corners = [
    { x: 0, y: 0 },
    { x: WORLD_WIDTH, y: WORLD_HEIGHT },
    { x: 0, y: WORLD_HEIGHT },
    { x: WORLD_WIDTH, y: 0 },
  ]

  it('never reveals space outside the world — in either mode, mid-transition included', () => {
    for (const [w, h] of viewports) {
      for (const focus of corners) {
        const { target, camera } = makeCamera(w, h, focus)
        const check = () => {
          const topLeft = toScreen(target, 0, 0)
          const bottomRight = toScreen(target, WORLD_WIDTH, WORLD_HEIGHT)
          if (WORLD_WIDTH * target.scale.x >= w) {
            expect(topLeft.x).toBeLessThanOrEqual(0)
            expect(bottomRight.x).toBeGreaterThanOrEqual(w)
          }
          if (WORLD_HEIGHT * target.scale.y >= h) {
            expect(topLeft.y).toBeLessThanOrEqual(0)
            expect(bottomRight.y).toBeGreaterThanOrEqual(h)
          }
        }
        for (let i = 0; i < 60; i++) {
          camera.update(FRAME_MS)
          check()
        }
        camera.setMode(CameraMode.OVERVIEW)
        for (let i = 0; i < 60; i++) {
          camera.update(FRAME_MS)
          check()
        }
        camera.setMode(CameraMode.EXPLORE)
        for (let i = 0; i < 60; i++) {
          camera.update(FRAME_MS)
          check()
        }
      }
    }
  })
})

describe('Camera — resize', () => {
  it('keeps EXPLORE and the current framing (re-clamped), never re-snapping to spawn', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.follow(WORLD_WIDTH - 10, WORLD_HEIGHT - 10)
    run(camera, SETTLE_FRAMES)

    camera.resize(1920, 1080)
    const after = camera.debugState
    expect(after.mode).toBe(CameraMode.EXPLORE)
    expect(after.zoom).toBeCloseTo(CAMERA_CONFIG.exploreZoom)
    expect(after.cameraX).toBeLessThanOrEqual(after.bounds.maxX)
    expect(after.cameraY).toBeLessThanOrEqual(after.bounds.maxY)
    expect(after.cameraY).toBeGreaterThan(WORLD_HEIGHT / 2)
    expect(toScreen(target, 0, WORLD_HEIGHT).y).toBe(1080)
  })

  it('keeps OVERVIEW active and refits the whole world', () => {
    const { target, camera } = makeCamera(1440, 900)
    camera.setMode(CameraMode.OVERVIEW)
    run(camera, SETTLE_FRAMES)

    camera.resize(844, 390)
    expect(camera.mode).toBe(CameraMode.OVERVIEW)
    expect(target.scale.x).toBeCloseTo(containScale(844, 390))
  })

  it('ignores non-positive viewport dimensions', () => {
    const { target, camera } = makeCamera(800, 600)
    const before = { s: target.scale.x, x: target.position.x }
    camera.resize(0, 600)
    camera.resize(800, -1)
    expect(target.scale.x).toBe(before.s)
    expect(target.position.x).toBe(before.x)
  })
})
