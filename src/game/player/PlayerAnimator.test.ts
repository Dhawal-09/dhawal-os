import { describe, expect, it } from 'vitest'
import { PlayerAnimator, toAnimationState } from './PlayerAnimator'

describe('toAnimationState', () => {
  it('maps every direction/moving combination to the 8 documented states', () => {
    expect(toAnimationState('down', false)).toBe('IDLE_DOWN')
    expect(toAnimationState('up', false)).toBe('IDLE_UP')
    expect(toAnimationState('left', false)).toBe('IDLE_LEFT')
    expect(toAnimationState('right', false)).toBe('IDLE_RIGHT')
    expect(toAnimationState('down', true)).toBe('WALK_DOWN')
    expect(toAnimationState('up', true)).toBe('WALK_UP')
    expect(toAnimationState('left', true)).toBe('WALK_LEFT')
    expect(toAnimationState('right', true)).toBe('WALK_RIGHT')
  })
})

describe('PlayerAnimator', () => {
  it('starts idle-down', () => {
    const animator = new PlayerAnimator()

    expect(animator.state).toBe('IDLE_DOWN')
    expect(animator.frameIndex).toBe(0)
  })

  it('transitions idle -> walk and walk -> idle as `moving` changes, per direction', () => {
    const animator = new PlayerAnimator()

    animator.update('right', true, 0)
    expect(animator.state).toBe('WALK_RIGHT')

    animator.update('right', false, 0)
    expect(animator.state).toBe('IDLE_RIGHT')

    animator.update('up', true, 0)
    expect(animator.state).toBe('WALK_UP')
  })

  it('holds frame 0 while idle, regardless of elapsed time', () => {
    const animator = new PlayerAnimator({
      frameWidth: 32,
      frameHeight: 32,
      framesPerState: 4,
      frameDurationMs: 100,
    })

    animator.update('down', false, 1000)

    expect(animator.frameIndex).toBe(0)
  })

  it('advances the frame index over time while walking, at the configured rate', () => {
    const animator = new PlayerAnimator({
      frameWidth: 32,
      frameHeight: 32,
      framesPerState: 4,
      frameDurationMs: 100,
    })

    animator.update('down', true, 0)
    expect(animator.frameIndex).toBe(0)

    animator.update('down', true, 100)
    expect(animator.frameIndex).toBe(1)

    animator.update('down', true, 250) // total elapsed 350ms -> frame 3
    expect(animator.frameIndex).toBe(3)

    animator.update('down', true, 100) // total elapsed 450ms -> frame 4 % 4 = 0
    expect(animator.frameIndex).toBe(0)
  })

  it('resets frame timing when the animation state changes (e.g. direction switch mid-walk)', () => {
    const animator = new PlayerAnimator({
      frameWidth: 32,
      frameHeight: 32,
      framesPerState: 4,
      frameDurationMs: 100,
    })

    animator.update('down', true, 250)
    expect(animator.frameIndex).toBe(2)

    animator.update('left', true, 0)
    expect(animator.state).toBe('WALK_LEFT')
    expect(animator.frameIndex).toBe(0)
  })
})
