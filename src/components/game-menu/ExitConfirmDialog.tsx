import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import './ExitConfirmDialog.css'

export interface ExitConfirmDialogProps {
  onCancel: () => void
  onConfirmExit: () => void
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * The EXIT confirmation modal (PHASE-08.5 follow-up "Exit confirmation").
 * Follows the same accessible-dialog pattern already proven by
 * `InteractionOverlay` (focus moved in on open, restored on close, Tab
 * trapped/wrapped inside, Escape cancels) — kept as its own small
 * self-contained component rather than a shared abstraction, since this is
 * a focused, isolated addition and the two dialogs have no other coupling.
 * No click-outside-to-close: consistent with `InteractionOverlay` (its
 * backdrop has no dismiss handler either), and deliberately so here — an
 * accidental outside click must never confirm leaving the game.
 */
export function ExitConfirmDialog({
  onCancel,
  onConfirmExit,
}: ExitConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const node = dialogRef.current

    // GSAP's tween setup must run before `focus()` — creating a tween after
    // focusing the node resets `document.activeElement` back to the
    // document (see InteractionOverlay.tsx — same empirically-observed
    // ordering requirement applies here).
    if (node) {
      if (prefersReducedMotion()) {
        gsap.set(node, { opacity: 1, y: 0 })
      } else {
        gsap.fromTo(
          node,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
        )
      }
    }
    node?.focus()

    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="exit-confirm-overlay">
      <div
        ref={dialogRef}
        className="exit-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        tabIndex={-1}
      >
        <h2 id="exit-confirm-title">EXIT DHAWAL.OS?</h2>
        <p>
          Your current game session will end and you&rsquo;ll return to the
          landing screen.
        </p>
        <div className="exit-confirm-actions">
          <button
            type="button"
            className="exit-confirm-cancel"
            onClick={onCancel}
          >
            CANCEL
          </button>
          <button
            type="button"
            className="exit-confirm-confirm"
            onClick={onConfirmExit}
          >
            EXIT
          </button>
        </div>
      </div>
    </div>
  )
}
