import './ErrorScreen.css'

export interface ErrorScreenProps {
  onRetry: () => void
}

/**
 * Shown when `GameApp` initialization fails (PHASE-08.5 "Error handling").
 * No stack trace or raw error text is shown to the visitor — that is
 * logged to the console by the caller for development diagnosis. Retrying
 * only ever re-triggers a single fresh initialization attempt (see
 * `App.tsx` — a bumped `key` forces a clean `GameCanvas` remount), never a
 * second concurrent `GameApp` instance.
 */
export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="error-screen" role="alert">
      <p className="error-heading">UNABLE TO INITIALIZE DHAWAL.OS</p>
      <p className="error-detail">
        Something went wrong starting the interactive world. You can try again,
        or use the navigation above to browse the portfolio directly.
      </p>
      <button type="button" className="error-retry" onClick={onRetry}>
        TRY AGAIN
      </button>
    </div>
  )
}
