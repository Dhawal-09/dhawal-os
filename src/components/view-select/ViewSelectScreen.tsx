import { useState, type KeyboardEvent } from 'react'
import type { CameraMode } from '../../game/world/cameraConstants'
import { CAMERA_VIEW_OPTIONS } from './cameraViewOptions'
import './ViewSelectScreen.css'

export interface ViewSelectScreenProps {
  /** The currently selected mode, or null before the visitor has picked one. */
  selected: CameraMode | null
  /** Called when a card is picked — App forwards it to the camera straight away (it animates behind this opaque screen). */
  onSelect: (mode: CameraMode) => void
  /** ENTER DHAWAL.OS — only reachable once a mode is selected. */
  onConfirm: () => void
}

/**
 * The last step before the world opens (lifecycle VIEW_SELECT): pick the
 * starting camera mode. Two native radio inputs styled as game-mode cards,
 * so Tab / arrow keys / Space come for free; Enter on a selected card
 * confirms, same as the ENTER button. Escape deliberately does nothing —
 * there is no way to skip this without choosing.
 *
 * Preview images are real screenshots of the running world at each camera
 * mode, served from `public/assets/opening/` (see `cameraViewOptions.ts`).
 */
export function ViewSelectScreen({
  selected,
  onSelect,
  onConfirm,
}: ViewSelectScreenProps) {
  const [failedPreviews, setFailedPreviews] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' && selected) {
      event.preventDefault()
      onConfirm()
    }
  }

  return (
    <div className="view-select-screen">
      <section
        className="view-select-frame"
        aria-labelledby="view-select-heading"
      >
        <p className="view-select-brand">DHAWAL.OS</p>
        <h2 id="view-select-heading" className="view-select-heading">
          SELECT YOUR VIEW
        </h2>
        <p className="view-select-subtitle" id="view-select-subtitle">
          HOW DO YOU WANT TO EXPLORE DHAWAL.OS?
        </p>

        <div
          role="radiogroup"
          aria-labelledby="view-select-heading"
          aria-describedby="view-select-subtitle"
          className="view-select-options"
          onKeyDown={handleKeyDown}
        >
          {CAMERA_VIEW_OPTIONS.map((option) => {
            const isSelected = selected === option.mode
            const previewFailed = failedPreviews.has(option.mode)
            return (
              <label
                key={option.mode}
                className={
                  isSelected
                    ? 'view-select-card view-select-card-selected'
                    : 'view-select-card'
                }
              >
                <input
                  type="radio"
                  name="camera-view"
                  value={option.mode}
                  checked={isSelected}
                  onChange={() => onSelect(option.mode)}
                  className="view-select-radio"
                />
                <span className="view-select-preview">
                  {previewFailed ? (
                    <span className="view-select-preview-missing">
                      PREVIEW UNAVAILABLE
                    </span>
                  ) : (
                    <img
                      src={option.previewSrc}
                      alt=""
                      loading="eager"
                      onError={() =>
                        setFailedPreviews((prev) =>
                          new Set(prev).add(option.mode),
                        )
                      }
                    />
                  )}
                  {isSelected && (
                    <span className="view-select-badge">▶ SELECTED</span>
                  )}
                </span>
                <span className="view-select-card-body">
                  <span className="view-select-card-title">{option.title}</span>
                  <span className="view-select-card-desc">
                    {option.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <button
          type="button"
          className="view-select-enter"
          disabled={!selected}
          onClick={onConfirm}
        >
          {selected ? (
            <>
              <span aria-hidden="true">▶</span> ENTER DHAWAL.OS
            </>
          ) : (
            'SELECT A VIEW TO CONTINUE'
          )}
        </button>
      </section>
    </div>
  )
}
