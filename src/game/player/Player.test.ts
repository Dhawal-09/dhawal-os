import { Texture, TextureSource, type Sprite } from 'pixi.js'
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
import {
  createPlayerFrames,
  IDLE_FRAME_INDEX,
  type PlayerFrames,
} from './playerAnimations'
import { PLAYER_SPRITE_HEIGHT } from './playerConstants'
import type { Direction } from './PlayerAnimator'
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

function makeFrames(): PlayerFrames {
  const sheets = {} as Record<Direction, Texture>
  for (const direction of ['up', 'down', 'left', 'right'] as const) {
    sheets[direction] = new Texture({
      source: new TextureSource({ width: 2048, height: 1152 }),
    })
  }
  return createPlayerFrames(sheets)
}

describe('Player with the character sprite', () => {
  function spriteOf(player: Player): Sprite {
    return player.children.find(
      (child) => child.label === 'PlayerSprite',
    ) as Sprite
  }

  it('shows the character sprite instead of the placeholder circle, feet on the collider bottom', () => {
    const player = new Player(makeSystems(), { frames: makeFrames() })
    const sprite = spriteOf(player)

    expect(sprite).toBeDefined()
    expect(sprite.anchor.x).toBe(0.5)
    expect(sprite.anchor.y).toBeCloseTo(1105 / 1152)
    // Feet sit exactly on the bottom edge of the feet-sized collider.
    const collider = player.collisionBody.getRect(0, 0)
    expect(sprite.y).toBe(collider.y + collider.height)
    expect(sprite.height).toBeGreaterThan(PLAYER_SPRITE_HEIGHT)
  })

  it('the collider stays a small feet box — much smaller than the visible character', () => {
    const player = new Player(makeSystems(), { frames: makeFrames() })
    const collider = player.collisionBody.getRect(0, 0)

    expect(collider.height).toBeLessThan(PLAYER_SPRITE_HEIGHT / 4)
    expect(collider.width).toBeLessThan(spriteOf(player).width / 2)
  })

  it('stands on the idle frame of its facing direction, and cycles frame 0→1→2→3 while walking', () => {
    const frames = makeFrames()
    const input = new MutableInput()
    const player = new Player(makeSystems({ input }), { frames })
    const sprite = spriteOf(player)

    expect(sprite.texture).toBe(frames.down[IDLE_FRAME_INDEX.down])

    input.vector = { x: 1, y: 0 }
    const seen: number[] = []
    for (let i = 0; i < 40; i++) {
      player.update(1000 / 60)
      const index = frames.right.indexOf(sprite.texture)
      if (seen.at(-1) !== index) seen.push(index)
    }
    expect(seen.slice(0, 5)).toEqual([0, 1, 2, 3, 0])

    input.vector = { x: 0, y: 0 }
    player.update(16)
    expect(sprite.texture).toBe(frames.right[IDLE_FRAME_INDEX.right])
  })

  it('switches to the new direction’s sheet immediately when the direction changes', () => {
    const frames = makeFrames()
    const input = new MutableInput()
    const player = new Player(makeSystems({ input }), { frames })
    const sprite = spriteOf(player)

    input.vector = { x: 1, y: 0 }
    player.update(16)
    expect(frames.right).toContain(sprite.texture)

    input.vector = { x: 0, y: -1 }
    player.update(16)
    expect(frames.up).toContain(sprite.texture)
    expect(player.animator.state).toBe('WALK_UP')

    input.vector = { x: -1, y: 0 }
    player.update(16)
    expect(frames.left).toContain(sprite.texture)
  })

  it('a diagonal uses the dominant axis’ sheet — there are no diagonal sprites', () => {
    const frames = makeFrames()
    const input = new MutableInput()
    const player = new Player(makeSystems({ input }), { frames })

    input.vector = { x: 0.8, y: -0.6 } // mostly right, a little up
    player.update(16)

    expect(player.direction).toBe('right')
    expect(frames.right).toContain(spriteOf(player).texture)
  })

  it('setFrames upgrades a placeholder player in place — once', () => {
    const player = new Player(makeSystems())
    expect(spriteOf(player)).toBeUndefined()

    const frames = makeFrames()
    player.setFrames(frames)
    player.setFrames(frames)

    expect(
      player.children.filter((child) => child.label === 'PlayerSprite'),
    ).toHaveLength(1)
  })

  it('does not draw the dev collider outline unless explicitly asked to', () => {
    const player = new Player(makeSystems(), { frames: makeFrames() })

    // sprite + placeholder graphics + prompt — no extra debug Graphics.
    expect(player.children).toHaveLength(4)
  })

  it('destroying the player leaves the shared character textures intact', () => {
    const frames = makeFrames()
    const player = new Player(makeSystems(), { frames })

    player.destroy({ children: true, texture: true, textureSource: true })

    expect(frames.down[0].destroyed).toBe(false)
    expect(frames.down[0].source.destroyed).toBe(false)
  })
})

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
