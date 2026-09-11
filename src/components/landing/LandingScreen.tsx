import { about } from '../../data/about'
import { contactLinks } from '../../data/contact'
import { RESUME_PDF_PATH } from '../../data/resume'
import './LandingScreen.css'

export interface LandingScreenProps {
  onStartJourney: () => void
}

/**
 * The application's entry point (PHASE-08.5 "Landing screen"). A clean
 * temporary/development presentation — no final room/character artwork
 * exists yet (see `ASSET_SPEC.md`); this establishes the composition and
 * copy so approved art can be dropped in later without restructuring.
 * Copy is taken verbatim from `docs/DESIGN_SYSTEM.md` "Landing experience"
 * (not invented); the supporting introduction reuses the already-verified
 * `src/data/about.ts` summary rather than duplicating/inventing content.
 */
export function LandingScreen({ onStartJourney }: LandingScreenProps) {
  return (
    <div className="landing-screen">
      <header className="landing-header">
        <span className="landing-brand">DHAWAL.OS</span>
      </header>

      <div className="landing-world-placeholder" aria-hidden="true">
        <span>DEVELOPMENT PLACEHOLDER</span>
        <span>No approved room artwork yet</span>
      </div>

      <div className="landing-intro">
        <h1>
          HI, I&rsquo;M DHAWAL <span aria-hidden="true">→</span>
        </h1>
        <p className="landing-role">{about.title}</p>
        <p className="landing-summary">{about.summary}</p>

        <div className="landing-actions">
          <button
            type="button"
            className="landing-cta"
            onClick={onStartJourney}
          >
            START JOURNEY
          </button>
          <a
            className="landing-secondary"
            href={RESUME_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
          >
            VIEW RESUME
          </a>
        </div>

        {contactLinks.length > 0 && (
          <nav className="landing-social" aria-label="Social links">
            {contactLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
