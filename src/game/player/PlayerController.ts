import type { MovementInput } from '../input/InputManager'
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
 * Movement algorithm per PLAYER_SPEC.md: input -> desired velocity ->
 * candidate position -> [collision test, Phase 06] -> apply final position.
 * Phase 05 has no collision system yet, so the candidate position is applied
 * directly — Phase 06 inserts a resolution step here without this class's
 * public shape changing.
 */
export class PlayerController {
  private readonly player: Player
  private readonly input: MovementInput

  constructor(player: Player, input: MovementInput) {
    this.player = player
    this.input = input
  }

  update(deltaMS: number): void {
    const { x, y } = this.input.getMovementVector()
    const moving = x !== 0 || y !== 0

    this.player.moving = moving
    this.player.direction = directionFromVector(x, y, this.player.direction)

    if (!moving) return

    const deltaSeconds = deltaMS / 1000
    this.player.position.x += x * SPEED_PER_SECOND * deltaSeconds
    this.player.position.y += y * SPEED_PER_SECOND * deltaSeconds
  }
}
