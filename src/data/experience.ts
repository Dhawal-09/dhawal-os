import type { ExperienceEntry } from './types'

/**
 * Transcribed only from `docs/CONTENT.md` "Professional experience". That
 * document names no employer, so `company` is left undefined. The project
 * write-ups live in `projects.ts` (`category: "experience"`), which reads
 * each project's role/period from here by id (Unifi → Software Engineer,
 * NexCRM → Apprentice) rather than duplicating them.
 */
export const experience: ExperienceEntry[] = [
  {
    id: 'software-engineer',
    role: 'Software Engineer',
    period: 'Jul 2025 – Jul 2026',
    responsibilities: [
      'RESTful APIs for asset, modem and financial management',
      'Role-based access control (RBAC) and request validation',
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
      'TypeScript',
    ],
  },
  {
    id: 'apprentice',
    role: 'Apprentice',
    period: 'Nov 2024 – Jun 2025',
    responsibilities: [
      'Full-stack multi-tenant CRM development',
      'JWT authentication and REST APIs',
      'Lead scoring and automated email sequences',
    ],
    technologies: [
      'TypeScript',
      'Material UI',
      'PostgreSQL',
      'Sequelize ORM',
      'Nodemailer',
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
