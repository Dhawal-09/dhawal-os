import { useEffect, useRef, useState } from 'react'
import './BootScreen.css'

const BOOT_STAGES = [
  'Loading world',
  'Loading assets',
  'Initializing renderer',
  'Initializing input',
  'Loading environment',
] as const

/** Fast, fixed cadence for the cosmetic checklist — flavor only, never a fake long delay (DESIGN_SYSTEM.md "keep this short"). */
const STAGE_INTERVAL_MS = 70

export interface BootScreenProps {
  /** True once the real PixiJS engine (`GameApp`) has actually finished initializing — the only real gate this screen waits on. */
  engineReady: boolean
  /**
   * Called exactly once, the moment the boot sequence has both (a) finished
   * ticking through its own short checklist animation and (b) observed
   * `engineReady`. On a fast device the checklist is usually still the
   * long pole (~5 x `STAGE_INTERVAL_MS`); on a slow one, this screen simply
   * keeps waiting on real `engineReady` rather than fabricating "done".
   */
  onBootComplete: () => void
}

/**
 * The DHAWAL.OS boot sequence, shown between START JOURNEY and the guest
 * access panel. The checklist itself is a short, fixed-cadence cosmetic
 * animation (never inflated into a fake multi-second wait) — but
 * `onBootComplete` never fires until the real engine (`engineReady`) is
 * actually ready, so a slower device just keeps this screen up longer
 * instead of lying about readiness.
 */
export function BootScreen({ engineReady, onBootComplete }: BootScreenProps) {
  const [completedStages, setCompletedStages] = useState(0)
  const calledCompleteRef = useRef(false)

  useEffect(() => {
    if (completedStages >= BOOT_STAGES.length) return
    const id = window.setTimeout(
      () => setCompletedStages((count) => count + 1),
      STAGE_INTERVAL_MS,
    )
    return () => window.clearTimeout(id)
  }, [completedStages])

  const stagesDone = completedStages >= BOOT_STAGES.length
  const ready = stagesDone && engineReady

  useEffect(() => {
    if (!ready || calledCompleteRef.current) return
    calledCompleteRef.current = true
    onBootComplete()
  }, [ready, onBootComplete])

  const progress = Math.round(
    ((completedStages + (engineReady ? 1 : 0)) / (BOOT_STAGES.length + 1)) *
      100,
  )

  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <p className="boot-brand">DHAWAL.OS</p>
      <p className="boot-heading">INITIALIZING SYSTEM...</p>

      <ul className="boot-stages">
        {BOOT_STAGES.map((stage, index) => (
          <li
            key={stage}
            className={completedStages > index ? 'boot-stage-done' : ''}
          >
            {completedStages > index ? '✓ ' : ''}
            {stage}
          </li>
        ))}
      </ul>

      <div
        className="boot-progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="boot-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <p className="boot-status">
        {ready ? 'SYSTEM READY' : stagesDone ? 'FINALIZING...' : `${progress}%`}
      </p>
    </div>
  )
}
