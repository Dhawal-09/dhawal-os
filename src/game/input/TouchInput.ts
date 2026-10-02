export type TouchDirection = 'up' | 'down' | 'left' | 'right'

/** What InputManager needs from the on-screen controls — the touch counterpart of `KeyboardSource`. */
export interface TouchSource {
  isHeld(direction: TouchDirection): boolean
  /** Edge-triggered: true once per press of the on-screen interact button, consumed on read. */
  wasInteractPressed(): boolean
  /** Clears held/pending state (see InputManager.reset). */
  reset(): void
}

/**
 * Raw state of the on-screen mobile controls (MobileControls.tsx): which
 * D-pad directions are held, and whether the interact button was pressed.
 * Like KeyboardInput, no movement/game semantics live here — a held
 * direction is the same thing as a held W/A/S/D key, and InputManager turns
 * both into the one movement vector PlayerController consumes.
 */
export class TouchInput implements TouchSource {
  private readonly held = new Set<TouchDirection>()
  private pendingInteract = false

  /** Idempotent — called on every D-pad press/release transition, never per frame. */
  setDirection(direction: TouchDirection, held: boolean): void {
    if (held) this.held.add(direction)
    else this.held.delete(direction)
  }

  isHeld(direction: TouchDirection): boolean {
    return this.held.has(direction)
  }

  pressInteract(): void {
    this.pendingInteract = true
  }

  wasInteractPressed(): boolean {
    if (!this.pendingInteract) return false
    this.pendingInteract = false
    return true
  }

  reset(): void {
    this.held.clear()
    this.pendingInteract = false
  }
}

/**
 * Shared by the React on-screen controls (which write it) and GameScene's
 * InputManager (which reads it) — the same singleton pattern as
 * `gameEventBridge`/`audioManager`, since the two live on opposite sides of
 * the React/Pixi boundary.
 */
export const touchInput = new TouchInput()
