import { describe, expect, it } from 'vitest'
import type { MovementInput, MovementVector } from '../input/InputManager'
import { Player } from './Player'

class MutableInput implements MovementInput {
  vector: MovementVector = { x: 0, y: 0 }
  getMovementVector(): MovementVector {
    return this.vector
  }
}

describe('Player', () => {
  it('is a labeled display object with a visible placeholder body', () => {
    const player = new Player(new MutableInput(), { x: 50, y: 60 })

    expect(player.label).toBe('Player')
    expect(player.position.x).toBe(50)
    expect(player.position.y).toBe(60)
    expect(player.children.length).toBeGreaterThan(0)
  })

  it('starts idle, facing down', () => {
    const player = new Player(new MutableInput())

    expect(player.moving).toBe(false)
    expect(player.direction).toBe('down')
    expect(player.animator.state).toBe('IDLE_DOWN')
  })

  it('moves and updates facing/animation state through repeated update() calls, driven by input alone', () => {
    const input = new MutableInput()
    const player = new Player(input, { x: 0, y: 0 })

    input.vector = { x: 1, y: 0 } // hold "right"
    player.update(16)
    player.update(16)
    player.update(16)

    expect(player.moving).toBe(true)
    expect(player.direction).toBe('right')
    expect(player.animator.state).toBe('WALK_RIGHT')
    expect(player.position.x).toBeGreaterThan(0)

    input.vector = { x: 0, y: 0 } // release
    player.update(16)

    expect(player.moving).toBe(false)
    expect(player.animator.state).toBe('IDLE_RIGHT')
  })
})
