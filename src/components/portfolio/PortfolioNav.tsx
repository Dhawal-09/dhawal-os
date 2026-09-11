import {
  gameEventBridge,
  type GameEvent,
} from '../../game/events/GameEventBridge'
import './PortfolioNav.css'

const SECTIONS: Array<{ event: GameEvent; label: string }> = [
  { event: 'OPEN_ABOUT', label: 'About Me' },
  { event: 'OPEN_PROJECTS', label: 'Projects' },
  { event: 'OPEN_EXPERIENCE', label: 'Experience' },
  { event: 'OPEN_SKILLS', label: 'Skills' },
  { event: 'OPEN_EDUCATION', label: 'Education' },
  { event: 'OPEN_CERTIFICATES', label: 'Certificates' },
  { event: 'OPEN_CONTACT', label: 'Contact' },
  { event: 'OPEN_RESUME', label: 'Resume' },
]

/**
 * Conventional, non-game navigation into every portfolio section
 * (ACCESSIBILITY.md "A recruiter must be able to bypass exploration
 * entirely" — persistent/direct access via menu/resume-button/conventional
 * navigation). Plain semantic buttons reusing the same `GameEventBridge`
 * events the world interactions emit (INTERACTION_SPEC.md) — this is
 * deliberately not a full pixel-art landing screen/in-game menu (those are
 * a separate, later concern per DESIGN_SYSTEM.md); it is the minimal
 * always-available bypass this phase's acceptance criteria require.
 */
export function PortfolioNav() {
  return (
    <nav className="portfolio-nav" aria-label="Portfolio sections">
      <ul>
        {SECTIONS.map((section) => (
          <li key={section.event}>
            <button
              type="button"
              onClick={() => gameEventBridge.emit(section.event)}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
