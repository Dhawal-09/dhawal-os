import { RESUME_PDF_PATH } from './resume'
import type { ContactItem, IconAsset } from './types'

/**
 * The single source of truth for how to reach Dhawal. Every value here is
 * shown publicly, so each one is filled in only once the portfolio owner
 * has supplied it — a field left undefined produces no Contact row at all,
 * never a placeholder or a guessed address/URL.
 *
 * - `email`: a plain address (becomes a `mailto:` link).
 * - `phone`: as it should be displayed, e.g. "+91 98765 43210" (becomes `tel:`).
 * - `linkedin` / `github` / `portfolio`: full `https://` URLs.
 * - `resume`: the shared resume path from `resume.ts`.
 */
export interface ContactProfile {
  email?: string
  phone?: string
  linkedin?: string
  github?: string
  resume?: string
  portfolio?: string
}

export const contactProfile: ContactProfile = {
  email: 'dhawalwani09@gmail.com',
  phone: '+91 9422076443',
  linkedin: 'https://www.linkedin.com/in/dhawal-wani-1351401b7',
  github: 'https://github.com/Dhawal-09',
  resume: RESUME_PDF_PATH,
  portfolio: undefined,
}

function icon(file: string, width: number, height: number): IconAsset {
  return { file, width, height }
}

/** Exact files in `assets/world/Icons/Contacts/`, with their native size. */
const ICONS = {
  email: icon('email.png', 256, 227),
  phone: icon('number.png', 257, 289),
  linkedin: icon('linkdin.png', 269, 238),
  github: icon('gitID.png', 284, 285),
  resume: icon('resume.png', 228, 296),
  portfolio: icon('portfolio.png', 326, 258),
} satisfies Record<keyof ContactProfile, IconAsset>

/** "https://www.github.com/someone/" -> "github.com/someone". */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
}

/** The Contact rows, in display order, for every field the profile defines. */
export function buildContactItems(profile: ContactProfile): ContactItem[] {
  const items: ContactItem[] = []
  const { email, phone, linkedin, github, resume, portfolio } = profile

  if (email) {
    items.push({
      id: 'email',
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      action: 'email',
      icon: ICONS.email,
    })
  }
  if (phone) {
    items.push({
      id: 'phone',
      label: 'Phone',
      value: phone,
      href: `tel:${phone.replace(/[^\d+]/g, '')}`,
      action: 'phone',
      icon: ICONS.phone,
    })
  }
  if (linkedin) {
    items.push({
      id: 'linkedin',
      label: 'LinkedIn',
      value: displayUrl(linkedin),
      href: linkedin,
      action: 'external',
      icon: ICONS.linkedin,
    })
  }
  if (github) {
    items.push({
      id: 'github',
      label: 'GitHub',
      value: displayUrl(github),
      href: github,
      action: 'external',
      icon: ICONS.github,
    })
  }
  if (resume) {
    items.push({
      id: 'resume',
      label: 'Resume',
      value: 'View / download PDF',
      href: resume,
      action: 'resume',
      icon: ICONS.resume,
    })
  }
  if (portfolio) {
    items.push({
      id: 'portfolio',
      label: 'Portfolio',
      value: displayUrl(portfolio),
      href: portfolio,
      action: 'external',
      icon: ICONS.portfolio,
    })
  }
  return items
}

export const contactItems: ContactItem[] = buildContactItems(contactProfile)

export interface ContactLink {
  label: string
  url: string
}

/**
 * The profile links (LinkedIn, GitHub, portfolio) on their own, for the
 * landing screen social row — derived from the same profile, never a second
 * list.
 */
export const contactLinks: ContactLink[] = contactItems
  .filter((item) => item.action === 'external')
  .map((item) => ({ label: item.label, url: item.href }))
