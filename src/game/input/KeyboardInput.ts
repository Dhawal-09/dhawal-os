/** What InputManager needs from a raw input source — implemented by KeyboardInput now, a future TouchInput/joystick later (Phase 09). */
export interface KeyboardSource {
  isPressed(code: string): boolean
  destroy(): void
}

const TRACKED_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

/**
 * Raw keyboard listener. Tracks which movement-relevant keys are currently
 * held — no movement/game semantics live here, InputManager interprets
 * this. Game systems must never read KeyboardEvent directly (PLAYER_SPEC.md).
 */
export class KeyboardInput implements KeyboardSource {
  private readonly pressed = new Set<string>()

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!TRACKED_KEYS.has(event.code)) return
    this.pressed.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code)
  }

  /** Clears held keys on focus loss, so alt-tabbing away doesn't leave the player walking forever. */
  private readonly handleBlur = (): void => {
    this.pressed.clear()
  }

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
  }

  isPressed(code: string): boolean {
    return this.pressed.has(code)
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    this.pressed.clear()
  }
}
