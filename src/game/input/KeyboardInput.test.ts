import { afterEach, describe, expect, it } from 'vitest'
import { KeyboardInput } from './KeyboardInput'

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }))
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }))
}

describe('KeyboardInput', () => {
  let input: KeyboardInput | null = null

  afterEach(() => {
    input?.destroy()
    input = null
  })

  it('tracks a tracked key as pressed on keydown and released on keyup', () => {
    input = new KeyboardInput()

    expect(input.isPressed('KeyW')).toBe(false)

    press('KeyW')
    expect(input.isPressed('KeyW')).toBe(true)

    release('KeyW')
    expect(input.isPressed('KeyW')).toBe(false)
  })

  it('ignores untracked keys', () => {
    input = new KeyboardInput()

    press('KeyQ')

    expect(input.isPressed('KeyQ')).toBe(false)
  })

  it('clears all held keys on window blur, to avoid a stuck-key walk after alt-tab', () => {
    input = new KeyboardInput()

    press('KeyW')
    press('KeyD')
    window.dispatchEvent(new Event('blur'))

    expect(input.isPressed('KeyW')).toBe(false)
    expect(input.isPressed('KeyD')).toBe(false)
  })

  it('stops responding to key events after destroy', () => {
    input = new KeyboardInput()
    input.destroy()

    press('KeyW')

    expect(input.isPressed('KeyW')).toBe(false)
  })

  it('wasJustPressed is true exactly once per physical press, then false until released and pressed again', () => {
    input = new KeyboardInput()

    expect(input.wasJustPressed('KeyE')).toBe(false)

    press('KeyE')
    expect(input.wasJustPressed('KeyE')).toBe(true)
    expect(input.wasJustPressed('KeyE')).toBe(false) // consumed

    release('KeyE')
    press('KeyE')
    expect(input.wasJustPressed('KeyE')).toBe(true)
  })

  it('does not re-trigger wasJustPressed from OS key-repeat keydowns while still held', () => {
    input = new KeyboardInput()

    press('KeyE')
    press('KeyE') // simulated repeat keydown, no keyup in between
    press('KeyE')

    expect(input.wasJustPressed('KeyE')).toBe(true)
    expect(input.wasJustPressed('KeyE')).toBe(false)
  })

  it('reset() clears held and pending key state without removing listeners', () => {
    input = new KeyboardInput()
    press('KeyW')
    press('KeyE')

    input.reset()

    expect(input.isPressed('KeyW')).toBe(false)
    expect(input.wasJustPressed('KeyE')).toBe(false)

    // Listeners are still attached — a fresh press still registers.
    press('KeyD')
    expect(input.isPressed('KeyD')).toBe(true)
  })

  it('clears the pending just-pressed flag on window blur', () => {
    input = new KeyboardInput()

    press('KeyE')
    window.dispatchEvent(new Event('blur'))

    expect(input.wasJustPressed('KeyE')).toBe(false)
  })
})
