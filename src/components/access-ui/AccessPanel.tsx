import { useEffect, useState } from 'react'
import { authManager } from '../../game/auth/AuthManager'
import './AccessPanel.css'

type Phase = 'ready' | 'authenticating' | 'granted'

const AUTH_STEPS = [
  'INITIALIZING SESSION',
  'VERIFYING ACCESS',
  'LOADING PROFILE',
] as const

/** Pace of the simulated verification steps — brief, not excessive (DESIGN_SYSTEM.md). */
const STEP_INTERVAL_MS = 90
/** How long "ACCESS GRANTED / SESSION ACTIVE" stays visible before the game reveals itself. */
const GRANTED_PAUSE_MS = 450

export interface AccessPanelProps {
  /** Called once, after the guest session has been created and the granted state has been briefly shown. */
  onAccessGranted: () => void
}

/**
 * The DHAWAL.OS guest-access gate — shown once the engine has finished
 * booting, before the game world becomes visible/interactive. This is a
 * portfolio demo of authentication/session *concepts*: there is no backend,
 * no credentials, and nothing here is validated by a server.
 * "ACCESS SYSTEM" only ever creates a local guest session
 * (`AuthManager.createGuestSession`). No username/password form, no real
 * account, no entrance-based interaction — access happens entirely here,
 * before the world opens.
 */
export function AccessPanel({ onAccessGranted }: AccessPanelProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [completedSteps, setCompletedSteps] = useState(0)

  useEffect(() => {
    if (phase !== 'authenticating') return

    const timers = AUTH_STEPS.map((_, index) =>
      window.setTimeout(
        () => {
          setCompletedSteps(index + 1)
          if (index === AUTH_STEPS.length - 1) {
            authManager.createGuestSession()
            setPhase('granted')
          }
        },
        STEP_INTERVAL_MS * (index + 1),
      ),
    )

    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'granted') return
    const id = window.setTimeout(onAccessGranted, GRANTED_PAUSE_MS)
    return () => window.clearTimeout(id)
  }, [phase, onAccessGranted])

  const handleAccessSystem = (): void => {
    setCompletedSteps(0)
    setPhase('authenticating')
  }

  return (
    <div className="access-screen">
      <div className="access-panel">
        <p className="access-brand">DHAWAL.OS</p>

        {phase === 'ready' && (
          <>
            <p className="access-subtitle">GUEST SESSION &middot; LOCAL DEMO</p>
            <dl className="access-fields">
              <div>
                <dt>USER</dt>
                <dd>GUEST</dd>
              </div>
              <div>
                <dt>ROLE</dt>
                <dd>VISITOR</dd>
              </div>
            </dl>
            <p className="access-session-status">SESSION: READY</p>
            <button
              type="button"
              className="access-cta"
              onClick={handleAccessSystem}
            >
              ACCESS SYSTEM
            </button>
            <p className="access-lock-status">ACCESS: LOCKED</p>
          </>
        )}

        {phase === 'authenticating' && (
          <div aria-live="polite">
            <p className="access-heading">AUTHENTICATING GUEST...</p>
            <ul className="access-steps">
              {AUTH_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={completedSteps > index ? 'access-step-done' : ''}
                >
                  {step}
                  {completedSteps > index ? ' ✓' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === 'granted' && (
          <div>
            <p className="access-heading access-heading-success">
              ACCESS GRANTED
            </p>
            <p className="access-session-status access-session-active">
              SESSION ACTIVE
            </p>
            <p className="access-role">ROLE: GUEST</p>
          </div>
        )}

        <p className="access-disclaimer">
          Local guest session for this demo only — no account, no
          server-side login.
        </p>
      </div>
    </div>
  )
}
