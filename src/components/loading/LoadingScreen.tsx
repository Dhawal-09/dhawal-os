import './LoadingScreen.css'

/**
 * Shown while `GameApp`/`GameScene` initialize (PHASE-08.5 "Loading
 * screen"). The current engine bootstrap is a single awaited step with no
 * real, independently-observable sub-stages (no asset manifest/progress
 * events exist yet — see `ASSET_SPEC.md`), so this deliberately shows one
 * honest, indeterminate status rather than a fabricated multi-stage or
 * percentage progression.
 */
export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <p className="loading-heading">INITIALIZING DHAWAL.OS</p>
      <div className="loading-indicator" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
