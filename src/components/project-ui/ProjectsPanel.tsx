import { projects } from '../../data/projects'

const PROFESSIONAL = projects.filter((p) => p.category === 'professional')
const PERSONAL = projects.filter((p) => p.category === 'personal')

/**
 * Renders only from `src/data/projects.ts` — no project detail is
 * hardcoded here (PHASE-08-PORTFOLIO-UI.md "Implementation guidance").
 * Professional and personal projects are rendered as clearly separate
 * groups and must never be merged (CONTENT.md — FocusGuard only under
 * PERSONAL PROJECTS).
 */
export function ProjectsPanel() {
  return (
    <div className="panel-section">
      <h3 className="panel-group-title">Professional projects</h3>
      <ul className="panel-list">
        {PROFESSIONAL.map((project) => (
          <li key={project.id} className="panel-list-item">
            <h4>{project.title}</h4>
            <p>{project.description}</p>
            {project.technologies.length > 0 && (
              <p className="panel-meta">{project.technologies.join(' · ')}</p>
            )}
            <ul className="panel-sublist">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h3 className="panel-group-title">Personal projects</h3>
      <ul className="panel-list">
        {PERSONAL.map((project) => (
          <li key={project.id} className="panel-list-item">
            <h4>{project.title}</h4>
            <p>{project.description}</p>
            {project.technologies.length > 0 && (
              <p className="panel-meta">{project.technologies.join(' · ')}</p>
            )}
            <ul className="panel-sublist">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
