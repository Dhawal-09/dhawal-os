/**
 * Pure geometry for the on-screen analog joystick (VirtualJoystick.tsx):
 * turns "the thumb is this far from the stick's center" into the knob's
 * position and the movement vector. No DOM, no state.
 */

/**
 * Fraction of the stick's travel around its center that reads as "no input",
 * so a resting thumb or a slightly off-center press doesn't creep the
 * player. SAFE TO TUNE — keep it small, or short thumb movements start to
 * feel unresponsive.
 */
export const JOYSTICK_DEAD_ZONE = 0.12

export interface JoystickState {
  /** Movement vector: direction of the thumb, length 0..1 (0 inside the dead zone, 1 at full travel). Never snapped to 4 or 8 directions. */
  x: number
  y: number
  /** Length of `(x, y)`. */
  magnitude: number
  /** Where to draw the knob, as an offset from the stick's center in the same units as `travel` — follows the thumb, clamped to the travel circle. */
  knobX: number
  knobY: number
}

const REST: JoystickState = { x: 0, y: 0, magnitude: 0, knobX: 0, knobY: 0 }

/**
 * @param offsetX thumb position relative to the stick's center (px; +x right)
 * @param offsetY thumb position relative to the stick's center (px; +y down)
 * @param travel  how far the knob can move from center (px)
 * @param deadZone fraction of `travel` that counts as rest
 *
 * Past the dead zone the magnitude is re-scaled to start from 0, so speed
 * ramps up smoothly from the dead zone's edge instead of jumping to 12%.
 */
export function computeJoystick(
  offsetX: number,
  offsetY: number,
  travel: number,
  deadZone: number = JOYSTICK_DEAD_ZONE,
): JoystickState {
  const distance = Math.hypot(offsetX, offsetY)
  if (!(travel > 0) || !Number.isFinite(distance) || distance === 0) {
    return REST
  }

  const directionX = offsetX / distance
  const directionY = offsetY / distance

  // The knob tracks the thumb exactly, but never leaves the base.
  const knobDistance = Math.min(distance, travel)
  const knobX = directionX * knobDistance
  const knobY = directionY * knobDistance

  const deflection = knobDistance / travel // 0..1
  const zone = Math.min(Math.max(deadZone, 0), 0.95)
  if (deflection <= zone) {
    return { x: 0, y: 0, magnitude: 0, knobX, knobY }
  }

  const magnitude = (deflection - zone) / (1 - zone)
  return {
    x: directionX * magnitude,
    y: directionY * magnitude,
    magnitude,
    knobX,
    knobY,
  }
}
