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

/**
 * One Projects-computer entry. `category` drives the Projects home screen
 * split (EXPERIENCE vs PERSONAL); `role`/`company`/`period`/`image` are
 * optional and simply omitted from the detail view when not verified.
 */
export interface Project {
  id: string
  category: 'experience' | 'personal'
  name: string
  subtitle: string
  role?: string
  company?: string
  period?: string
  image?: string
  description: string
  technologies: string[]
  contributions: string[]
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
