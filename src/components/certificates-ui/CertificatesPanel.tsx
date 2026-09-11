import { certificates } from '../../data/certificates'

/**
 * Renders only from `src/data/certificates.ts`. That file is currently
 * empty — `docs/CONTENT.md` names no certificates — so this renders an
 * explicit pending state rather than fabricated entries (see the Phase 08
 * final report / `ASSET_SPEC.md`).
 */
export function CertificatesPanel() {
  if (certificates.length === 0) {
    return (
      <div className="panel-section">
        <p className="panel-empty">
          Certificate details are not yet available.
        </p>
      </div>
    )
  }

  return (
    <div className="panel-section">
      <ul className="panel-list">
        {certificates.map((entry) => (
          <li key={entry.id} className="panel-list-item">
            <h4>{entry.title}</h4>
            <p className="panel-meta">
              {[entry.issuer, entry.date].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
