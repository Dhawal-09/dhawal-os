import { useCallback, useEffect, useState } from 'react'
import { gameEventBridge, type GameEvent } from '../game/events/GameEventBridge'
import './InteractionOverlay.css'

const OPEN_EVENTS = new Set<GameEvent>([
  'OPEN_PROJECTS',
  'OPEN_EXPERIENCE',
  'OPEN_SKILLS',
  'OPEN_EDUCATION',
  'OPEN_CERTIFICATES',
  'OPEN_RESUME',
  'OPEN_ABOUT',
  'OPEN_CONTACT',
])

const LABEL_BY_EVENT: Record<GameEvent, string> = {
  OPEN_PROJECTS: 'Projects',
  OPEN_EXPERIENCE: 'Experience',
  OPEN_SKILLS: 'Skills',
  OPEN_EDUCATION: 'Education',
  OPEN_CERTIFICATES: 'Certificates',
  OPEN_RESUME: 'Resume',
  OPEN_ABOUT: 'About Me',
  OPEN_CONTACT: 'Contact',
  CLOSE_OVERLAY: 'Overlay',
  RETURN_TO_WORLD: 'World',
}

/**
 * The minimal proof that the Pixi -> GameEventBridge -> React path works
 * end to end (PHASE-07-INTERACTION.md). Deliberately generic — it renders
 * whichever `OPEN_*` event arrives, not Projects-specific content, so it
 * never becomes tied to one object or one visual asset. Real portfolio
 * content/panels are Phase 08.
 */
export function InteractionOverlay() {
  const [openEvent, setOpenEvent] = useState<GameEvent | null>(null)

  useEffect(() => {
    return gameEventBridge.subscribe((event) => {
      if (OPEN_EVENTS.has(event)) {
        setOpenEvent(event)
      } else if (event === 'CLOSE_OVERLAY' || event === 'RETURN_TO_WORLD') {
        setOpenEvent(null)
      }
    })
  }, [])

  const close = useCallback(() => {
    setOpenEvent(null)
    gameEventBridge.emit('RETURN_TO_WORLD')
  }, [])

  useEffect(() => {
    if (!openEvent) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openEvent, close])

  if (!openEvent) return null

  return (
    <div className="interaction-overlay" role="dialog" aria-modal="true">
      <div className="interaction-overlay-panel">
        <h2>{LABEL_BY_EVENT[openEvent]}</h2>
        <p>
          Full content lands in Phase 08 — this proves the interaction to
          event-bridge to React path end to end.
        </p>
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}
