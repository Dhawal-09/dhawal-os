import type { MovementInput } from '../input/InputManager'
import type { CollisionSystem } from '../world/CollisionSystem'
import type { Direction } from './PlayerAnimator'
import type { Player } from './Player'

/** Placeholder tuning value — canonical world units per second. */
const SPEED_PER_SECOND = 220

function directionFromVector(
  x: number,
  y: number,
  fallback: Direction,
): Direction {
  if (x === 0 && y === 0) return fallback
  // 4-direction sprite: the dominant axis wins on a diagonal input.
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left'
  return y > 0 ? 'down' : 'up'
}

/**
 * Movement algorithm per PLAYER_SPEC.md / COLLISION_SPEC.md: input ->
 * desired velocity -> candidate position -> collision test -> resolve X ->
 * resolve Y -> apply final position. Collision logic itself lives entirely
 * in CollisionSystem — this class only feeds it the player's current
 * collider rect and desired delta, and applies the resolved result back.
 */
export class PlayerController {
  private readonly player: Player
  private readonly input: MovementInput
  private readonly collisionSystem: CollisionSystem

  constructor(
    player: Player,
    input: MovementInput,
    collisionSystem: CollisionSystem,
  ) {
    this.player = player
    this.input = input
    this.collisionSystem = collisionSystem
  }

  update(deltaMS: number): void {
    const { x, y } = this.input.getMovementVector()
    const moving = x !== 0 || y !== 0

    this.player.moving = moving
    this.player.direction = directionFromVector(x, y, this.player.direction)

    if (!moving) return

    const deltaSeconds = deltaMS / 1000
    const dx = x * SPEED_PER_SECOND * deltaSeconds
    const dy = y * SPEED_PER_SECOND * deltaSeconds

    const currentRect = this.player.collisionBody.getRect(
      this.player.position.x,
      this.player.position.y,
    )
    const resolvedRect = this.collisionSystem.resolveMovement(
      currentRect,
      dx,
      dy,
    )
    const origin = this.player.collisionBody.toOrigin(
      resolvedRect.x,
      resolvedRect.y,
    )

    this.player.position.set(origin.x, origin.y)
  }
}
