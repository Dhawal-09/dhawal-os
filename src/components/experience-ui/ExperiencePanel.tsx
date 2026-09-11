import { experience } from '../../data/experience'

/** Renders only from `src/data/experience.ts`. Each entry keeps role, period, technologies, and responsibilities visually distinct (PHASE-08-PORTFOLIO-UI.md). */
export function ExperiencePanel() {
  return (
    <div className="panel-section">
      <ul className="panel-list">
        {experience.map((entry) => (
          <li key={entry.id} className="panel-list-item">
            <h4>{entry.role}</h4>
            <p className="panel-meta">
              {entry.period}
              {entry.company ? ` · ${entry.company}` : ''}
            </p>
            {entry.technologies && entry.technologies.length > 0 && (
              <p className="panel-meta">{entry.technologies.join(' · ')}</p>
            )}
            <ul className="panel-sublist">
              {entry.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
