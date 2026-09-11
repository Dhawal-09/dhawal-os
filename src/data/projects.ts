import type { Project } from './types'

/**
 * Transcribed only from `docs/CONTENT.md` "Professional experience" and
 * "FocusGuard" sections — no employer names, dates, links, or metrics are
 * added beyond what that document states. FocusGuard is `category:
 * "personal"` and must never be merged with the professional entries
 * (CONTENT.md "must appear only under PERSONAL PROJECTS").
 */
export const projects: Project[] = [
  {
    id: 'unifi',
    title: 'Unifi — Financial, Asset & Modem Management System',
    category: 'professional',
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
    highlights: [
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
    title: 'NexCRM — Lead Nurturing & Management Platform',
    category: 'professional',
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
    highlights: [
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
    title: 'AIRVISION — Real-Time Air Quality Monitoring System',
    category: 'professional',
    description:
      'Public-facing web application displaying real-time AQI by location, using data from IoT sensor kits deployed on plants.',
    technologies: [],
    highlights: [
      'Public-facing web application',
      'Real-time AQI by location',
      'Data sourced from IoT sensor kits deployed on plants',
    ],
  },
  {
    id: 'focusguard',
    title: 'FocusGuard — Real-Time Computer-Vision Focus & Distraction Monitor',
    category: 'personal',
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
    highlights: [
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
]

/** Fails fast on authoring mistakes — no panel should ever render from malformed/empty data. */
export function validateProjects(entries: Project[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    if (!entry.id || !entry.title || !entry.description) {
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
