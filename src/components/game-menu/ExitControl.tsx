import { useCallback, useState } from 'react'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { ExitConfirmDialog } from './ExitConfirmDialog'
import './ExitControl.css'

export interface ExitControlProps {
  /** Called only after the visitor confirms in the dialog — never on the bare EXIT click. */
  onExitConfirmed: () => void
}

/**
 * The smallest appropriate EXIT control for the GAME experience
 * (PHASE-08.5 follow-up "Exit button") — no full in-game menu/HUD system
 * exists yet (`components/game-menu/` and `components/hud/` are otherwise
 * unestablished), so this is a single always-visible button plus its
 * confirmation dialog, not a menu. Reuses the existing `GameEventBridge`
 * (`PAUSE_WORLD`/`RETURN_TO_WORLD`) to pause/resume world input while the
 * dialog is open, exactly like a portfolio panel does — no second event
 * system, no second pause mechanism.
 */
export function ExitControl({ onExitConfirmed }: ExitControlProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const openConfirm = useCallback(() => {
    setConfirmOpen(true)
    gameEventBridge.emit('PAUSE_WORLD')
  }, [])

  const cancel = useCallback(() => {
    setConfirmOpen(false)
    gameEventBridge.emit('RETURN_TO_WORLD')
  }, [])

  const confirmExit = useCallback(() => {
    setConfirmOpen(false)
    onExitConfirmed()
  }, [onExitConfirmed])

  return (
    <>
      <button type="button" className="exit-control" onClick={openConfirm}>
        EXIT
      </button>
      {confirmOpen && (
        <ExitConfirmDialog onCancel={cancel} onConfirmExit={confirmExit} />
      )}
    </>
  )
}
