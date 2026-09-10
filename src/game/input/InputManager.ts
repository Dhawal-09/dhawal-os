import { KeyboardInput, type KeyboardSource } from './KeyboardInput'

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
 * — only on `getMovementVector()`/`destroy()`, so a touch/joystick source
 * can be added later (Phase 09) without changing PlayerController.
 */
export class InputManager implements MovementInput, InteractionInput {
  private readonly keyboard: KeyboardSource
  private pendingTapInteract = false

  constructor(keyboard: KeyboardSource = new KeyboardInput()) {
    this.keyboard = keyboard
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

    return normalize({ x, y })
  }

  /** True once after an `E` press or a canvas tap (mobile stub — full touch UX in Phase 09). Must be called every frame to stay correctly edge-triggered. */
  wasInteractPressed(): boolean {
    if (this.pendingTapInteract) {
      this.pendingTapInteract = false
      return true
    }
    return this.keyboard.wasJustPressed('KeyE')
  }

  /** Wired from the game canvas's pointerdown (see GameCanvas.tsx) — the minimal mobile "tap to interact" stub PHASE-07-INTERACTION.md requires. */
  triggerTapInteract(): void {
    this.pendingTapInteract = true
  }

  destroy(): void {
    this.keyboard.destroy()
  }
}
