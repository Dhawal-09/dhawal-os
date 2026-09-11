import { contactLinks } from '../../data/contact'

/**
 * Renders only from `src/data/contact.ts`. That file is currently empty —
 * `docs/CONTENT.md` defines no verified contact address or social links —
 * so this renders an explicit pending state rather than a fabricated email
 * or profile URL (see the Phase 08 final report).
 */
export function ContactPanel() {
  if (contactLinks.length === 0) {
    return (
      <div className="panel-section">
        <p className="panel-empty">Contact details are not yet available.</p>
      </div>
    )
  }

  return (
    <div className="panel-section">
      <ul className="panel-list">
        {contactLinks.map((link) => (
          <li key={link.url} className="panel-list-item">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
