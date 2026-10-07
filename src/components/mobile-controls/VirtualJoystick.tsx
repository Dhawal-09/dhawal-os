import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { computeJoystick } from '../../game/input/joystickMath'
import { touchInput } from '../../game/input/TouchInput'

/** The knob's diameter as a fraction of the base's — must match `--mobile-stick-knob` in MobileControls.css. */
const KNOB_SIZE_RATIO = 0.4

/**
 * The analog movement stick: a round base with a knob that follows the
 * thumb. It is only an *input source* — every pointer event converts the
 * thumb's offset from the base's center into a vector (any angle, length
 * 0..1) and writes it to `touchInput`; the Pixi loop reads it from there
 * through InputManager, exactly like held keys. It never touches the
 * player, and never runs per frame.
 *
 * One pointer drives the stick at a time (the first one down, captured so
 * the drag keeps working when the thumb slides off the base); a second
 * finger on the base is ignored. The knob is moved by writing its transform
 * directly — dragging causes no React renders; React state only tracks
 * held/not-held, for the pressed styling.
 */
export function VirtualJoystick() {
  const knobRef = useRef<HTMLSpanElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)

  // Unmounting (a panel opened, or the visitor left GAME) lets go at once.
  useEffect(() => () => touchInput.stopMovement(), [])

  const placeKnob = (x: number, y: number): void => {
    const knob = knobRef.current
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`
  }

  const track = (event: PointerEvent<HTMLDivElement>): void => {
    const base = event.currentTarget.getBoundingClientRect()
    const radius = Math.min(base.width, base.height) / 2
    // The knob stays fully inside the base: its center can travel the
    // base's radius minus its own.
    const travel = radius * (1 - KNOB_SIZE_RATIO)
    const stick = computeJoystick(
      event.clientX - (base.left + base.width / 2),
      event.clientY - (base.top + base.height / 2),
      travel,
    )
    placeKnob(stick.knobX, stick.knobY)
    touchInput.setMovement(stick.x, stick.y)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (pointerIdRef.current !== null) return
    pointerIdRef.current = event.pointerId
    // Keep receiving this pointer while it drags beyond the base.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // The pointer is already gone.
    }
    setActive(true)
    track(event)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId === pointerIdRef.current) track(event)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== pointerIdRef.current) return
    pointerIdRef.current = null
    // Target goes to zero; TouchInput eases the movement out, and the CSS
    // transition (active only while not held) glides the knob back.
    touchInput.setMovement(0, 0)
    placeKnob(0, 0)
    setActive(false)
  }

  return (
    <div
      className={active ? 'mobile-stick is-active' : 'mobile-stick'}
      role="group"
      aria-label="Movement joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="mobile-stick-base" aria-hidden="true" />
      <span ref={knobRef} className="mobile-stick-knob" aria-hidden="true" />
    </div>
  )
}
