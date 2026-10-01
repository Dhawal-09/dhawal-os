import { useEffect, useState } from 'react'
import type { PanelContentProps } from '../../app/panelHeader'
import { projects } from '../../data/projects'
import type { Project } from '../../data/types'
import { useIconUrls, type IconUrls } from '../panel-icons/iconUrls'
import { PanelIcon } from '../panel-icons/PanelIcon'
import './ProjectsPanel.css'

/** The icon URL map lives in its own on-demand chunk — see `useIconUrls`. */
const loadIconUrls = () =>
  import('./projectIconUrls').then((module) => module.projectIconUrls)

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
  // The map is small; each picture is only fetched once a list or detail
  // view actually mounts an <img> for it.
  const iconUrls = useIconUrls(loadIconUrls)

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
    return <ProjectDetail project={selectedProject} iconUrls={iconUrls} />
  }

  const listed = projectsIn(listCategory)
  // If any project in this list has a picture, every card keeps the picture
  // column so the names line up.
  const showIcons = listed.some((project) => project.icon)

  return (
    <ul className="projects-cards" aria-label={CATEGORY_LABEL[listCategory]}>
      {listed.map((project) => {
        // Kept as separate parts (role, period) so the mobile card can stack
        // them; on desktop they read as one "role / period" line.
        const metaParts =
          project.category === 'personal'
            ? [techSummary(project.technologies)]
            : [project.role, project.period]
                .filter((part): part is string => Boolean(part))
                .map(pixelText)
        return (
          <li key={project.id}>
            <button
              type="button"
              className={showIcons ? 'projects-card has-icon' : 'projects-card'}
              onClick={() => openProject(project)}
            >
              {showIcons && (
                <span className="projects-card-icon">
                  {project.icon && (
                    // Decorative: the name beside it identifies the project.
                    <PanelIcon
                      icon={project.icon}
                      src={iconUrls?.[project.icon.file]}
                      alt=""
                    />
                  )}
                </span>
              )}
              <span className="projects-card-text">
                <span className="projects-card-name">{project.name}</span>
                <span className="projects-card-subtitle">
                  {project.subtitle}
                </span>
                {metaParts.length > 0 && (
                  <span className="projects-card-meta">
                    {metaParts.map((part, index) => (
                      <span key={part} className="projects-card-meta-part">
                        {index > 0 && (
                          <span className="projects-card-meta-separator">
                            {PIXEL_SEPARATOR}
                          </span>
                        )}
                        {part}
                      </span>
                    ))}
                  </span>
                )}
              </span>
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

interface ProjectDetailProps {
  project: Project
  /** `null` until the icon URL map has loaded; the layout does not wait. */
  iconUrls: IconUrls | null
}

function ProjectDetail({ project, iconUrls }: ProjectDetailProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = project.image !== undefined && !imageFailed
  const icon = showImage ? undefined : project.icon

  const facts: [label: string, value: string | undefined][] = [
    ['Role', project.role],
    ['Company', project.company],
    ['Period', project.period],
  ]

  return (
    <article className="project-detail">
      <div className="project-detail-top">
        <div
          className={
            icon ? 'project-detail-image has-icon' : 'project-detail-image'
          }
        >
          {icon ? (
            <PanelIcon
              icon={icon}
              src={iconUrls?.[icon.file]}
              alt={`${project.name} illustration`}
            />
          ) : showImage ? (
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
