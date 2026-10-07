import { describe, expect, it, vi } from 'vitest'
import type { KeyboardSource } from './KeyboardInput'
import { InputManager } from './InputManager'
import { TouchInput } from './TouchInput'

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

describe('InputManager — on-screen (touch) controls', () => {
  it('a fully pushed stick produces the same vector as the matching key', () => {
    const cases = [
      [0, -1, 'KeyW'],
      [0, 1, 'KeyS'],
      [-1, 0, 'KeyA'],
      [1, 0, 'KeyD'],
    ] as const

    for (const [x, y, code] of cases) {
      const touch = new TouchInput()
      touch.setMovement(x, y)

      expect(
        new InputManager(fakeKeyboard(), touch).getMovementVector(),
      ).toEqual(
        new InputManager(
          fakeKeyboard([code]),
          new TouchInput(),
        ).getMovementVector(),
      )
    }
  })

  it('keeps the stick analog — a half push is half strength, at the exact angle held', () => {
    const touch = new TouchInput()
    const input = new InputManager(fakeKeyboard(), touch)

    touch.setMovement(0.3, -0.4)

    expect(input.getMovementVector()).toEqual({ x: 0.3, y: -0.4 })
  })

  it('is zero again once the stick is released', () => {
    const touch = new TouchInput()
    const input = new InputManager(fakeKeyboard(), touch)
    touch.setMovement(0, -1)
    expect(input.getMovementVector()).toEqual({ x: 0, y: -1 })

    touch.setMovement(0, 0)

    expect(input.getMovementVector()).toEqual({ x: 0, y: 0 })
  })

  it('passes the frame delta through, so the stick eases in during the game loop', () => {
    const touch = new TouchInput()
    const input = new InputManager(fakeKeyboard(), touch)
    touch.setMovement(1, 0)

    const first = input.getMovementVector(16).x
    const second = input.getMovementVector(16).x

    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(1)
    expect(second).toBeGreaterThan(first)
  })

  it('leaves keyboard movement untouched — instant and full strength — when the stick is at rest', () => {
    const input = new InputManager(fakeKeyboard(['KeyA']), new TouchInput())

    expect(input.getMovementVector(16)).toEqual({ x: -1, y: 0 })
  })

  it('a key and the stick together never exceed full speed', () => {
    const touch = new TouchInput()
    touch.setMovement(1, 0)
    const { x, y } = new InputManager(
      fakeKeyboard(['KeyD']),
      touch,
    ).getMovementVector()

    expect(Math.hypot(x, y)).toBeCloseTo(1)
    expect(x).toBeCloseTo(1)
  })

  it('the on-screen interact button satisfies wasInteractPressed exactly once', () => {
    const touch = new TouchInput()
    const input = new InputManager(fakeKeyboard(), touch)

    touch.pressInteract()

    expect(input.wasInteractPressed()).toBe(true)
    expect(input.wasInteractPressed()).toBe(false)
  })

  it('reset() and destroy() release the stick and a pending interact press', () => {
    const touch = new TouchInput()
    const input = new InputManager(fakeKeyboard(), touch)
    touch.setMovement(0, 1)
    touch.pressInteract()

    input.reset()

    expect(input.getMovementVector()).toEqual({ x: 0, y: 0 })
    expect(input.wasInteractPressed()).toBe(false)

    touch.setMovement(-1, 0)
    input.destroy()

    expect(touch.getMovementVector()).toEqual({ x: 0, y: 0 })
  })
})
