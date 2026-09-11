import { useState } from 'react'

/**
 * The HUD's "SOUND ON" control (DESIGN_SYSTEM.md "HUD"). No audio system
 * exists yet (explicitly out of scope — see PHASE-08/PHASE-09 non-goals),
 * so this is honestly just a local on/off toggle for the HUD chrome itself,
 * not wired to any real audio playback.
 */
export function SoundToggle() {
  const [on, setOn] = useState(true)

  return (
    <button
      type="button"
      className="game-hud-sound"
      aria-pressed={on}
      onClick={() => setOn((value) => !value)}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔈'}</span> {on ? 'ON' : 'OFF'}
    </button>
  )
}
