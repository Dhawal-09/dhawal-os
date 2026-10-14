import type { ExperienceEntry } from './types'

/**
 * Transcribed only from `docs/CONTENT.md` "Professional experience". The
 * project write-ups live in `projects.ts` (`category: "experience"`), which
 * reads each project's role/period from here by id (Unifi → Software
 * Engineer, AIRVISION → Apprentice) rather than duplicating them;
 * `projectId` is the reverse link the Experience panel uses to name each
 * role's product.
 *
 * Ordered newest first — the Experience panel renders this array as-is, so
 * the order here IS the reverse-chronological timeline order.
 */
export const experience: ExperienceEntry[] = [
  {
    id: 'software-engineer',
    role: 'Software Engineer',
    period: 'Jul 2025 – Jul 2026',
    company: 'Haptiq Lab',
    projectId: 'unifi',
    responsibilities: [
      'RESTful APIs for asset, modem and financial management',
      'Role-based access control (RBAC) and request validation',
      'Intercard API integration',
      'Cron-based revenue synchronization',
      'Reusable React reconciliation dashboards',
      'Production debugging: SQL queries, Postman, Chrome DevTools, logs, Jira RCA',
    ],
    technologies: [
      'React.js',
      'Node.js',
      'Express.js',
      'PostgreSQL',
      'Sequelize ORM',
      'Material UI',
    ],
  },
  {
    id: 'apprentice',
    role: 'Apprentice',
    period: 'Nov 2024 – Jun 2025',
    company: 'Haptiq Lab',
    projectId: 'airvision',
    // From the resume. It names no technologies for this role, so none are
    // listed (the panel omits the Technologies section).
    responsibilities: [
      'Contributed to a public-facing web application displaying real-time Air Quality Index (AQI) data by location',
      'AQI data collected from IoT sensor kits deployed on plants',
      'Hands-on exposure to full-stack development, version control, and Agile feature delivery in a production team environment',
    ],
  },
]

export function validateExperience(entries: ExperienceEntry[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    if (
      !entry.id ||
      !entry.role ||
      !entry.period ||
      entry.responsibilities.length === 0
    ) {
      throw new Error(
        `Experience entry is missing a required field: ${JSON.stringify(entry)}`,
      )
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate experience id: "${entry.id}"`)
    }
    seenIds.add(entry.id)
  }
}

validateExperience(experience)
