export interface ContactLink {
  label: string
  url: string
}

/**
 * `docs/CONTENT.md` defines no verified contact address or social links for
 * the Contact panel (unlike Projects/Experience/Skills/Education, which are
 * fully sourced there) — inventing an email or profile URL would violate
 * the "never invent... links" rule. Left empty until the project owner
 * supplies verified contact details; `ContactPanel` renders an explicit
 * "not yet available" state instead. See the Phase 08 final report.
 */
export const contactLinks: ContactLink[] = []
