import { useEffect, useState } from 'react'
import { audioManager } from '../../game/audio/AudioManager'

/**
 * The HUD's "SOUND ON" control (DESIGN_SYSTEM.md "HUD"). Drives the game's
 * global mute through `audioManager`, which outlives this component — so the
 * choice survives an EXIT and re-entry instead of resetting to ON.
 */
export function SoundToggle() {
  const [on, setOn] = useState(() => !audioManager.isMuted())

  useEffect(() => audioManager.subscribeMute((muted) => setOn(!muted)), [])

  return (
    <button
      type="button"
      className="game-hud-sound"
      aria-pressed={on}
      onClick={() => audioManager.setMuted(on)}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔈'}</span> {on ? 'ON' : 'OFF'}
    </button>
  )
}
