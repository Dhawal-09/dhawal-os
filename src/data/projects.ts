import { experience } from './experience'
import type { Project } from './types'

/**
 * Role + period for an experience project, read from `experience.ts` so
 * those values are defined once. Throws on an unknown id so a typo can't
 * silently render an empty role.
 */
function roleFrom(experienceId: string): { role: string; period: string } {
  const entry = experience.find((e) => e.id === experienceId)
  if (!entry) {
    throw new Error(`Unknown experience id: "${experienceId}"`)
  }
  return { role: entry.role, period: entry.period }
}

/**
 * Transcribed only from `docs/CONTENT.md` "Professional experience",
 * "FocusGuard" and "DHAWAL.OS" sections — no employer names, links, or
 * metrics are added beyond what that document states. `company` is left
 * undefined because CONTENT.md names no employer. FocusGuard is `category:
 * "personal"` and must never be merged with the experience entries
 * (CONTENT.md "must appear only under PERSONAL PROJECTS").
 */
export const projects: Project[] = [
  {
    id: 'unifi',
    category: 'experience',
    name: 'Unifi',
    subtitle: 'Financial, Asset & Modem Management System',
    ...roleFrom('software-engineer'),
    description:
      'RESTful APIs for asset, modem and financial management, with role-based access control, request validation, Intercard API integration, and cron-based revenue synchronization.',
    technologies: [
      'React.js',
      'Node.js',
      'Express.js',
      'PostgreSQL',
      'Sequelize ORM',
      'Material UI',
    ],
    contributions: [
      'RESTful APIs for asset, modem and financial management',
      'Role-based access control (RBAC) and request validation',
      'Intercard API integration',
      'Cron-based revenue synchronization',
      'Reusable React reconciliation dashboards',
      'Production debugging using SQL queries, Postman, Chrome DevTools, logs, and Jira RCA',
    ],
    featured: true,
  },
  {
    id: 'nexcrm',
    category: 'experience',
    name: 'NexCRM',
    subtitle: 'Lead Nurturing & Management Platform',
    ...roleFrom('apprentice'),
    description:
      'Full-stack multi-tenant CRM with RBAC, JWT authentication, lead scoring, automated email sequences, and rule-based lead assignment.',
    technologies: [
      'TypeScript',
      'Material UI',
      'PostgreSQL',
      'Sequelize ORM',
      'Nodemailer',
      'JWT',
    ],
    contributions: [
      'Full-stack multi-tenant CRM',
      'Role-based access control (RBAC)',
      'JWT authentication',
      'REST APIs',
      'Lead scoring based on user behavior',
      'Automated email sequences',
      'Rule-based lead assignment',
    ],
  },
  {
    id: 'airvision',
    category: 'experience',
    name: 'AIRVISION',
    subtitle: 'Real-Time Air Quality Monitoring System',
    description:
      'Public-facing web application displaying real-time AQI by location, using data from IoT sensor kits deployed on plants.',
    technologies: [],
    contributions: [
      'Public-facing web application',
      'Real-time AQI by location',
      'Data sourced from IoT sensor kits deployed on plants',
    ],
  },
  {
    id: 'focusguard',
    category: 'personal',
    name: 'FocusGuard',
    subtitle: 'Real-Time Computer-Vision Focus & Distraction Monitor',
    description:
      'Real-time webcam-based focus and distraction monitor: phone distraction, drowsiness/eye-closure, head-orientation diversion, and user-away detection, built on a deterministic priority state machine.',
    technologies: [
      'Python',
      'OpenCV',
      'Ultralytics YOLO11n',
      'MediaPipe Face Landmarker',
      'NumPy',
      'Pygame',
      'PyYAML',
      'pytest',
    ],
    contributions: [
      'Phone distraction detection',
      'Drowsiness / eye-closure detection',
      'Head-orientation diversion detection',
      'User-away detection',
      'Real-time webcam processing',
      'Architecture: Perception → Temporal Filtering → State Machine → Event System → UI',
      'YOLO11n for person/phone detection; MediaPipe Face Landmarker for facial landmarks',
      'EAR / eye-openness analysis; head pose yaw/pitch',
      'Automatic CPU/CUDA selection',
      'Timestamp-based confirmation/clear durations, hysteresis, cooldown',
      'Deterministic priority state machine: AWAY > PHONE_DISTRACTION > DROWSINESS_SIGNAL > ATTENTION_DIVERTED > FOCUSED',
      'Event-driven warnings with Pygame audio and cooldowns',
      'Live dashboard and debug overlay',
      'Focus score, event counts, longest focus streak',
      'JSON session summary',
      'Local, privacy-first architecture',
      'pytest test suite',
    ],
    featured: true,
  },
  {
    id: 'dhawal-os',
    category: 'personal',
    name: 'DHAWAL.OS',
    subtitle: 'Interactive Game-World Developer Portfolio',
    description:
      'An interactive 2D pixel-art portfolio presented as a playable developer workspace: visitors explore a small game world and interact with objects that reveal portfolio information.',
    technologies: [
      'React',
      'TypeScript',
      'Vite',
      'PixiJS v8',
      'GSAP',
      'CSS',
      'Vitest',
      'Playwright',
    ],
    contributions: [
      'Real-time 2D world rendered with PixiJS',
      'Player movement with a collision system and a following camera',
      'Proximity interactions that open portfolio panels with E',
      'React portfolio UI connected to the game through an explicit event bridge',
      'World input paused while a panel is open and resumed on close',
      'Responsive desktop and mobile layouts',
      'Unit tests with Vitest and end-to-end tests with Playwright',
    ],
  },
]

/** Fails fast on authoring mistakes — no panel should ever render from malformed/empty data. */
export function validateProjects(entries: Project[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    if (!entry.id || !entry.name || !entry.subtitle || !entry.description) {
      throw new Error(
        `Project entry is missing a required field: ${JSON.stringify(entry)}`,
      )
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate project id: "${entry.id}"`)
    }
    seenIds.add(entry.id)
  }
}

validateProjects(projects)
