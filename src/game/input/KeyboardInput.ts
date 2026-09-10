/** What InputManager needs from a raw input source — implemented by KeyboardInput now, a future TouchInput/joystick later (Phase 09). */
export interface KeyboardSource {
  isPressed(code: string): boolean
  /** Edge-triggered: true once per physical press, consumed on read. */
  wasJustPressed(code: string): boolean
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
  'KeyE',
])

/**
 * Raw keyboard listener. Tracks which movement/interaction-relevant keys are
 * currently held — no movement/game semantics live here, InputManager
 * interprets this. Game systems must never read KeyboardEvent directly
 * (PLAYER_SPEC.md).
 */
export class KeyboardInput implements KeyboardSource {
  private readonly pressed = new Set<string>()
  private readonly justPressed = new Set<string>()

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!TRACKED_KEYS.has(event.code)) return
    // Only the real down-transition counts — ignore the OS's key-repeat
    // keydown storm while a key is held, so wasJustPressed stays edge-triggered.
    if (!this.pressed.has(event.code)) {
      this.justPressed.add(event.code)
    }
    this.pressed.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code)
  }

  /** Clears held keys on focus loss, so alt-tabbing away doesn't leave the player walking forever. */
  private readonly handleBlur = (): void => {
    this.pressed.clear()
    this.justPressed.clear()
  }

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
  }

  isPressed(code: string): boolean {
    return this.pressed.has(code)
  }

  wasJustPressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code)
      return true
    }
    return false
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    this.pressed.clear()
    this.justPressed.clear()
  }
}
