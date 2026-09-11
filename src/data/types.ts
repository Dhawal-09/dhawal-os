/**
 * Shared shapes for every portfolio content file under `src/data/`. Content
 * is intentionally separate from rendering (ARCHITECTURE.md "Separation of
 * concerns") — panels read these and render generically; nothing here is
 * Pixi- or React-specific.
 */

export interface ProjectLink {
  label: string
  url: string
}

/** The exact shape required by PHASE-08-PORTFOLIO-UI.md "Implementation guidance". */
export interface Project {
  id: string
  title: string
  category: 'professional' | 'personal'
  description: string
  technologies: string[]
  highlights: string[]
  links?: ProjectLink[]
  featured?: boolean
}

export interface ExperienceEntry {
  id: string
  role: string
  period: string
  /** Left undefined where CONTENT.md does not name an employer — never fabricated. */
  company?: string
  technologies?: string[]
  responsibilities: string[]
}

export interface SkillGroup {
  id: string
  title: string
  skills: string[]
}

export interface EducationEntry {
  id: string
  degree: string
  institution: string
  period: string
  detail?: string
}

export interface CertificateEntry {
  id: string
  title: string
  issuer?: string
  date?: string
}
