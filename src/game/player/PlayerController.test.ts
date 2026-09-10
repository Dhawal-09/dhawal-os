import { describe, expect, it, vi } from 'vitest'
import { GameEventBridge } from '../events/GameEventBridge'
import type {
  InteractionInput,
  MovementInput,
  MovementVector,
} from '../input/InputManager'
import { CollisionSystem } from '../world/CollisionSystem'
import { InteractionSystem } from '../world/InteractionSystem'
import { Player } from './Player'
import type { PlayerSystems } from './PlayerController'

type FakeInput = MovementInput & InteractionInput

function fakeInput(
  vector: MovementVector = { x: 0, y: 0 },
  interactPressed = false,
): FakeInput {
  return {
    getMovementVector: () => vector,
    wasInteractPressed: () => interactPressed,
  }
}

/** Generous bounds, no obstacles — movement is effectively unconstrained. */
function openCollision(): CollisionSystem {
  return new CollisionSystem(100_000, 100_000)
}

function makeSystems(overrides: Partial<PlayerSystems> = {}): PlayerSystems {
  return {
    input: fakeInput(),
    collisionSystem: openCollision(),
    interactionSystem: new InteractionSystem(),
    eventBridge: new GameEventBridge(),
    ...overrides,
  }
}

describe('PlayerController — movement/facing (open space)', () => {
  it('leaves the player idle and stationary when there is no input', () => {
    const player = new Player(makeSystems(), { x: 100, y: 100 })

    player.controller.update(16)

    expect(player.moving).toBe(false)
    expect(player.position.x).toBe(100)
    expect(player.position.y).toBe(100)
  })

  it('moves the player along the input vector, scaled by deltaMS', () => {
    const player = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 0 }) }),
      { x: 500, y: 500 },
    )

    player.controller.update(1000)

    expect(player.moving).toBe(true)
    expect(player.position.x).toBeGreaterThan(500)
    expect(player.position.y).toBe(500)
  })

  it('moving twice as long moves twice as far', () => {
    const playerA = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 0 }) }),
      { x: 500, y: 500 },
    )
    playerA.controller.update(100)

    const playerB = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 0 }) }),
      { x: 500, y: 500 },
    )
    playerB.controller.update(200)

    const movedA = playerA.position.x - 500
    const movedB = playerB.position.x - 500
    expect(movedB).toBeCloseTo(movedA * 2)
  })

  it('faces the dominant axis of a diagonal input', () => {
    const player = new Player(
      makeSystems({ input: fakeInput({ x: 0.9, y: 0.1 }) }),
      { x: 500, y: 500 },
    )

    player.controller.update(16)

    expect(player.direction).toBe('right')
  })

  it('keeps facing the last movement direction after stopping', () => {
    let vector: MovementVector = { x: 0, y: 1 }
    const input: FakeInput = {
      getMovementVector: () => vector,
      wasInteractPressed: () => false,
    }
    const player = new Player(makeSystems({ input }), { x: 500, y: 500 })

    player.controller.update(16)
    expect(player.direction).toBe('down')

    vector = { x: 0, y: 0 }
    player.controller.update(16)

    expect(player.direction).toBe('down')
    expect(player.moving).toBe(false)
  })
})

describe('PlayerController — collision integration', () => {
  it('does not move the player outside the world bounds', () => {
    const collisionSystem = new CollisionSystem(200, 200)
    const player = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 0 }), collisionSystem }),
      { x: 195, y: 100 },
    )

    player.controller.update(1000) // a huge step — would overshoot the edge

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(200)
  })

  it('stops the player at a configured blocking obstacle', () => {
    const collisionSystem = new CollisionSystem(2000, 2000, [
      { x: 600, y: 480, width: 40, height: 40 },
    ])
    const player = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 0 }), collisionSystem }),
      { x: 500, y: 500 },
    )

    for (let i = 0; i < 30; i++) player.controller.update(100)

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(600)
  })

  it('slides along an obstacle: a blocked axis does not prevent the other axis from moving', () => {
    const collisionSystem = new CollisionSystem(2000, 2000, [
      { x: 600, y: 480, width: 200, height: 200 },
    ])
    const player = new Player(
      makeSystems({ input: fakeInput({ x: 1, y: 1 }), collisionSystem }),
      { x: 590, y: 500 },
    )
    const startY = player.position.y

    player.controller.update(200)

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(600)
    expect(player.position.y).toBeGreaterThan(startY)
  })
})

describe('PlayerController — interaction', () => {
  const nearbyProjects = new InteractionSystem([
    {
      id: 'projects',
      action: 'OPEN_PROJECTS',
      position: { x: 500, y: 500 },
      radius: 60,
    },
  ])

  it('sets no interaction target when nothing is in range', () => {
    const player = new Player(
      makeSystems({ interactionSystem: new InteractionSystem() }),
      { x: 500, y: 500 },
    )

    player.controller.update(16)

    expect(player.interactionTarget).toBeNull()
  })

  it('sets the interaction target once the player is in range, without a press', () => {
    const player = new Player(
      makeSystems({ interactionSystem: nearbyProjects }),
      { x: 500, y: 500 },
    )

    player.controller.update(16)

    expect(player.interactionTarget?.id).toBe('projects')
  })

  it('does not emit an event merely from being in range — a press is required', () => {
    const eventBridge = new GameEventBridge()
    const emit = vi.spyOn(eventBridge, 'emit')
    const player = new Player(
      makeSystems({ interactionSystem: nearbyProjects, eventBridge }),
      { x: 500, y: 500 },
    )

    player.controller.update(16)

    expect(emit).not.toHaveBeenCalled()
  })

  it('emits the configured action when pressed while in range', () => {
    const eventBridge = new GameEventBridge()
    const emit = vi.spyOn(eventBridge, 'emit')
    const player = new Player(
      makeSystems({
        interactionSystem: nearbyProjects,
        eventBridge,
        input: fakeInput({ x: 0, y: 0 }, true),
      }),
      { x: 500, y: 500 },
    )

    player.controller.update(16)

    expect(emit).toHaveBeenCalledExactlyOnceWith('OPEN_PROJECTS')
  })

  it('does not emit when pressed while out of range', () => {
    const eventBridge = new GameEventBridge()
    const emit = vi.spyOn(eventBridge, 'emit')
    const player = new Player(
      makeSystems({
        interactionSystem: nearbyProjects,
        eventBridge,
        input: fakeInput({ x: 0, y: 0 }, true),
      }),
      { x: 5000, y: 5000 }, // far away
    )

    player.controller.update(16)

    expect(emit).not.toHaveBeenCalled()
  })

  it('clears the interaction target once the player leaves range', () => {
    const player = new Player(
      makeSystems({ interactionSystem: nearbyProjects }),
      { x: 500, y: 500 },
    )
    player.controller.update(16)
    expect(player.interactionTarget).not.toBeNull()

    player.position.set(9000, 9000)
    player.controller.update(16)

    expect(player.interactionTarget).toBeNull()
  })

  it('selects the nearest of multiple in-range candidates, driven purely by configuration', () => {
    const both = new InteractionSystem([
      {
        id: 'far',
        action: 'OPEN_SKILLS',
        position: { x: 400, y: 500 },
        radius: 200,
      },
      {
        id: 'near',
        action: 'OPEN_PROJECTS',
        position: { x: 520, y: 500 },
        radius: 200,
      },
    ])
    const player = new Player(makeSystems({ interactionSystem: both }), {
      x: 500,
      y: 500,
    })

    player.controller.update(16)

    expect(player.interactionTarget?.id).toBe('near')
  })
})
