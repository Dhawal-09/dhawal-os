import { useEffect, useState } from 'react'
import { gameEventBridge, OPEN_EVENTS } from '../../game/events/GameEventBridge'
import { touchInput } from '../../game/input/TouchInput'
import { VirtualJoystick } from './VirtualJoystick'
import './MobileControls.css'

/**
 * On-screen gameplay controls for touch devices: an analog joystick (bottom
 * right) and the interact button (bottom left). They are a second *input
 * source*, not a second movement or interaction system — they only write to
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
      <VirtualJoystick />
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
