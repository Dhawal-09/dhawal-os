/** A 2D movement input: x/y each in [-1, 1], length ≤ 1 (y grows downward, like the world). */
export interface TouchVector {
  x: number
  y: number
}

/** What InputManager needs from the on-screen controls — the touch counterpart of `KeyboardSource`. */
export interface TouchSource {
  /**
   * The on-screen joystick's current vector — zero when it isn't held.
   * `deltaMS` is the game time since the last read and drives the smoothing;
   * without it the raw (unsmoothed) vector is returned.
   */
  getMovementVector(deltaMS?: number): TouchVector
  /** Edge-triggered: true once per press of the on-screen interact button, consumed on read. */
  wasInteractPressed(): boolean
  /** Clears held/pending state (see InputManager.reset). */
  reset(): void
}

/**
 * How quickly the reported vector closes on what the thumb is asking for
 * (exponential time constants, ms). Moving off rest eases in rather than
 * snapping to speed, and letting go eases out rather than stopping dead —
 * short enough that the stick still feels directly connected to the
 * character. SAFE TO TUNE; 0 disables that side of the smoothing.
 */
export const JOYSTICK_ATTACK_MS = 70
export const JOYSTICK_RELEASE_MS = 55

/** Below this length a released stick is simply zero — the ease-out never leaves a residual drift. */
const REST_EPSILON = 0.03

export interface TouchInputOptions {
  attackMS?: number
  releaseMS?: number
}

/**
 * Raw state of the on-screen mobile controls (MobileControls.tsx): where the
 * analog joystick is being held, and whether the interact button was
 * pressed. Like KeyboardInput, no movement/game semantics live here — the
 * joystick's vector is just another input, and InputManager folds it into
 * the one movement vector PlayerController consumes.
 *
 * The joystick writes its *target* vector on pointer events only (never per
 * frame); the game reads a *smoothed* vector once per frame, passing the
 * frame's own delta. Smoothing therefore runs on game time: it behaves the
 * same at any frame rate, and stands still while the world is paused.
 */
export class TouchInput implements TouchSource {
  private readonly attackMS: number
  private readonly releaseMS: number

  private targetX = 0
  private targetY = 0
  private currentX = 0
  private currentY = 0
  private pendingInteract = false

  constructor(options: TouchInputOptions = {}) {
    this.attackMS = options.attackMS ?? JOYSTICK_ATTACK_MS
    this.releaseMS = options.releaseMS ?? JOYSTICK_RELEASE_MS
  }

  /**
   * Where the joystick is held: any vector of length ≤ 1 (longer ones are
   * clamped to the unit circle). `(0, 0)` means released. Called on pointer
   * events, never per frame.
   */
  setMovement(x: number, y: number): void {
    const length = Math.hypot(x, y)
    if (!Number.isFinite(length) || length === 0) {
      this.targetX = 0
      this.targetY = 0
      return
    }
    const scale = length > 1 ? 1 / length : 1
    this.targetX = x * scale
    this.targetY = y * scale
  }

  /** Lets go immediately, with no ease-out — for when the controls disappear (a panel opened, the visitor left GAME). */
  stopMovement(): void {
    this.targetX = 0
    this.targetY = 0
    this.currentX = 0
    this.currentY = 0
  }

  getMovementVector(deltaMS?: number): TouchVector {
    const releasing = this.targetX === 0 && this.targetY === 0
    const timeConstant = releasing ? this.releaseMS : this.attackMS

    // Fraction of the remaining gap closed over this frame. No delta (a
    // caller outside the game loop) or no time constant means no smoothing.
    const blend =
      deltaMS === undefined || timeConstant <= 0
        ? 1
        : 1 - Math.exp(-Math.max(deltaMS, 0) / timeConstant)

    this.currentX += (this.targetX - this.currentX) * blend
    this.currentY += (this.targetY - this.currentY) * blend

    if (releasing && Math.hypot(this.currentX, this.currentY) < REST_EPSILON) {
      this.currentX = 0
      this.currentY = 0
    }

    return { x: this.currentX, y: this.currentY }
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
    this.stopMovement()
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
