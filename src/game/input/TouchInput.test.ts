import { describe, expect, it } from 'vitest'
import { TouchInput } from './TouchInput'

describe('TouchInput', () => {
  it('holds a direction from press until release', () => {
    const touch = new TouchInput()
    expect(touch.isHeld('up')).toBe(false)

    touch.setDirection('up', true)
    touch.setDirection('up', true) // idempotent
    expect(touch.isHeld('up')).toBe(true)
    expect(touch.isHeld('down')).toBe(false)

    touch.setDirection('up', false)
    expect(touch.isHeld('up')).toBe(false)
  })

  it('tracks several directions independently', () => {
    const touch = new TouchInput()
    touch.setDirection('up', true)
    touch.setDirection('right', true)

    touch.setDirection('up', false)

    expect(touch.isHeld('up')).toBe(false)
    expect(touch.isHeld('right')).toBe(true)
  })

  it('reports an interact press exactly once', () => {
    const touch = new TouchInput()
    expect(touch.wasInteractPressed()).toBe(false)

    touch.pressInteract()

    expect(touch.wasInteractPressed()).toBe(true)
    expect(touch.wasInteractPressed()).toBe(false)
  })

  it('reset() releases every direction and drops a pending interact press', () => {
    const touch = new TouchInput()
    touch.setDirection('left', true)
    touch.setDirection('down', true)
    touch.pressInteract()

    touch.reset()

    expect(touch.isHeld('left')).toBe(false)
    expect(touch.isHeld('down')).toBe(false)
    expect(touch.wasInteractPressed()).toBe(false)
  })
})
