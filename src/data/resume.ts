/**
 * The single source of truth for the resume asset path (CONTENT.md
 * "Resume" / ASSET_SPEC.md), shared by every place that links to it
 * (`ResumePanel`, `LandingScreen`) so the path and link semantics are
 * never duplicated. The PDF itself has not been supplied to the repository
 * yet — the link is a live integration point that starts working the
 * moment it is added, with no code change required.
 */
export const RESUME_PDF_PATH = '/resume.pdf'
