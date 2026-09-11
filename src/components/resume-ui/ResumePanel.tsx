/** RESUME_PDF_PATH per `docs/CONTENT.md` — the static asset path is fixed even though the file itself has not been supplied yet (see `ASSET_SPEC.md`). */
const RESUME_PDF_PATH = '/resume.pdf'

/**
 * Works independent of the game (INTERACTION_SPEC.md / CONTENT.md "Resume")
 * — a plain link to a static asset, not tied to any game state. The PDF
 * itself is a pending asset (`ASSET_SPEC.md`); this is the integration
 * point that will start working the moment it is supplied, with no code
 * change required.
 */
export function ResumePanel() {
  return (
    <div className="panel-section">
      <p>View or download the resume as a PDF.</p>
      <a
        className="panel-button"
        href={RESUME_PDF_PATH}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open resume (PDF)
      </a>
    </div>
  )
}
