import { describe, expect, it } from 'vitest'
import { computeJoystick, JOYSTICK_DEAD_ZONE } from './joystickMath'

const TRAVEL = 50

describe('computeJoystick', () => {
  it('is at rest in the center', () => {
    expect(computeJoystick(0, 0, TRAVEL)).toEqual({
      x: 0,
      y: 0,
      magnitude: 0,
      knobX: 0,
      knobY: 0,
    })
  })

  it('full deflection along each axis gives a unit vector (y grows downward)', () => {
    const cases = [
      [TRAVEL, 0, 1, 0],
      [-TRAVEL, 0, -1, 0],
      [0, TRAVEL, 0, 1],
      [0, -TRAVEL, 0, -1],
    ] as const
    for (const [offsetX, offsetY, x, y] of cases) {
      const stick = computeJoystick(offsetX, offsetY, TRAVEL)
      expect(stick.x).toBeCloseTo(x)
      expect(stick.y).toBeCloseTo(y)
      expect(stick.magnitude).toBeCloseTo(1)
    }
  })

  it('upper-right at full deflection is ≈ (+0.7, -0.7), not snapped to an axis', () => {
    const stick = computeJoystick(TRAVEL, -TRAVEL, TRAVEL)

    expect(stick.x).toBeCloseTo(Math.SQRT1_2)
    expect(stick.y).toBeCloseTo(-Math.SQRT1_2)
    expect(stick.magnitude).toBeCloseTo(1)
  })

  it('keeps the exact angle of the thumb — every direction, not 4 or 8', () => {
    for (let degrees = 0; degrees < 360; degrees += 7) {
      const angle = (degrees * Math.PI) / 180
      const stick = computeJoystick(
        Math.cos(angle) * TRAVEL,
        Math.sin(angle) * TRAVEL,
        TRAVEL,
      )
      expect(Math.atan2(stick.y, stick.x)).toBeCloseTo(
        Math.atan2(Math.sin(angle), Math.cos(angle)),
      )
      expect(stick.magnitude).toBeCloseTo(1)
    }
  })

  it('reports no movement inside the dead zone, while the knob still follows the thumb', () => {
    const offset = TRAVEL * JOYSTICK_DEAD_ZONE * 0.9
    const stick = computeJoystick(offset, 0, TRAVEL)

    expect(stick.x).toBe(0)
    expect(stick.y).toBe(0)
    expect(stick.magnitude).toBe(0)
    expect(stick.knobX).toBeCloseTo(offset)
  })

  it('ramps smoothly from 0 at the dead zone edge to 1 at full travel — small push slow, far push fast', () => {
    const justOutside = computeJoystick(
      TRAVEL * (JOYSTICK_DEAD_ZONE + 0.01),
      0,
      TRAVEL,
    )
    const half = computeJoystick(TRAVEL * 0.5, 0, TRAVEL)
    const most = computeJoystick(TRAVEL * 0.9, 0, TRAVEL)

    expect(justOutside.magnitude).toBeGreaterThan(0)
    expect(justOutside.magnitude).toBeLessThan(0.05)
    expect(half.magnitude).toBeCloseTo(
      (0.5 - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE),
    )
    expect(most.magnitude).toBeGreaterThan(half.magnitude)
    expect(most.magnitude).toBeLessThan(1)
  })

  it('clamps the knob and the magnitude when the thumb drags beyond the base', () => {
    const stick = computeJoystick(TRAVEL * 4, TRAVEL * 3, TRAVEL)

    expect(Math.hypot(stick.knobX, stick.knobY)).toBeCloseTo(TRAVEL)
    expect(stick.magnitude).toBeCloseTo(1)
    // Direction is still the thumb's: a 3-4-5 triangle.
    expect(stick.x).toBeCloseTo(0.8)
    expect(stick.y).toBeCloseTo(0.6)
  })

  it('honours a custom dead zone', () => {
    expect(computeJoystick(TRAVEL * 0.3, 0, TRAVEL, 0.4).magnitude).toBe(0)
    expect(computeJoystick(TRAVEL * 0.3, 0, TRAVEL, 0).magnitude).toBeCloseTo(
      0.3,
    )
  })

  it('is at rest when the base has no size yet (nothing to measure)', () => {
    expect(computeJoystick(10, 10, 0).magnitude).toBe(0)
  })
})
