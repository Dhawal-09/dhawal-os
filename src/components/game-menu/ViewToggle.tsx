import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from '../../game/world/cameraConstants'
import { CAMERA_VIEW_OPTIONS } from '../view-select/cameraViewOptions'

export interface ViewToggleProps {
  mode: CameraMode
  onChange: (mode: CameraMode) => void
}

/**
 * The HUD's VIEW control: opens a compact CAMERA VIEW selector (EXPLORE /
 * OVERVIEW). Picking a mode applies it immediately — the camera eases to
 * it in the Pixi ticker while the selector stays open; CLOSE, Escape or
 * VIEW again dismiss it. React only holds the selected mode (App.tsx);
 * nothing here re-renders per frame.
 *
 * Absolutely positioned under the HUD so opening it never resizes the
 * game canvas.
 */
export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const close = (): void => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className="game-hud-view-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="game-hud-view"
        aria-expanded={open}
        aria-controls="game-hud-view-panel"
        title="Camera view"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🗺</span>{' '}
        <span className="game-hud-view-label">VIEW</span>
      </button>
      {open && (
        <div
          id="game-hud-view-panel"
          className="game-hud-view-panel"
          role="group"
          aria-labelledby="game-hud-view-title"
        >
          <p id="game-hud-view-title" className="game-hud-view-title">
            CAMERA VIEW
          </p>
          <div
            role="radiogroup"
            aria-labelledby="game-hud-view-title"
            className="game-hud-view-options"
          >
            {CAMERA_VIEW_OPTIONS.map((option) => (
              <label key={option.mode} className="game-hud-view-option">
                <input
                  type="radio"
                  name="hud-camera-view"
                  value={option.mode}
                  checked={mode === option.mode}
                  onChange={() => onChange(option.mode)}
                />
                <span className="game-hud-view-option-text">
                  <span className="game-hud-view-option-title">
                    {option.hudTitle}
                  </span>
                  <span className="game-hud-view-option-desc">
                    {option.shortDescription}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button type="button" className="game-hud-view-close" onClick={close}>
            CLOSE
          </button>
        </div>
      )}
    </div>
  )
}
