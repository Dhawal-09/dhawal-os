import { describe, expect, it, vi } from 'vitest'
import type { KeyboardSource } from './KeyboardInput'
import { InputManager } from './InputManager'

function fakeKeyboard(
  pressedCodes: string[] = [],
  justPressedCodes: string[] = [],
): KeyboardSource {
  const pressed = new Set(pressedCodes)
  const justPressed = new Set(justPressedCodes)
  return {
    isPressed: (code) => pressed.has(code),
    wasJustPressed: (code) => {
      if (!justPressed.has(code)) return false
      justPressed.delete(code)
      return true
    },
    reset: vi.fn(() => {
      pressed.clear()
      justPressed.clear()
    }),
    destroy: vi.fn(),
  }
}

describe('InputManager — movement', () => {
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

describe('InputManager — interaction', () => {
  it('is false when E was not just pressed', () => {
    const input = new InputManager(fakeKeyboard([], []))

    expect(input.wasInteractPressed()).toBe(false)
  })

  it('is true once when the keyboard source reports E just pressed, then false', () => {
    const input = new InputManager(fakeKeyboard([], ['KeyE']))

    expect(input.wasInteractPressed()).toBe(true)
    expect(input.wasInteractPressed()).toBe(false)
  })

  it('a tap also satisfies wasInteractPressed exactly once (mobile stub)', () => {
    const input = new InputManager(fakeKeyboard())

    input.triggerTapInteract()

    expect(input.wasInteractPressed()).toBe(true)
    expect(input.wasInteractPressed()).toBe(false)
  })

  it('reset() delegates to the keyboard source and clears a pending tap', () => {
    const keyboard = fakeKeyboard([], ['KeyE'])
    const input = new InputManager(keyboard)
    input.triggerTapInteract()

    input.reset()

    expect(keyboard.reset).toHaveBeenCalledTimes(1)
    expect(input.wasInteractPressed()).toBe(false)
  })

  it('a tap and a keyboard press in the same frame both register, across two reads', () => {
    const input = new InputManager(fakeKeyboard([], ['KeyE']))
    input.triggerTapInteract()

    // Tap is consumed first; the keyboard edge is still there on the next read.
    expect(input.wasInteractPressed()).toBe(true)
    expect(input.wasInteractPressed()).toBe(true)
    expect(input.wasInteractPressed()).toBe(false)
  })
})
