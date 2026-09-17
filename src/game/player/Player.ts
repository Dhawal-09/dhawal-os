import { Container, Graphics, Text } from 'pixi.js'
import type { InteractableCandidate } from '../world/InteractionSystem'
import { CollisionBody } from './CollisionBody'
import { PlayerAnimator, type Direction } from './PlayerAnimator'
import { PlayerController, type PlayerSystems } from './PlayerController'

const BODY_RADIUS = 14
const FACING_LENGTH = 18
const PROMPT_OFFSET_Y = -26

const FACING_OFFSETS: Record<Direction, readonly [number, number]> = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
}

export interface PlayerOptions {
  x?: number
  y?: number
  /**
   * Shows the dev-only red hitbox outline. Off by default even in
   * `npm run dev` — matches `World.ts`'s `debugCollisionOverlay` opt-in, and
   * is additionally gated on `import.meta.env.DEV` here too, so it can never
   * render in a production build regardless of what a caller passes.
   */
  showDebugCollider?: boolean
}

/**
 * The player entity (see PLAYER_SPEC.md "Architecture": Player owns
 * PlayerController + PlayerAnimator + CollisionBody). Renders an explicit
 * dev placeholder — a tinted circle plus a facing indicator — never a
 * temporary filename. Swapping in the approved sprite sheet later only
 * touches `redraw()` below; movement, state, input, collision, and
 * interaction are untouched.
 */
export class Player extends Container {
  readonly controller: PlayerController
  readonly animator = new PlayerAnimator()
  readonly collisionBody = new CollisionBody()

  direction: Direction = 'down'
  moving = false
  /** Set by PlayerController each frame from InteractionSystem — Player never computes eligibility itself. */
  interactionTarget: InteractableCandidate | null = null

  private readonly body = new Graphics()
  private readonly facing = new Graphics()
  private readonly debugCollider: Graphics | null
  /**
   * The `[E] INTERACT` prompt (INTERACTION_SPEC.md). Plain text, not tied to
   * any visual asset — visibility alone tracks `interactionTarget`, so it
   * works identically for whichever object the player is near.
   */
  private readonly prompt = new Text({
    text: '[E] INTERACT',
    style: { fontFamily: 'monospace', fontSize: 12, fill: 0xffffff },
  })

  constructor(systems: PlayerSystems, options: PlayerOptions = {}) {
    super({ label: 'Player' })
    this.position.set(options.x ?? 0, options.y ?? 0)
    this.debugCollider =
      import.meta.env.DEV && options.showDebugCollider ? new Graphics() : null

    this.addChild(this.body, this.facing)
    if (this.debugCollider) this.addChild(this.debugCollider)

    this.prompt.anchor.set(0.5, 1)
    this.prompt.position.set(0, PROMPT_OFFSET_Y)
    this.prompt.visible = false
    this.addChild(this.prompt)

    this.controller = new PlayerController(this, systems)

    this.redraw()
  }

  /** Advances input-driven movement, animation timing, interaction eligibility, and the placeholder visual. */
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

    this.prompt.visible = this.interactionTarget !== null

    if (this.debugCollider) {
      // Local space (origin 0,0) — this container is already positioned at
      // the player's world position, so no extra offset is needed here.
      const rect = this.collisionBody.getRect(0, 0)
      this.debugCollider
        .clear()
        .rect(rect.x, rect.y, rect.width, rect.height)
        .stroke({ width: 1, color: 0xff2d2d })
    }
  }
}
