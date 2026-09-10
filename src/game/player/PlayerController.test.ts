import { describe, expect, it } from 'vitest'
import type { MovementInput, MovementVector } from '../input/InputManager'
import { CollisionSystem } from '../world/CollisionSystem'
import { Player } from './Player'
import { PlayerController } from './PlayerController'

const noInput: MovementInput = { getMovementVector: () => ({ x: 0, y: 0 }) }

function fakeInput(vector: MovementVector): MovementInput {
  return { getMovementVector: () => vector }
}

/** Generous bounds, no obstacles — movement is effectively unconstrained. */
function openSystem(): CollisionSystem {
  return new CollisionSystem(100_000, 100_000)
}

describe('PlayerController — movement/facing (open space)', () => {
  it('leaves the player idle and stationary when there is no input', () => {
    const player = new Player(noInput, openSystem(), { x: 100, y: 100 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 0, y: 0 }),
      openSystem(),
    )

    controller.update(16)

    expect(player.moving).toBe(false)
    expect(player.position.x).toBe(100)
    expect(player.position.y).toBe(100)
  })

  it('moves the player along the input vector, scaled by deltaMS', () => {
    const player = new Player(noInput, openSystem(), { x: 500, y: 500 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 1, y: 0 }),
      openSystem(),
    )

    controller.update(1000)

    expect(player.moving).toBe(true)
    expect(player.position.x).toBeGreaterThan(500)
    expect(player.position.y).toBe(500)
  })

  it('moving twice as long moves twice as far', () => {
    const playerA = new Player(noInput, openSystem(), { x: 500, y: 500 })
    new PlayerController(
      playerA,
      fakeInput({ x: 1, y: 0 }),
      openSystem(),
    ).update(100)

    const playerB = new Player(noInput, openSystem(), { x: 500, y: 500 })
    new PlayerController(
      playerB,
      fakeInput({ x: 1, y: 0 }),
      openSystem(),
    ).update(200)

    const movedA = playerA.position.x - 500
    const movedB = playerB.position.x - 500
    expect(movedB).toBeCloseTo(movedA * 2)
  })

  it('faces the dominant axis of a diagonal input', () => {
    const player = new Player(noInput, openSystem(), { x: 500, y: 500 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 0.9, y: 0.1 }),
      openSystem(),
    )

    controller.update(16)

    expect(player.direction).toBe('right')
  })

  it('keeps facing the last movement direction after stopping', () => {
    const player = new Player(noInput, openSystem(), { x: 500, y: 500 })

    new PlayerController(
      player,
      fakeInput({ x: 0, y: 1 }),
      openSystem(),
    ).update(16)
    expect(player.direction).toBe('down')

    new PlayerController(
      player,
      fakeInput({ x: 0, y: 0 }),
      openSystem(),
    ).update(16)
    expect(player.direction).toBe('down')
    expect(player.moving).toBe(false)
  })
})

describe('PlayerController — collision integration', () => {
  it('does not move the player outside the world bounds', () => {
    const smallWorld = new CollisionSystem(200, 200)
    const player = new Player(noInput, smallWorld, { x: 195, y: 100 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 1, y: 0 }),
      smallWorld,
    )

    controller.update(1000) // a huge step — would overshoot the edge

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(200)
  })

  it('stops the player at a configured blocking obstacle', () => {
    const obstacleSystem = new CollisionSystem(2000, 2000, [
      { x: 600, y: 480, width: 40, height: 40 },
    ])
    const player = new Player(noInput, obstacleSystem, { x: 500, y: 500 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 1, y: 0 }),
      obstacleSystem,
    )

    for (let i = 0; i < 30; i++) controller.update(100) // walk toward it for a while

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(600)
  })

  it('slides along an obstacle: a blocked axis does not prevent the other axis from moving', () => {
    const obstacleSystem = new CollisionSystem(2000, 2000, [
      { x: 600, y: 480, width: 200, height: 200 },
    ])
    const player = new Player(noInput, obstacleSystem, { x: 590, y: 500 })
    const controller = new PlayerController(
      player,
      fakeInput({ x: 1, y: 1 }), // diagonal, into the obstacle's left edge
      obstacleSystem,
    )
    const startY = player.position.y

    controller.update(200)

    // X should be stopped by the obstacle; Y should still have advanced.
    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(600)
    expect(player.position.y).toBeGreaterThan(startY)
  })
})
