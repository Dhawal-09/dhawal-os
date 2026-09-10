import { describe, expect, it } from 'vitest'
import type { MovementInput, MovementVector } from '../input/InputManager'
import { Player } from './Player'
import { PlayerController } from './PlayerController'

const noInput: MovementInput = { getMovementVector: () => ({ x: 0, y: 0 }) }

function fakeInput(vector: MovementVector): MovementInput {
  return { getMovementVector: () => vector }
}

describe('PlayerController', () => {
  it('leaves the player idle and stationary when there is no input', () => {
    const player = new Player(noInput, { x: 100, y: 100 })
    const controller = new PlayerController(player, fakeInput({ x: 0, y: 0 }))

    controller.update(16)

    expect(player.moving).toBe(false)
    expect(player.position.x).toBe(100)
    expect(player.position.y).toBe(100)
  })

  it('moves the player along the input vector, scaled by deltaMS', () => {
    const player = new Player(noInput, { x: 0, y: 0 })
    const controller = new PlayerController(player, fakeInput({ x: 1, y: 0 }))

    controller.update(1000)

    expect(player.moving).toBe(true)
    expect(player.position.x).toBeGreaterThan(0)
    expect(player.position.y).toBe(0)
  })

  it('moving twice as long moves twice as far', () => {
    const playerA = new Player(noInput, { x: 0, y: 0 })
    new PlayerController(playerA, fakeInput({ x: 1, y: 0 })).update(100)

    const playerB = new Player(noInput, { x: 0, y: 0 })
    new PlayerController(playerB, fakeInput({ x: 1, y: 0 })).update(200)

    expect(playerB.position.x).toBeCloseTo(playerA.position.x * 2)
  })

  it('faces the dominant axis of a diagonal input', () => {
    const player = new Player(noInput, { x: 0, y: 0 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 0.9, y: 0.1 }),
    )

    controller.update(16)

    expect(player.direction).toBe('right')
  })

  it('keeps facing the last movement direction after stopping', () => {
    const player = new Player(noInput, { x: 0, y: 0 })

    new PlayerController(player, fakeInput({ x: 0, y: 1 })).update(16)
    expect(player.direction).toBe('down')

    new PlayerController(player, fakeInput({ x: 0, y: 0 })).update(16)
    expect(player.direction).toBe('down')
    expect(player.moving).toBe(false)
  })
})
