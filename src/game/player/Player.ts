import { Container, Graphics, Sprite, Text } from 'pixi.js'
import type { InteractableCandidate } from '../world/InteractionSystem'
import { ManagedAssetSprite } from '../world/WorldObject'
import { CollisionBody, PLAYER_FEET_OFFSET_Y } from './CollisionBody'
import {
  IDLE_FRAME_INDEX,
  PLAYER_SPRITE_ANCHOR,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_SHEET,
  type PlayerFrames,
} from './playerAnimations'
import { PLAYER_SPRITE_HEIGHT } from './playerConstants'
import { PlayerAnimator, type Direction } from './PlayerAnimator'
import { PlayerController, type PlayerSystems } from './PlayerController'

const BODY_RADIUS = 14
const FACING_LENGTH = 18
const PROMPT_OFFSET_Y = -26
/** Gap between the top of the character's head and the interact prompt. */
const PROMPT_GAP_ABOVE_HEAD = 6

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
  /**
   * The sliced character sheets (playerAnimations.ts). Without them the
   * player renders as the plain dev placeholder circle — tests, or the brief
   * moment before the art has loaded; `setFrames` upgrades it in place.
   */
  frames?: PlayerFrames | null
}

/**
 * The player entity (see PLAYER_SPEC.md "Architecture": Player owns
 * PlayerController + PlayerAnimator + CollisionBody). Renders the approved
 * character sprite once its frames are supplied — a Sprite whose texture is
 * swapped from the state `PlayerAnimator` reports, so there's no second
 * animation clock — and an explicit dev placeholder (a tinted circle plus a
 * facing indicator) until then. Movement, state, input, collision, and
 * interaction don't know or care which one is showing.
 *
 * The origin is the player's collision-body reference point, not the
 * sprite's feet: the sprite stands with its feet on the bottom edge of the
 * feet-sized collider (`PLAYER_FEET_OFFSET_Y`) — so walking into furniture
 * stops the *feet* at the furniture, exactly what the collider tests.
 */
export class Player extends Container {
  readonly controller: PlayerController
  readonly animator = new PlayerAnimator(PLAYER_SPRITE_SHEET)
  readonly collisionBody = new CollisionBody()

  direction: Direction = 'down'
  moving = false
  /** Set by PlayerController each frame from InteractionSystem — Player never computes eligibility itself. */
  interactionTarget: InteractableCandidate | null = null

  private readonly body = new Graphics()
  private readonly facing = new Graphics()
  private sprite: Sprite | null = null
  private frames: PlayerFrames | null = null
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

    if (options.frames) this.setFrames(options.frames)
    this.redraw()
  }

  /**
   * Swaps the dev placeholder for the real character sprite. Idempotent for
   * the same frames; safe to call once the art finishes loading after the
   * scene is already running.
   */
  setFrames(frames: PlayerFrames): void {
    this.frames = frames

    if (!this.sprite) {
      // `ManagedAssetSprite`: the frames' textures belong to Pixi's `Assets`
      // cache, so tearing the scene down (EXIT) must not destroy them.
      const sprite = new ManagedAssetSprite(frames[this.direction][0])
      sprite.label = 'PlayerSprite'
      sprite.anchor.set(PLAYER_SPRITE_ANCHOR.x, PLAYER_SPRITE_ANCHOR.y)
      sprite.scale.set(PLAYER_SPRITE_SCALE)
      sprite.position.set(0, PLAYER_FEET_OFFSET_Y)
      this.sprite = sprite
      // Bottom of the stack, under the debug collider outline and the prompt.
      this.addChildAt(sprite, 0)

      this.body.visible = false
      this.facing.visible = false
      // Above the head instead of over the torso.
      this.prompt.position.set(
        0,
        PLAYER_FEET_OFFSET_Y - PLAYER_SPRITE_HEIGHT - PROMPT_GAP_ABOVE_HEAD,
      )
    }

    this.redraw()
  }

  /** Advances input-driven movement, animation timing, interaction eligibility, and the visual. */
  update(deltaMS: number): void {
    this.controller.update(deltaMS)
    this.animator.update(this.direction, this.moving, deltaMS)
    this.redraw()
  }

  private redraw(): void {
    if (this.sprite && this.frames) {
      const index = this.moving
        ? this.animator.frameIndex
        : IDLE_FRAME_INDEX[this.direction]
      const texture = this.frames[this.direction][index]
      if (this.sprite.texture !== texture) this.sprite.texture = texture
    } else {
      this.redrawPlaceholder()
    }

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

  private redrawPlaceholder(): void {
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
