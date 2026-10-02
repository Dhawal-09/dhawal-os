import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { gameEventBridge, OPEN_EVENTS } from '../../game/events/GameEventBridge'
import { touchInput, type TouchDirection } from '../../game/input/TouchInput'
import './MobileControls.css'

const DIRECTIONS: ReadonlyArray<{ direction: TouchDirection; label: string }> =
  [
    { direction: 'up', label: 'Move up' },
    { direction: 'left', label: 'Move left' },
    { direction: 'right', label: 'Move right' },
    { direction: 'down', label: 'Move down' },
  ]

const NO_DIRECTIONS: readonly TouchDirection[] = []

/**
 * Which directions a pointer at (x, y) holds, reading the pad as a 3×3 grid:
 * the edge cells are the four arrows, a corner is its two neighbours
 * (a diagonal under one thumb), the middle is nothing. A captured pointer
 * that slides off the pad keeps the direction it left by.
 */
function directionsAt(
  pad: DOMRect,
  x: number,
  y: number,
): readonly TouchDirection[] {
  const column = Math.floor(((x - pad.left) / pad.width) * 3)
  const row = Math.floor(((y - pad.top) / pad.height) * 3)
  const directions: TouchDirection[] = []
  if (row <= 0) directions.push('up')
  if (row >= 2) directions.push('down')
  if (column <= 0) directions.push('left')
  if (column >= 2) directions.push('right')
  return directions
}

function releaseAll(): void {
  for (const { direction } of DIRECTIONS) {
    touchInput.setDirection(direction, false)
  }
}

/**
 * The four-direction pad. Each active pointer holds zero, one or two
 * directions; their union is written to `touchInput` only when it changes
 * (a press/release/slide), never per frame — the Pixi loop reads it from
 * there through InputManager, exactly like held keys.
 */
function DPad() {
  const pointersRef = useRef(new Map<number, readonly TouchDirection[]>())
  const [held, setHeld] = useState<readonly TouchDirection[]>(NO_DIRECTIONS)

  // Unmounting (a panel opened, or the visitor left GAME) lets go of everything.
  useEffect(() => releaseAll, [])

  const sync = useCallback(() => {
    const next = DIRECTIONS.map(({ direction }) => direction).filter(
      (direction) =>
        [...pointersRef.current.values()].some((directions) =>
          directions.includes(direction),
        ),
    )
    for (const { direction } of DIRECTIONS) {
      touchInput.setDirection(direction, next.includes(direction))
    }
    setHeld((previous) =>
      previous.length === next.length &&
      previous.every((direction, index) => direction === next[index])
        ? previous
        : next,
    )
  }, [])

  const track = (event: PointerEvent<HTMLDivElement>): void => {
    const pad = event.currentTarget.getBoundingClientRect()
    let directions: readonly TouchDirection[]
    if (pad.width > 0 && pad.height > 0) {
      directions = directionsAt(pad, event.clientX, event.clientY)
    } else {
      // No layout to measure (not rendered yet): the pressed arrow itself.
      const direction = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-direction]',
      )?.dataset.direction as TouchDirection | undefined
      directions = direction ? [direction] : NO_DIRECTIONS
    }
    pointersRef.current.set(event.pointerId, directions)
    sync()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    // Keep receiving this pointer while it slides between (or off) the arrows.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // The pointer is already gone.
    }
    track(event)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (pointersRef.current.has(event.pointerId)) track(event)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (pointersRef.current.delete(event.pointerId)) sync()
  }

  return (
    <div
      className="mobile-dpad"
      role="group"
      aria-label="Movement"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      {DIRECTIONS.map(({ direction, label }) => (
        <button
          key={direction}
          type="button"
          data-direction={direction}
          aria-label={label}
          className={
            held.includes(direction)
              ? `mobile-dpad-button mobile-dpad-${direction} is-held`
              : `mobile-dpad-button mobile-dpad-${direction}`
          }
        >
          <span className="mobile-dpad-arrow" aria-hidden="true" />
        </button>
      ))}
      <span className="mobile-dpad-hub" aria-hidden="true" />
    </div>
  )
}

/**
 * On-screen gameplay controls for touch devices: a D-pad (bottom left) and
 * the interact button (bottom right). They are a second *input source*, not
 * a second movement or interaction system — they only write to
 * `touchInput`, which the game's own InputManager reads alongside the
 * keyboard, so movement, collision, footsteps and `[E]` resolution are the
 * existing ones.
 *
 * App mounts this only in GAME. While a panel or modal has the world paused
 * (the same bridge events GameScene pauses on) the controls are removed, and
 * anything held is released. Hidden by CSS on devices whose primary pointer
 * isn't touch.
 */
export function MobileControls() {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    return gameEventBridge.subscribe((event) => {
      if (OPEN_EVENTS.has(event) || event === 'PAUSE_WORLD') {
        setPaused(true)
      } else if (event === 'CLOSE_OVERLAY' || event === 'RETURN_TO_WORLD') {
        setPaused(false)
      }
    })
  }, [])

  if (paused) return null

  return (
    <div className="mobile-controls">
      <DPad />
      <button
        type="button"
        className="mobile-interact"
        aria-label="Interact"
        onClick={() => touchInput.pressInteract()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="mobile-interact-key" aria-hidden="true">
          E
        </span>
        <span className="mobile-interact-label" aria-hidden="true">
          INTERACT
        </span>
      </button>
    </div>
  )
}
