import { KeyboardInput, type KeyboardSource } from './KeyboardInput'
import { touchInput, type TouchSource } from './TouchInput'

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
  /** `deltaMS` — the frame's game time; only used to smooth the analog stick. */
  getMovementVector(deltaMS?: number): MovementVector
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

  /**
   * x/y each in [-1, 1], length never above 1. Keys are digital: any held
   * key gives a unit-length vector, with diagonals normalized so they
   * aren't faster than cardinal movement. The on-screen joystick is analog:
   * its length (0..1) is how far the stick is pushed, which PlayerController
   * turns directly into speed — a light push walks slowly, a full push is
   * full speed, at any angle.
   */
  getMovementVector(deltaMS?: number): MovementVector {
    let keyX = 0
    let keyY = 0

    for (const code in KEY_DIRECTIONS) {
      if (!this.keyboard.isPressed(code)) continue
      keyX += KEY_DIRECTIONS[code].x
      keyY += KEY_DIRECTIONS[code].y
    }

    const keys = normalize({ x: keyX, y: keyY })
    const stick = this.touch.getMovementVector(deltaMS)
    if (stick.x === 0 && stick.y === 0) return keys

    // Both at once (a keyboard attached to a touch device): add them, but
    // never exceed full speed.
    const x = keys.x + stick.x
    const y = keys.y + stick.y
    return Math.hypot(x, y) > 1 ? normalize({ x, y }) : { x, y }
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
