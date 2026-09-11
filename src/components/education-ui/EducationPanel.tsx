import { education } from '../../data/education'

/** Renders only from `src/data/education.ts`. */
export function EducationPanel() {
  return (
    <div className="panel-section">
      <ul className="panel-list">
        {education.map((entry) => (
          <li key={entry.id} className="panel-list-item">
            <h4>{entry.degree}</h4>
            <p>{entry.institution}</p>
            <p className="panel-meta">
              {entry.period}
              {entry.detail ? ` · ${entry.detail}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
