export type Direction = 'down' | 'up' | 'left' | 'right'

/** The 8 documented player states (see PLAYER_SPEC.md "States"). */
export type PlayerAnimationState =
  | 'IDLE_DOWN'
  | 'IDLE_UP'
  | 'IDLE_LEFT'
  | 'IDLE_RIGHT'
  | 'WALK_DOWN'
  | 'WALK_UP'
  | 'WALK_LEFT'
  | 'WALK_RIGHT'

/**
 * Sprite-sheet shape, deliberately configurable rather than hard-coded —
 * frame dimensions/count must come from the actual approved character asset
 * once supplied (PLAYER_SPEC.md), not be guessed now.
 */
export interface SpriteSheetConfig {
  frameWidth: number
  frameHeight: number
  framesPerState: number
  frameDurationMs: number
}

/** Used until the real asset lands. Not a filename — a tuning placeholder only. */
export const PLACEHOLDER_SPRITE_SHEET: SpriteSheetConfig = {
  frameWidth: 32,
  frameHeight: 32,
  framesPerState: 4,
  frameDurationMs: 150,
}

export function toAnimationState(
  direction: Direction,
  moving: boolean,
): PlayerAnimationState {
  const prefix = moving ? 'WALK' : 'IDLE'
  return `${prefix}_${direction.toUpperCase()}` as PlayerAnimationState
}

/**
 * Pure animation-state/timing machine — no Pixi/rendering dependency, so it
 * is fully unit-testable and swaps in real sprite-sheet frames later without
 * changing its public shape (`state`/`frameIndex` stay the same; only the
 * thing that reads them to draw changes).
 */
export class PlayerAnimator {
  private readonly config: SpriteSheetConfig
  private elapsedMs = 0
  private _frameIndex = 0
  private _state: PlayerAnimationState = 'IDLE_DOWN'

  constructor(config: SpriteSheetConfig = PLACEHOLDER_SPRITE_SHEET) {
    this.config = config
  }

  get state(): PlayerAnimationState {
    return this._state
  }

  get frameIndex(): number {
    return this._frameIndex
  }

  update(direction: Direction, moving: boolean, deltaMS: number): void {
    const nextState = toAnimationState(direction, moving)
    if (nextState !== this._state) {
      this._state = nextState
      this.elapsedMs = 0
      this._frameIndex = 0
    }

    if (!moving) {
      this._frameIndex = 0
      return
    }

    this.elapsedMs += deltaMS
    const framesElapsed = Math.floor(
      this.elapsedMs / this.config.frameDurationMs,
    )
    this._frameIndex = framesElapsed % this.config.framesPerState
  }
}
