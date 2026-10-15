import { RESUME_DOWNLOAD_FILENAME, RESUME_PDF_PATH } from '../../data/resume'
import './ResumePanel.css'
import {
  canPreviewPdfInline,
  useResumeAvailability,
} from './resumeAvailability'

/**
 * The resume viewer: the real PDF shown inline, plus Download and Open in
 * New Tab. Nothing here restates the resume's content — the PDF is the one
 * source. Opened from the Education room's file box, the HUD menu, or
 * anywhere else that emits `OPEN_RESUME`; the shell (InteractionOverlay)
 * owns Close, Escape, focus and pausing the world.
 *
 * The file is checked before it's offered: a missing PDF shows a clear
 * message instead of a broken preview or a download of the wrong file.
 */
export function ResumePanel() {
  const status = useResumeAvailability(RESUME_PDF_PATH)
  const canPreview = canPreviewPdfInline()

  return (
    <div className="panel-section resume">
      <p className="panel-meta panel-subtitle">Curriculum Vitae · PDF</p>

      {status !== 'unavailable' && (
        <div className="resume-actions">
          <a
            className="panel-button resume-button"
            href={RESUME_PDF_PATH}
            download={RESUME_DOWNLOAD_FILENAME}
          >
            Download Resume
          </a>
          <a
            className="panel-button resume-button resume-button--secondary"
            href={RESUME_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF in New Tab
          </a>
        </div>
      )}

      <div className="resume-preview">
        {status === 'checking' && (
          <p className="resume-preview-note panel-meta" role="status">
            Loading resume…
          </p>
        )}
        {status === 'available' && canPreview && (
          // Kept out of the Tab order: keys pressed inside a PDF viewer
          // never reach the page, so Escape couldn't close the panel from
          // there. Keyboard users get the same file via the buttons above.
          <iframe
            className="resume-preview-frame"
            src={`${RESUME_PDF_PATH}#view=FitH`}
            title="Resume PDF preview"
            tabIndex={-1}
          />
        )}
        {status === 'available' && !canPreview && (
          <p className="resume-preview-note">
            This browser can&apos;t show the PDF here. Open it in a new tab or
            download it above.
          </p>
        )}
        {status === 'unavailable' && (
          <p className="resume-preview-note is-error" role="alert">
            The resume file couldn&apos;t be loaded right now, so it can&apos;t
            be viewed or downloaded. Please try again later.
          </p>
        )}
      </div>
    </div>
  )
}
