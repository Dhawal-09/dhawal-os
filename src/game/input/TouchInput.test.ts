import { describe, expect, it } from 'vitest'
import {
  JOYSTICK_ATTACK_MS,
  JOYSTICK_RELEASE_MS,
  TouchInput,
} from './TouchInput'

describe('TouchInput — joystick vector', () => {
  it('is at rest until the stick is moved', () => {
    expect(new TouchInput().getMovementVector()).toEqual({ x: 0, y: 0 })
  })

  it('without a frame delta, reports exactly where the stick is held', () => {
    const touch = new TouchInput()

    touch.setMovement(0.3, -0.4)
    expect(touch.getMovementVector()).toEqual({ x: 0.3, y: -0.4 })

    touch.setMovement(0, 0)
    expect(touch.getMovementVector()).toEqual({ x: 0, y: 0 })
  })

  it('clamps a vector longer than 1 to the unit circle, keeping its direction', () => {
    const touch = new TouchInput()

    touch.setMovement(3, 4)
    const { x, y } = touch.getMovementVector()

    expect(x).toBeCloseTo(0.6)
    expect(y).toBeCloseTo(0.8)
  })

  it('treats a non-finite vector as released', () => {
    const touch = new TouchInput()
    touch.setMovement(Number.NaN, 1)

    expect(touch.getMovementVector()).toEqual({ x: 0, y: 0 })
  })
})

describe('TouchInput — smoothing', () => {
  it('eases in: movement starts from zero and closes on the held vector over a few frames', () => {
    const touch = new TouchInput()
    touch.setMovement(1, 0)

    const first = touch.getMovementVector(16).x
    const second = touch.getMovementVector(16).x

    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(0.5)
    expect(second).toBeGreaterThan(first)

    for (let frame = 0; frame < 30; frame++) touch.getMovementVector(16)
    expect(touch.getMovementVector(16).x).toBeCloseTo(1, 2)
  })

  it('covers ~63% of the gap in one attack time constant, whatever the frame rate', () => {
    const at60 = new TouchInput()
    at60.setMovement(1, 0)
    let x60 = 0
    for (let ms = 0; ms < JOYSTICK_ATTACK_MS; ms += 5) {
      x60 = at60.getMovementVector(5).x
    }

    const oneBigFrame = new TouchInput()
    oneBigFrame.setMovement(1, 0)
    const xBig = oneBigFrame.getMovementVector(JOYSTICK_ATTACK_MS).x

    expect(xBig).toBeCloseTo(1 - Math.exp(-1))
    expect(x60).toBeCloseTo(xBig, 5)
  })

  it('eases out on release and then stops dead — no residual drift', () => {
    const touch = new TouchInput()
    touch.setMovement(0, 1)
    for (let frame = 0; frame < 60; frame++) touch.getMovementVector(16)

    touch.setMovement(0, 0)
    const firstAfterRelease = touch.getMovementVector(16).y
    expect(firstAfterRelease).toBeGreaterThan(0)
    expect(firstAfterRelease).toBeLessThan(1)

    // Well past the release time constant: exactly zero, and it stays there.
    let y = firstAfterRelease
    for (let ms = 0; ms < JOYSTICK_RELEASE_MS * 8; ms += 16) {
      y = touch.getMovementVector(16).y
    }
    expect(y).toBe(0)
    expect(touch.getMovementVector(16)).toEqual({ x: 0, y: 0 })
  })

  it('turns smoothly: changing direction passes through intermediate angles', () => {
    const touch = new TouchInput()
    touch.setMovement(1, 0)
    for (let frame = 0; frame < 60; frame++) touch.getMovementVector(16)

    touch.setMovement(0, 1)
    const { x, y } = touch.getMovementVector(16)

    expect(x).toBeGreaterThan(0)
    expect(x).toBeLessThan(1)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(1)
  })

  it('a zero delta (a paused frame) changes nothing', () => {
    const touch = new TouchInput()
    touch.setMovement(1, 0)
    const before = touch.getMovementVector(16)

    expect(touch.getMovementVector(0)).toEqual(before)
  })

  it('smoothing can be switched off with zero time constants', () => {
    const touch = new TouchInput({ attackMS: 0, releaseMS: 0 })

    touch.setMovement(0.5, 0)
    expect(touch.getMovementVector(16)).toEqual({ x: 0.5, y: 0 })

    touch.setMovement(0, 0)
    expect(touch.getMovementVector(16)).toEqual({ x: 0, y: 0 })
  })

  it('stopMovement() lets go at once, with no ease-out', () => {
    const touch = new TouchInput()
    touch.setMovement(1, 0)
    for (let frame = 0; frame < 60; frame++) touch.getMovementVector(16)

    touch.stopMovement()

    expect(touch.getMovementVector(16)).toEqual({ x: 0, y: 0 })
  })
})

describe('TouchInput — interact', () => {
  it('reports an interact press exactly once', () => {
    const touch = new TouchInput()
    expect(touch.wasInteractPressed()).toBe(false)

    touch.pressInteract()

    expect(touch.wasInteractPressed()).toBe(true)
    expect(touch.wasInteractPressed()).toBe(false)
  })

  it('reset() releases the stick immediately and drops a pending interact press', () => {
    const touch = new TouchInput()
    touch.setMovement(-1, 0)
    for (let frame = 0; frame < 60; frame++) touch.getMovementVector(16)
    touch.pressInteract()

    touch.reset()

    expect(touch.getMovementVector(16)).toEqual({ x: 0, y: 0 })
    expect(touch.wasInteractPressed()).toBe(false)
  })
})
