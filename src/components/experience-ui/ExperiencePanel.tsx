import { useState } from 'react'
import { experience } from '../../data/experience'
import { projects } from '../../data/projects'
import type { ExperienceEntry } from '../../data/types'
import './ExperiencePanel.css'

const DETAIL_ID = 'experience-detail'

/**
 * The pixel font has no glyphs for "–" or "·" (they render as blank gaps),
 * so text shown in it uses ASCII "-" instead (same rule as ProjectsPanel).
 */
function pixelText(text: string): string {
  return text.replace(/\s*–\s*/g, ' - ')
}

/** "Nov 2024 – Jun 2025" → "2024 - 2025"; a single-year period → "2024". */
function yearSpan(period: string): string {
  const years = [...new Set(period.match(/\d{4}/g) ?? [])]
  return years.length > 0 ? years.join(' - ') : pixelText(period)
}

function productOf(entry: ExperienceEntry) {
  return entry.projectId
    ? projects.find((p) => p.id === entry.projectId)
    : undefined
}

/**
 * Career timeline: a reverse-chronological list of roles (rendered in
 * `src/data/experience.ts` order, newest first) beside the selected role's
 * details. The newest role is selected on open so it is readable with no
 * extra click. Close/Escape/focus stay owned by the shared overlay shell.
 */
export function ExperiencePanel() {
  const [selectedId, setSelectedId] = useState(experience[0]?.id)
  const selected =
    experience.find((entry) => entry.id === selectedId) ?? experience[0]

  if (!selected) {
    return <p className="panel-empty">No experience listed yet.</p>
  }

  return (
    <div className="experience">
      <h3 className="panel-group-title">Career timeline</h3>

      <div className="experience-layout">
        <ol className="experience-timeline" aria-label="Career timeline">
          {experience.map((entry, index) => {
            const isSelected = entry.id === selected.id
            const classes = ['experience-stop']
            if (index === 0) classes.push('is-latest')
            if (isSelected) classes.push('is-selected')
            return (
              <li key={entry.id} className={classes.join(' ')}>
                <span className="experience-node" aria-hidden="true" />
                <button
                  type="button"
                  className="experience-stop-button"
                  aria-pressed={isSelected}
                  aria-controls={DETAIL_ID}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className="experience-stop-years">
                    {yearSpan(entry.period)}
                  </span>
                  <span className="experience-stop-role">{entry.role}</span>
                  {entry.company && (
                    <span className="experience-stop-company">
                      {entry.company}
                    </span>
                  )}
                  <span className="experience-stop-view" aria-hidden="true">
                    {isSelected ? 'Viewing' : 'View details >'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <ExperienceDetail
          key={selected.id}
          entry={selected}
          isLatest={selected.id === experience[0].id}
        />
      </div>
    </div>
  )
}

function ExperienceDetail({
  entry,
  isLatest,
}: {
  entry: ExperienceEntry
  isLatest: boolean
}) {
  const product = productOf(entry)

  return (
    <article
      id={DETAIL_ID}
      className={
        isLatest ? 'experience-detail is-latest' : 'experience-detail'
      }
      aria-live="polite"
      aria-label={`${entry.role} details`}
    >
      <header className="experience-detail-head">
        <h4 className="experience-detail-role">{entry.role}</h4>
        {entry.company && (
          <p className="experience-detail-company">{entry.company}</p>
        )}
        <p className="experience-detail-period">{pixelText(entry.period)}</p>
      </header>

      {product && (
        <section className="experience-detail-section">
          <h5 className="experience-detail-label">Product</h5>
          <p className="experience-product-name">{product.name}</p>
          <p className="experience-product-subtitle">{product.subtitle}</p>
        </section>
      )}

      {entry.technologies && entry.technologies.length > 0 && (
        <section className="experience-detail-section">
          <h5 className="experience-detail-label">Technologies</h5>
          <ul className="experience-tech">
            {entry.technologies.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="experience-detail-section">
        <h5 className="experience-detail-label">Contributions</h5>
        <ul className="experience-contributions">
          {entry.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </article>
  )
}
