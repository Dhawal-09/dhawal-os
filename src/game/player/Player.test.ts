import { describe, expect, it } from 'vitest'
import type { MovementInput, MovementVector } from '../input/InputManager'
import { CollisionSystem } from '../world/CollisionSystem'
import { CollisionBody } from './CollisionBody'
import { Player } from './Player'

class MutableInput implements MovementInput {
  vector: MovementVector = { x: 0, y: 0 }
  getMovementVector(): MovementVector {
    return this.vector
  }
}

function openSystem(): CollisionSystem {
  return new CollisionSystem(100_000, 100_000)
}

describe('Player', () => {
  it('is a labeled display object with a visible placeholder body', () => {
    const player = new Player(new MutableInput(), openSystem(), {
      x: 50,
      y: 60,
    })

    expect(player.label).toBe('Player')
    expect(player.position.x).toBe(50)
    expect(player.position.y).toBe(60)
    expect(player.children.length).toBeGreaterThan(0)
  })

  it('starts idle, facing down', () => {
    const player = new Player(new MutableInput(), openSystem())

    expect(player.moving).toBe(false)
    expect(player.direction).toBe('down')
    expect(player.animator.state).toBe('IDLE_DOWN')
  })

  it('owns a CollisionBody representing the feet, not the full sprite', () => {
    const player = new Player(new MutableInput(), openSystem())

    expect(player.collisionBody).toBeInstanceOf(CollisionBody)
  })

  it('moves and updates facing/animation state through repeated update() calls, driven by input alone', () => {
    const input = new MutableInput()
    const player = new Player(input, openSystem(), { x: 0, y: 0 })

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

  it('movement is constrained by the CollisionSystem it was given — not free-floating', () => {
    const blockedSystem = new CollisionSystem(2000, 2000, [
      { x: 520, y: 480, width: 200, height: 200 },
    ])
    const input = new MutableInput()
    const player = new Player(input, blockedSystem, { x: 500, y: 500 })

    input.vector = { x: 1, y: 0 } // hold "right", straight into the obstacle
    for (let i = 0; i < 20; i++) player.update(100)

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(520)
  })
})
