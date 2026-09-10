import { Container, Graphics } from 'pixi.js'
import type { MovementInput } from '../input/InputManager'
import { PlayerAnimator, type Direction } from './PlayerAnimator'
import { PlayerController } from './PlayerController'

const BODY_RADIUS = 14
const FACING_LENGTH = 18

const FACING_OFFSETS: Record<Direction, readonly [number, number]> = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
}

export interface PlayerOptions {
  x?: number
  y?: number
}

/**
 * The player entity (see PLAYER_SPEC.md "Architecture": Player owns
 * PlayerController + PlayerAnimator; CollisionBody is Phase 06 — not
 * present yet). Renders an explicit dev placeholder — a tinted circle plus
 * a facing indicator — never a temporary filename. Swapping in the approved
 * sprite sheet later only touches `redraw()` below; movement, state, and
 * input are untouched.
 */
export class Player extends Container {
  readonly controller: PlayerController
  readonly animator = new PlayerAnimator()

  direction: Direction = 'down'
  moving = false

  private readonly body = new Graphics()
  private readonly facing = new Graphics()

  constructor(input: MovementInput, options: PlayerOptions = {}) {
    super({ label: 'Player' })
    this.position.set(options.x ?? 0, options.y ?? 0)

    this.addChild(this.body, this.facing)
    this.controller = new PlayerController(this, input)

    this.redraw()
  }

  /** Advances input-driven movement, animation timing, and the placeholder visual. */
  update(deltaMS: number): void {
    this.controller.update(deltaMS)
    this.animator.update(this.direction, this.moving, deltaMS)
    this.redraw()
  }

  private redraw(): void {
    // Visibly pulse every other walk frame so the animation state machine
    // is obviously "live" even without a real sprite sheet.
    const pulsing = this.moving && this.animator.frameIndex % 2 === 1
    const radius = pulsing ? BODY_RADIUS * 1.15 : BODY_RADIUS

    this.body
      .clear()
      .circle(0, 0, radius)
      .fill({ color: 0x00e5ff, alpha: 0.85 })
      .stroke({ width: 2, color: 0xffffff })

    const [dx, dy] = FACING_OFFSETS[this.direction]
    this.facing
      .clear()
      .moveTo(0, 0)
      .lineTo(dx * FACING_LENGTH, dy * FACING_LENGTH)
      .stroke({ width: 3, color: 0xffffff })
  }
}
