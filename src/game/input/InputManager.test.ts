import { describe, expect, it, vi } from 'vitest'
import type { KeyboardSource } from './KeyboardInput'
import { InputManager } from './InputManager'

function fakeKeyboard(pressedCodes: string[]): KeyboardSource {
  const pressed = new Set(pressedCodes)
  return {
    isPressed: (code) => pressed.has(code),
    destroy: vi.fn(),
  }
}

describe('InputManager', () => {
  it('returns a zero vector when nothing is pressed', () => {
    const input = new InputManager(fakeKeyboard([]))

    expect(input.getMovementVector()).toEqual({ x: 0, y: 0 })
  })

  it('maps each cardinal key (WASD and arrows) to a unit vector', () => {
    expect(
      new InputManager(fakeKeyboard(['KeyW'])).getMovementVector(),
    ).toEqual({ x: 0, y: -1 })
    expect(
      new InputManager(fakeKeyboard(['ArrowUp'])).getMovementVector(),
    ).toEqual({ x: 0, y: -1 })
    expect(
      new InputManager(fakeKeyboard(['KeyS'])).getMovementVector(),
    ).toEqual({ x: 0, y: 1 })
    expect(
      new InputManager(fakeKeyboard(['KeyA'])).getMovementVector(),
    ).toEqual({ x: -1, y: 0 })
    expect(
      new InputManager(fakeKeyboard(['KeyD'])).getMovementVector(),
    ).toEqual({ x: 1, y: 0 })
  })

  it('cancels opposite keys held simultaneously', () => {
    const input = new InputManager(fakeKeyboard(['KeyW', 'KeyS']))

    expect(input.getMovementVector()).toEqual({ x: 0, y: 0 })
  })

  it('normalizes a diagonal to unit length, not (1, 1)', () => {
    const input = new InputManager(fakeKeyboard(['KeyW', 'KeyD']))
    const { x, y } = input.getMovementVector()

    expect(Math.hypot(x, y)).toBeCloseTo(1)
    expect(x).toBeCloseTo(Math.SQRT1_2)
    expect(y).toBeCloseTo(-Math.SQRT1_2)
  })

  it('delegates destroy to the underlying keyboard source', () => {
    const keyboard = fakeKeyboard([])
    const input = new InputManager(keyboard)

    input.destroy()

    expect(keyboard.destroy).toHaveBeenCalledTimes(1)
  })
})
