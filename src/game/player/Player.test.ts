import { describe, expect, it, vi } from 'vitest'
import { GameEventBridge } from '../events/GameEventBridge'
import type {
  InteractionInput,
  MovementInput,
  MovementVector,
} from '../input/InputManager'
import { CollisionSystem } from '../world/CollisionSystem'
import { InteractionSystem } from '../world/InteractionSystem'
import { CollisionBody } from './CollisionBody'
import { Player } from './Player'
import type { PlayerSystems } from './PlayerController'

class MutableInput implements MovementInput, InteractionInput {
  vector: MovementVector = { x: 0, y: 0 }
  interactPressed = false

  getMovementVector(): MovementVector {
    return this.vector
  }

  wasInteractPressed(): boolean {
    const pressed = this.interactPressed
    this.interactPressed = false
    return pressed
  }
}

function openCollision(): CollisionSystem {
  return new CollisionSystem(100_000, 100_000)
}

function makeSystems(overrides: Partial<PlayerSystems> = {}): PlayerSystems {
  return {
    input: new MutableInput(),
    collisionSystem: openCollision(),
    interactionSystem: new InteractionSystem(),
    eventBridge: new GameEventBridge(),
    ...overrides,
  }
}

describe('Player', () => {
  it('is a labeled display object with a visible placeholder body', () => {
    const player = new Player(makeSystems(), { x: 50, y: 60 })

    expect(player.label).toBe('Player')
    expect(player.position.x).toBe(50)
    expect(player.position.y).toBe(60)
    expect(player.children.length).toBeGreaterThan(0)
  })

  it('starts idle, facing down, with no interaction target', () => {
    const player = new Player(makeSystems())

    expect(player.moving).toBe(false)
    expect(player.direction).toBe('down')
    expect(player.animator.state).toBe('IDLE_DOWN')
    expect(player.interactionTarget).toBeNull()
  })

  it('owns a CollisionBody representing the feet, not the full sprite', () => {
    const player = new Player(makeSystems())

    expect(player.collisionBody).toBeInstanceOf(CollisionBody)
  })

  it('moves and updates facing/animation state through repeated update() calls, driven by input alone', () => {
    const input = new MutableInput()
    const player = new Player(makeSystems({ input }), { x: 0, y: 0 })

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
    const collisionSystem = new CollisionSystem(2000, 2000, [
      { x: 520, y: 480, width: 200, height: 200 },
    ])
    const input = new MutableInput()
    const player = new Player(makeSystems({ input, collisionSystem }), {
      x: 500,
      y: 500,
    })

    input.vector = { x: 1, y: 0 } // hold "right", straight into the obstacle
    for (let i = 0; i < 20; i++) player.update(100)

    const rect = player.collisionBody.getRect(
      player.position.x,
      player.position.y,
    )
    expect(rect.x + rect.width).toBeLessThanOrEqual(520)
  })

  it('picks up an interaction target from the InteractionSystem it was given, end to end', () => {
    const interactionSystem = new InteractionSystem([
      {
        id: 'projects',
        action: 'OPEN_PROJECTS',
        position: { x: 500, y: 500 },
        radius: 50,
      },
    ])
    const player = new Player(makeSystems({ interactionSystem }), {
      x: 500,
      y: 500,
    })

    player.update(16)

    expect(player.interactionTarget?.id).toBe('projects')
  })

  it('emits the configured action on the given bridge when the interact key is pressed in range', () => {
    const interactionSystem = new InteractionSystem([
      {
        id: 'projects',
        action: 'OPEN_PROJECTS',
        position: { x: 500, y: 500 },
        radius: 50,
      },
    ])
    const eventBridge = new GameEventBridge()
    const emit = vi.spyOn(eventBridge, 'emit')
    const input = new MutableInput()
    const player = new Player(
      makeSystems({ input, interactionSystem, eventBridge }),
      { x: 500, y: 500 },
    )

    input.interactPressed = true
    player.update(16)

    expect(emit).toHaveBeenCalledExactlyOnceWith('OPEN_PROJECTS')
  })
})
