import type { SkillGroup } from './types'

/** Transcribed only from `docs/CONTENT.md` "Skills" — one group per bulleted category. */
export const skillGroups: SkillGroup[] = [
  {
    id: 'programming',
    title: 'Programming',
    skills: ['JavaScript (ES6+)', 'TypeScript', 'Java', 'Python', 'SQL'],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    skills: ['React.js', 'HTML5', 'CSS3', 'Material UI', 'GSAP'],
  },
  {
    id: 'backend',
    title: 'Backend',
    skills: [
      'Node.js',
      'Express.js',
      'REST APIs',
      'Cron Jobs',
      'Express Middleware',
    ],
  },
  {
    id: 'database',
    title: 'Database',
    skills: ['PostgreSQL', 'Sequelize ORM', 'MySQL', 'Database Migrations'],
  },
  {
    id: 'auth-security',
    title: 'Auth / Security',
    skills: ['JWT', 'Role-Based Access Control'],
  },
  {
    id: 'ai-assisted',
    title: 'AI-assisted development',
    skills: ['GitHub Copilot', 'Agentic Development Workflows'],
  },
  {
    id: 'tools',
    title: 'Tools',
    skills: [
      'Git',
      'GitHub',
      'Chrome DevTools',
      'Postman',
      'Jira',
      'VS Code',
      'Nodemailer',
      'Docker',
    ],
  },
  { id: 'cloud', title: 'Cloud', skills: ['AWS (Basic)'] },
  {
    id: 'methodology',
    title: 'Methodology',
    skills: ['Agile', 'Scrum', 'Sprint-Based Development'],
  },
]

export function validateSkillGroups(groups: SkillGroup[]): void {
  const seenIds = new Set<string>()
  for (const group of groups) {
    if (!group.id || !group.title || group.skills.length === 0) {
      throw new Error(
        `Skill group is missing a required field: ${JSON.stringify(group)}`,
      )
    }
    if (seenIds.has(group.id)) {
      throw new Error(`Duplicate skill group id: "${group.id}"`)
    }
    seenIds.add(group.id)
  }
}

validateSkillGroups(skillGroups)
