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
  /**
   * The project's picture in `assets/world/Icons/Projects/` — shown beside
   * its name in the project list and at the top of its detail view. Left
   * undefined while no image has been supplied.
   */
  icon?: IconAsset
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
  /**
   * Id of the `projects.ts` entry this role's main product lives in. The
   * Experience panel reads the product's name/subtitle from there instead
   * of duplicating them here.
   */
  projectId?: string
  technologies?: string[]
  responsibilities: string[]
}

/**
 * A pixel-art icon under `assets/world/Icons/`. `file` is the exact filename
 * on disk; `width`/`height` are the PNG's native pixel size, so a panel can
 * reserve the icon's box before the image loads.
 */
export interface IconAsset {
  file: string
  width: number
  height: number
  /**
   * Where the artwork actually sits inside the PNG (native px), when the
   * file carries transparent padding around it. Icons that set this are
   * sized by what is visible rather than by their canvas, so a set drawn
   * with different amounts of padding still reads at one consistent size.
   */
  visible?: { x: number; y: number; width: number; height: number }
}

export type SkillIcon = IconAsset

export interface Skill {
  id: string
  name: string
  /** Left undefined while no icon asset exists — the panel then omits the skill. */
  icon?: SkillIcon
}

export interface SkillGroup {
  id: string
  title: string
  skills: Skill[]
}

export type EducationLevel = 'school' | 'junior-college' | 'bachelor' | 'master'

/**
 * One stage of the Education timeline. Only the stage itself and its icon
 * are required: any detail that has not been supplied is left undefined and
 * simply not rendered — never filled in.
 */
export interface EducationEntry {
  id: string
  level: EducationLevel
  /** The stage heading, e.g. "Master's Degree". */
  title: string
  /** Icon in `assets/world/Icons/EducationIcons/`. */
  icon: IconAsset
  degree?: string
  institution?: string
  university?: string
  period?: string
  grade?: string
}

export type ContactAction = 'email' | 'phone' | 'external' | 'resume'

/** One row of the Contact panel: what is shown, and where activating it goes. */
export interface ContactItem {
  id: string
  label: string
  /** The human-readable value shown beside the icon. */
  value: string
  href: string
  action: ContactAction
  /** Icon in `assets/world/Icons/Contacts/`. */
  icon: IconAsset
}

export interface CertificateEntry {
  id: string
  title: string
  issuer?: string
  date?: string
}
