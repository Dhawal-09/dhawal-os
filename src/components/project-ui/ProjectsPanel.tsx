import { useEffect, useState } from 'react'
import type { PanelContentProps } from '../../app/panelHeader'
import { projects } from '../../data/projects'
import type { Project } from '../../data/types'
import './ProjectsPanel.css'

export type ProjectsView = 'home' | 'experience' | 'personal' | 'project-detail'

type ProjectCategory = Project['category']

const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  experience: 'Experience Projects',
  personal: 'Personal Projects',
}

const CATEGORY_HINT: Record<ProjectCategory, string> = {
  experience: 'Professional / work projects',
  personal: 'Personal / side projects',
}

const CATEGORIES: ProjectCategory[] = ['experience', 'personal']

/** How many technologies a personal-project card lists before "+N". */
const CARD_TECH_LIMIT = 3

function projectsIn(category: ProjectCategory): Project[] {
  return projects.filter((p) => p.category === category)
}

/**
 * Kongtext has no glyphs for "–" or "·" (they render as blank gaps), so
 * text shown in the pixel font uses ASCII "-" and "/" instead.
 */
function pixelText(text: string): string {
  return text.replace(/\s*–\s*/g, ' - ')
}

const PIXEL_SEPARATOR = ' / '

function techSummary(technologies: string[]): string {
  const shown = technologies.slice(0, CARD_TECH_LIMIT).join(PIXEL_SEPARATOR)
  const rest = technologies.length - CARD_TECH_LIMIT
  return rest > 0 ? `${shown} +${rest}` : shown
}

/**
 * The Projects computer: PROJECTS HOME → EXPERIENCE/PERSONAL list → single
 * project detail, all inside the one shared overlay shell. Renders only
 * from `src/data/projects.ts` — no project content is hardcoded here.
 * Experience and personal projects are never merged (CONTENT.md —
 * FocusGuard only under PERSONAL PROJECTS). Title and Back live in the
 * shell header via `setHeader`; Close/Escape stay owned by the shell.
 */
export function ProjectsPanel({ setHeader }: PanelContentProps) {
  const [view, setView] = useState<ProjectsView>('home')
  const [listCategory, setListCategory] =
    useState<ProjectCategory>('experience')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )

  const selectedProject =
    view === 'project-detail'
      ? projects.find((p) => p.id === selectedProjectId)
      : undefined

  useEffect(() => {
    if (view === 'home') {
      setHeader({ title: 'Projects' })
    } else if (view === 'project-detail' && selectedProject) {
      setHeader({
        title: selectedProject.name,
        onBack: () => setView(selectedProject.category),
      })
    } else {
      setHeader({
        title: CATEGORY_LABEL[listCategory],
        onBack: () => setView('home'),
      })
    }
  }, [view, listCategory, selectedProject, setHeader])

  // Restore the shell's default header when Projects unmounts (closed, or
  // replaced by a different section).
  useEffect(() => () => setHeader(null), [setHeader])

  const openCategory = (category: ProjectCategory): void => {
    setListCategory(category)
    setView(category)
  }

  const openProject = (project: Project): void => {
    setListCategory(project.category)
    setSelectedProjectId(project.id)
    setView('project-detail')
  }

  if (view === 'home') {
    return (
      <div className="projects-home">
        <h3 className="panel-group-title">Select project type</h3>
        <ul className="projects-folders">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <button
                type="button"
                className="projects-folder"
                onClick={() => openCategory(category)}
              >
                <span className="projects-folder-name">
                  {CATEGORY_LABEL[category]}
                </span>
                <span className="projects-folder-hint">
                  {CATEGORY_HINT[category]}
                </span>
                <span className="projects-folder-count">
                  {projectsIn(category).length} files
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} />
  }

  return (
    <ul className="projects-cards" aria-label={CATEGORY_LABEL[listCategory]}>
      {projectsIn(listCategory).map((project) => {
        const meta =
          project.category === 'personal'
            ? techSummary(project.technologies)
            : pixelText(
                [project.role, project.period]
                  .filter(Boolean)
                  .join(PIXEL_SEPARATOR),
              )
        return (
          <li key={project.id}>
            <button
              type="button"
              className="projects-card"
              onClick={() => openProject(project)}
            >
              <span className="projects-card-name">{project.name}</span>
              <span className="projects-card-subtitle">{project.subtitle}</span>
              {meta && <span className="projects-card-meta">{meta}</span>}
              <span className="projects-card-view" aria-hidden="true">
                View &gt;
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = project.image !== undefined && !imageFailed

  const facts: [label: string, value: string | undefined][] = [
    ['Role', project.role],
    ['Company', project.company],
    ['Period', project.period],
  ]

  return (
    <article className="project-detail">
      <div className="project-detail-top">
        <div className="project-detail-image">
          {showImage ? (
            <img
              src={project.image}
              alt=""
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="project-detail-image-placeholder"
              aria-hidden="true"
            >
              <span>Project</span>
              <span>Image</span>
            </div>
          )}
        </div>

        <div className="project-detail-identity">
          <p className="project-detail-subtitle">{project.subtitle}</p>
          <dl className="project-detail-facts">
            {facts.map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{pixelText(value)}</dd>
                </div>
              ) : null,
            )}
            <div>
              <dt>Type</dt>
              <dd>
                {project.category === 'experience'
                  ? 'Experience project'
                  : 'Personal project'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="project-detail-section">
        <h3 className="panel-group-title">Overview</h3>
        <p>{project.description}</p>
      </section>

      {project.technologies.length > 0 && (
        <section className="project-detail-section">
          <h3 className="panel-group-title">Technology</h3>
          <ul className="project-tech-chips">
            {project.technologies.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="project-detail-section">
        <h3 className="panel-group-title">Contributions</h3>
        <ul className="project-contributions">
          {project.contributions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </article>
  )
}
