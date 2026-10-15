/**
 * The single source of truth for the resume asset (CONTENT.md "Resume" /
 * ASSET_SPEC.md), shared by every place that links to it (`ResumePanel`,
 * `LandingScreen`, `contact.ts`) so the path and link semantics are never
 * duplicated. The file is the real PDF, served as a static asset from
 * `public/assets/resume/` — replacing that file is the only step needed to
 * update the resume everywhere.
 */
export const RESUME_PDF_PATH = '/assets/resume/dhawal-wani-resume.pdf'

/** The filename the browser saves the PDF under on "Download Resume". */
export const RESUME_DOWNLOAD_FILENAME = 'Dhawal-Wani-Resume.pdf'
