import emailIconUrl from '../../../assets/world/Icons/Contacts/email.png'
import githubIconUrl from '../../../assets/world/Icons/Contacts/gitID.png'
import linkedinIconUrl from '../../../assets/world/Icons/Contacts/linkdin.png'
import resumeIconUrl from '../../../assets/world/Icons/Contacts/resume.png'
import { about } from '../../data/about'
import { landingContactItems } from '../../data/contact'
import './LandingScreen.css'

/**
 * Icon + accessible name for each landing contact channel
 * (`landingContactItems` in `src/data/contact.ts` owns which channels show,
 * their order and their links — nothing is duplicated here).
 */
const LANDING_CONTACT_ICONS: Record<string, { src: string; label: string }> = {
  email: { src: emailIconUrl, label: 'Email' },
  linkedin: { src: linkedinIconUrl, label: 'LinkedIn' },
  github: { src: githubIconUrl, label: 'GitHub' },
  resume: { src: resumeIconUrl, label: 'View resume' },
}

export interface LandingScreenProps {
  onStartJourney: () => void
}

/**
 * The application's entry point (PHASE-08.5 "Landing screen"), presented
 * over the approved cover art (assets/Cover/Cover1-clean.png — see
 * LandingScreen.css).
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

      {/* Leaves the cover art (the screen's background) showing through. */}
      <div className="landing-world" aria-hidden="true" />

      <div className="landing-intro">
        <h1>
          Hi,I&rsquo;M DHAWAL <span aria-hidden="true"></span>
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
        </div>

        {landingContactItems.length > 0 && (
          <nav className="landing-social" aria-label="Contact links">
            {landingContactItems.map((item) => {
              const icon = LANDING_CONTACT_ICONS[item.id]
              // Email opens the mail app in place; everything else is a new tab.
              const newTab = item.action !== 'email'
              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-label={icon.label}
                  title={icon.label}
                  {...(newTab && {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
                >
                  <img src={icon.src} alt="" />
                </a>
              )
            })}
          </nav>
        )}

        <p className="landing-location">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.4 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
          </svg>
          {about.location}
        </p>
      </div>
    </div>
  )
}
