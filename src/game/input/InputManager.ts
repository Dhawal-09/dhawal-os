import { KeyboardInput, type KeyboardSource } from './KeyboardInput'
import { touchInput, type TouchDirection, type TouchSource } from './TouchInput'

export interface MovementVector {
  x: number
  y: number
}

/**
 * The only shapes PlayerController/Player depend on — not the concrete
 * InputManager class. Keeps them trivially testable with a plain fake and
 * decoupled from how input is sourced/normalized.
 */
export interface MovementInput {
  getMovementVector(): MovementVector
}

/** Edge-triggered: true once per press/tap, consumed on read — never assumes keyboard-only (a mobile tap counts too). */
export interface InteractionInput {
  wasInteractPressed(): boolean
}

const KEY_DIRECTIONS: Record<string, MovementVector> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

/** The on-screen D-pad's directions — each one counts exactly like its W/A/S/D key. */
const TOUCH_DIRECTIONS: Record<TouchDirection, MovementVector> = {
  up: KEY_DIRECTIONS.KeyW,
  down: KEY_DIRECTIONS.KeyS,
  left: KEY_DIRECTIONS.KeyA,
  right: KEY_DIRECTIONS.KeyD,
}

function normalize(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y)
  if (length === 0) return { x: 0, y: 0 }
  return { x: vector.x / length, y: vector.y / length }
}

/**
 * Normalizes raw input into the single movement vector PlayerController
 * consumes (see PLAYER_SPEC.md "Input": Keyboard/Touch/Joystick → this →
 * PlayerController). Game systems never read KeyboardEvent directly, and
 * PlayerController never depends on this class's keyboard-specific internals
 * — only on `getMovementVector()`/`destroy()`. The on-screen mobile
 * controls (`TouchSource`) are a second raw source feeding the same vector
 * and the same interact edge, so PlayerController can't tell them apart.
 */
export class InputManager implements MovementInput, InteractionInput {
  private readonly keyboard: KeyboardSource
  private readonly touch: TouchSource
  private pendingTapInteract = false

  constructor(
    keyboard: KeyboardSource = new KeyboardInput(),
    touch: TouchSource = touchInput,
  ) {
    this.keyboard = keyboard
    this.touch = touch
  }

  /** A unit-length (or zero) vector: x/y each in [-1, 1], diagonals normalized so they aren't faster than cardinal movement. */
  getMovementVector(): MovementVector {
    let x = 0
    let y = 0

    for (const code in KEY_DIRECTIONS) {
      if (!this.keyboard.isPressed(code)) continue
      x += KEY_DIRECTIONS[code].x
      y += KEY_DIRECTIONS[code].y
    }

    for (const direction in TOUCH_DIRECTIONS) {
      if (!this.touch.isHeld(direction as TouchDirection)) continue
      x += TOUCH_DIRECTIONS[direction as TouchDirection].x
      y += TOUCH_DIRECTIONS[direction as TouchDirection].y
    }

    return normalize({ x, y })
  }

  /** True once after an `E` press, a canvas tap, or a press of the on-screen interact button. Must be called every frame to stay correctly edge-triggered. */
  wasInteractPressed(): boolean {
    if (this.pendingTapInteract) {
      this.pendingTapInteract = false
      return true
    }
    if (this.touch.wasInteractPressed()) return true
    return this.keyboard.wasJustPressed('KeyE')
  }

  /** Wired from the game canvas's pointerdown (see GameCanvas.tsx) — the minimal mobile "tap to interact" stub PHASE-07-INTERACTION.md requires. */
  triggerTapInteract(): void {
    this.pendingTapInteract = true
  }

  /**
   * Clears all held/pending input state. Called by GameScene when the world
   * resumes after a portfolio panel closes, so a key pressed while the panel
   * was open (input intended for the panel, not the player) cannot
   * "carry over" into an unwanted movement/interaction the instant the game
   * resumes (PHASE-08-PORTFOLIO-UI.md / ACCESSIBILITY.md).
   */
  reset(): void {
    this.pendingTapInteract = false
    this.keyboard.reset()
    this.touch.reset()
  }

  destroy(): void {
    this.keyboard.destroy()
    // The touch source outlives this manager (shared with the React
    // controls) — leave nothing held for the next scene.
    this.touch.reset()
  }
}
