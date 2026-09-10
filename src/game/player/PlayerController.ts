import type { GameEventBridge } from '../events/GameEventBridge'
import type { InteractionInput, MovementInput } from '../input/InputManager'
import type { CollisionSystem } from '../world/CollisionSystem'
import type { InteractionSystem } from '../world/InteractionSystem'
import type { Direction } from './PlayerAnimator'
import type { Player } from './Player'

/** Placeholder tuning value — canonical world units per second. */
const SPEED_PER_SECOND = 220

/**
 * Everything PlayerController needs to drive the player, grouped to keep
 * Player's/PlayerController's constructors from growing an unwieldy
 * positional-argument list as Phase 06/07 each add one more system.
 */
export interface PlayerSystems {
  input: MovementInput & InteractionInput
  collisionSystem: CollisionSystem
  interactionSystem: InteractionSystem
  eventBridge: GameEventBridge
}

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
 * in CollisionSystem; interaction eligibility lives entirely in
 * InteractionSystem (INTERACTION_SPEC.md "Responsibility split") — this
 * class only reads their results and, on a press while a target is in
 * range, emits the configured action through the event bridge. It never
 * decides what React displays.
 */
export class PlayerController {
  private readonly player: Player
  private readonly systems: PlayerSystems

  constructor(player: Player, systems: PlayerSystems) {
    this.player = player
    this.systems = systems
  }

  update(deltaMS: number): void {
    const { x, y } = this.systems.input.getMovementVector()
    const moving = x !== 0 || y !== 0

    this.player.moving = moving
    this.player.direction = directionFromVector(x, y, this.player.direction)

    if (moving) {
      this.applyMovement(x, y, deltaMS)
    }

    // Always consume the edge-triggered signal, whether or not a target is
    // in range — otherwise a press made outside range could incorrectly
    // "carry over" and fire once the player wanders into range later.
    const interactPressed = this.systems.input.wasInteractPressed()

    const target = this.systems.interactionSystem.findNearestInRange(
      this.player.position,
    )
    this.player.interactionTarget = target

    if (target && interactPressed) {
      this.systems.eventBridge.emit(target.action)
    }
  }

  private applyMovement(x: number, y: number, deltaMS: number): void {
    const deltaSeconds = deltaMS / 1000
    const dx = x * SPEED_PER_SECOND * deltaSeconds
    const dy = y * SPEED_PER_SECOND * deltaSeconds

    const currentRect = this.player.collisionBody.getRect(
      this.player.position.x,
      this.player.position.y,
    )
    const resolvedRect = this.systems.collisionSystem.resolveMovement(
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
