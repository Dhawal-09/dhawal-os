import { describe, expect, it } from 'vitest'
import { GameEventBridge } from '../events/GameEventBridge'
import { InputManager } from '../input/InputManager'
import type { KeyboardSource } from '../input/KeyboardInput'
import {
  CollisionSystem,
  rectsOverlap,
  type Rect,
} from '../world/CollisionSystem'
import { InteractionSystem } from '../world/InteractionSystem'
import { WORLD_HEIGHT, WORLD_WIDTH } from '../world/worldConstants'
import { EXTRA_COLLIDERS, worldObjects } from '../world/worldObjects'
import { Player } from './Player'
import {
  PLAYER_SPAWN_POSITION,
  PLAYER_SPEED_PER_SECOND,
} from './playerConstants'
import type { PlayerSystems } from './PlayerController'

class FakeKeyboard implements KeyboardSource {
  readonly held = new Set<string>()
  isPressed(code: string): boolean {
    return this.held.has(code)
  }
  wasJustPressed(): boolean {
    return false
  }
  reset(): void {
    this.held.clear()
  }
  destroy(): void {}
}

/** Every solid rect the real game resolves against — exactly what GameScene builds its CollisionSystem from. */
const realObstacles: Rect[] = [
  ...EXTRA_COLLIDERS,
  ...worldObjects.flatMap((object) =>
    object.collision ? [object.collision] : [],
  ),
]

function realWorldCollision(): CollisionSystem {
  return CollisionSystem.fromWorldObjects(
    worldObjects,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    EXTRA_COLLIDERS,
  )
}

function makePlayer(
  keyboard: KeyboardSource,
  collisionSystem: CollisionSystem,
  at: { x: number; y: number },
): Player {
  const systems: PlayerSystems = {
    input: new InputManager(keyboard),
    collisionSystem,
    interactionSystem: new InteractionSystem(),
    eventBridge: new GameEventBridge(),
  }
  return new Player(systems, at)
}

const feetRect = (player: Player): Rect =>
  player.collisionBody.getRect(player.position.x, player.position.y)

describe('player spawn', () => {
  it('is on open floor: the feet box overlaps no wall or furniture collider', () => {
    const rect = feetRect(
      new Player({} as PlayerSystems, { ...PLAYER_SPAWN_POSITION }),
    )

    for (const obstacle of realObstacles) {
      expect(rectsOverlap(rect, obstacle)).toBe(false)
    }
  })

  it('has room to move: nothing solid within 60px of the feet box on any side', () => {
    const rect = feetRect(
      new Player({} as PlayerSystems, { ...PLAYER_SPAWN_POSITION }),
    )
    const padded: Rect = {
      x: rect.x - 60,
      y: rect.y - 60,
      width: rect.width + 120,
      height: rect.height + 120,
    }

    for (const obstacle of realObstacles) {
      expect(rectsOverlap(padded, obstacle)).toBe(false)
    }
  })
})

describe('player movement in the real world', () => {
  const directions: Record<string, string[]> = {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    'up-right': ['KeyW', 'KeyD'],
    'up-left': ['ArrowUp', 'ArrowLeft'],
    'down-right': ['ArrowDown', 'ArrowRight'],
    'down-left': ['KeyS', 'KeyA'],
  }

  for (const [name, keys] of Object.entries(directions)) {
    it(`walking ${name} for 12s from spawn never enters a wall, furniture collider, or leaves the world`, () => {
      const keyboard = new FakeKeyboard()
      keys.forEach((key) => keyboard.held.add(key))
      const player = makePlayer(keyboard, realWorldCollision(), {
        ...PLAYER_SPAWN_POSITION,
      })

      for (let frame = 0; frame < 60 * 12; frame++) {
        player.update(1000 / 60)
        const rect = feetRect(player)

        expect(rect.x).toBeGreaterThanOrEqual(0)
        expect(rect.y).toBeGreaterThanOrEqual(0)
        expect(rect.x + rect.width).toBeLessThanOrEqual(WORLD_WIDTH)
        expect(rect.y + rect.height).toBeLessThanOrEqual(WORLD_HEIGHT)
        for (const obstacle of realObstacles) {
          expect(rectsOverlap(rect, obstacle)).toBe(false)
        }
      }
    })
  }

  it('a diagonal is exactly as fast as a cardinal move — never faster', () => {
    const open = new CollisionSystem(100_000, 100_000)
    const start = { x: 50_000, y: 50_000 }

    const straight = new FakeKeyboard()
    straight.held.add('KeyD')
    const a = makePlayer(straight, open, start)

    const diagonal = new FakeKeyboard()
    diagonal.held.add('KeyD').add('KeyW')
    const b = makePlayer(diagonal, open, start)

    for (let frame = 0; frame < 60; frame++) {
      a.update(1000 / 60)
      b.update(1000 / 60)
    }

    const straightDistance = Math.hypot(
      a.position.x - start.x,
      a.position.y - start.y,
    )
    const diagonalDistance = Math.hypot(
      b.position.x - start.x,
      b.position.y - start.y,
    )
    expect(diagonalDistance).toBeCloseTo(straightDistance, 6)
    expect(straightDistance).toBeCloseTo(PLAYER_SPEED_PER_SECOND, 3)
  })

  it('covers the same distance per second at any frame rate (delta-time based)', () => {
    const open = new CollisionSystem(100_000, 100_000)
    const start = { x: 50_000, y: 50_000 }

    const at = (fps: number): number => {
      const keyboard = new FakeKeyboard()
      keyboard.held.add('KeyD')
      const player = makePlayer(keyboard, open, start)
      for (let frame = 0; frame < fps; frame++) player.update(1000 / fps)
      return player.position.x - start.x
    }

    expect(at(30)).toBeCloseTo(at(144), 3)
    expect(at(60)).toBeCloseTo(PLAYER_SPEED_PER_SECOND, 3)
  })

  it('stops when the keys are released and keeps its facing', () => {
    const keyboard = new FakeKeyboard()
    const player = makePlayer(keyboard, new CollisionSystem(100_000, 100_000), {
      x: 500,
      y: 500,
    })

    keyboard.held.add('KeyA')
    player.update(100)
    keyboard.held.clear()
    const stoppedAt = player.position.x
    player.update(100)
    player.update(100)

    expect(player.position.x).toBe(stoppedAt)
    expect(player.moving).toBe(false)
    expect(player.direction).toBe('left')
    expect(player.animator.state).toBe('IDLE_LEFT')
  })

  it('slides along a wall instead of sticking when moving diagonally into it', () => {
    const wall: Rect = { x: 520, y: 0, width: 40, height: 2000 }
    const keyboard = new FakeKeyboard()
    keyboard.held.add('KeyD').add('KeyS')
    const player = makePlayer(
      keyboard,
      new CollisionSystem(2000, 2000, [wall]),
      { x: 500, y: 500 },
    )

    for (let frame = 0; frame < 30; frame++) player.update(1000 / 60)

    const rect = feetRect(player)
    expect(rect.x + rect.width).toBeLessThanOrEqual(wall.x) // never through the wall
    expect(player.position.y).toBeGreaterThan(500 + 50) // kept sliding down it
  })
})
