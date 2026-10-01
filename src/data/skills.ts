import type { Skill, SkillGroup, SkillIcon } from './types'

function icon(file: string, width: number, height: number): SkillIcon {
  return { file, width, height }
}

/**
 * The Skills panel's technology collection, grouped and ordered as it is
 * shown. Each `icon` names a real file in `assets/world/Icons/` with its
 * native pixel size. A skill without an `icon` has no approved asset yet and
 * is omitted by the panel until one is added — never substituted.
 */
export const skillGroups: SkillGroup[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    skills: [
      { id: 'javascript', name: 'JavaScript', icon: icon('js.png', 170, 158) },
      { id: 'typescript', name: 'TypeScript', icon: icon('ts.png', 167, 166) },
      { id: 'react', name: 'React', icon: icon('react.png', 184, 177) },
      { id: 'html5', name: 'HTML5', icon: icon('html.png', 170, 184) },
      { id: 'css3', name: 'CSS3', icon: icon('css.png', 171, 194) },
      {
        id: 'material-ui',
        name: 'Material UI',
        icon: icon('MUI.png', 275, 192),
      },
      { id: 'gsap', name: 'GSAP', icon: icon('gsap.png', 500, 222) },
    ],
  },
  {
    id: 'backend',
    title: 'Backend',
    skills: [
      { id: 'java', name: 'Java', icon: icon('java.png', 151, 175) },
      { id: 'python', name: 'Python', icon: icon('python.png', 168, 211) },
      { id: 'nodejs', name: 'Node.js', icon: icon('nodejs.png', 264, 241) },
      {
        id: 'express',
        name: 'Express.js',
        icon: icon('express.png', 190, 174),
      },
      { id: 'rest-api', name: 'REST API', icon: icon('api.png', 192, 186) },
    ],
  },
  {
    id: 'database',
    title: 'Database / Storage',
    skills: [
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        icon: icon('postgresql.png', 151, 184),
      },
      { id: 'mysql', name: 'MySQL' },
      {
        id: 'sequelize',
        name: 'Sequelize ORM',
        icon: icon('ORm.png', 258, 269),
      },
      { id: 'sql', name: 'SQL' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools / Development',
    skills: [
      { id: 'git', name: 'Git', icon: icon('git.png', 170, 173) },
      { id: 'github', name: 'GitHub', icon: icon('github.png', 162, 163) },
      { id: 'docker', name: 'Docker' },
      { id: 'postman', name: 'Postman', icon: icon('postman.png', 261, 270) },
      { id: 'vscode', name: 'VS Code', icon: icon('vscode.png', 285, 264) },
      { id: 'chrome-devtools', name: 'Chrome DevTools' },
      { id: 'jira', name: 'Jira' },
    ],
  },
  {
    id: 'cloud-ai',
    title: 'Cloud / AI',
    skills: [
      { id: 'aws', name: 'AWS', icon: icon('aws.png', 185, 175) },
      { id: 'openai', name: 'OpenAI' },
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        icon: icon('copilot.png', 165, 157),
      },
      { id: 'claude', name: 'Claude', icon: icon('claude.png', 168, 153) },
    ],
  },
  {
    id: 'graphics',
    title: 'Graphics / Game',
    skills: [
      { id: 'pixijs', name: 'PixiJS', icon: icon('pixi.png', 434, 251) },
      { id: 'webgl', name: 'WebGL', icon: icon('webgl.png', 156, 162) },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    skills: [
      { id: 'jwt', name: 'JWT', icon: icon('jwt.png', 257, 271) },
      { id: 'rbac', name: 'RBAC', icon: icon('RBAC.png', 340, 307) },
    ],
  },
  {
    id: 'workflow',
    title: 'Engineering / Workflow',
    skills: [
      { id: 'agile', name: 'Agile', icon: icon('agile.png', 260, 291) },
      { id: 'scrum', name: 'Scrum', icon: icon('scrum.png', 442, 307) },
    ],
  },
]

export function validateSkillGroups(groups: SkillGroup[]): void {
  const seenGroupIds = new Set<string>()
  const seenSkillIds = new Set<string>()
  for (const group of groups) {
    if (!group.id || !group.title || group.skills.length === 0) {
      throw new Error(
        `Skill group is missing a required field: ${JSON.stringify(group)}`,
      )
    }
    if (seenGroupIds.has(group.id)) {
      throw new Error(`Duplicate skill group id: "${group.id}"`)
    }
    seenGroupIds.add(group.id)

    for (const skill of group.skills) {
      validateSkill(skill)
      if (seenSkillIds.has(skill.id)) {
        throw new Error(`Duplicate skill id: "${skill.id}"`)
      }
      seenSkillIds.add(skill.id)
    }
  }
}

function validateSkill(skill: Skill): void {
  if (!skill.id || !skill.name) {
    throw new Error(
      `Skill is missing a required field: ${JSON.stringify(skill)}`,
    )
  }
  const { icon: skillIcon } = skill
  if (
    skillIcon &&
    (!skillIcon.file || !(skillIcon.width > 0) || !(skillIcon.height > 0))
  ) {
    throw new Error(`Skill icon is invalid: ${JSON.stringify(skill)}`)
  }
}

validateSkillGroups(skillGroups)
