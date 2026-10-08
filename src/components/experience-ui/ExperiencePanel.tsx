import { useState } from 'react'
import { experience } from '../../data/experience'
import { projects } from '../../data/projects'
import type { ExperienceEntry } from '../../data/types'
import './ExperiencePanel.css'

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

/** A 5×7 pixel "▶" — CSS turns it to "▼" when its entry is open. */
function ExpandArrow() {
  return (
    <svg
      className="experience-entry-arrow"
      viewBox="0 0 5 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 0h1v7H1zM2 1h1v5H2zM3 2h1v3H3zM4 3h1v1H4z" />
    </svg>
  )
}

/**
 * Career timeline as a collapsible list: one selectable, game-menu style
 * row per role (rendered in `src/data/experience.ts` order, newest first),
 * each expanding inline to that role's details. Every row starts collapsed
 * — the visitor opens what they want to read; at most one is open at a
 * time, and clicking an open row collapses it. Everything shown comes from
 * the existing data modules — nothing is restated here. Close/Escape/focus
 * stay owned by the shared overlay shell.
 */
export function ExperiencePanel() {
  const [openId, setOpenId] = useState<string | null>(null)

  if (experience.length === 0) {
    return <p className="panel-empty">No experience listed yet.</p>
  }

  return (
    <div className="experience">
      <h3 className="panel-group-title">Career timeline</h3>

      <ol className="experience-list" aria-label="Career timeline">
        {experience.map((entry, index) => (
          <ExperienceRow
            key={entry.id}
            entry={entry}
            isLatest={index === 0}
            isOpen={entry.id === openId}
            onToggle={() =>
              setOpenId((current) => (current === entry.id ? null : entry.id))
            }
          />
        ))}
      </ol>
    </div>
  )
}

function ExperienceRow({
  entry,
  isLatest,
  isOpen,
  onToggle,
}: {
  entry: ExperienceEntry
  isLatest: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  const product = productOf(entry)
  const headerId = `experience-${entry.id}-header`
  const detailsId = `experience-${entry.id}-details`

  const classes = ['experience-entry']
  if (isLatest) classes.push('is-latest')
  if (isOpen) classes.push('is-open')

  return (
    <li className={classes.join(' ')}>
      <div className="experience-entry-face">
        <h4 className="experience-entry-heading">
          <button
            type="button"
            id={headerId}
            className="experience-entry-header"
            aria-expanded={isOpen}
            aria-controls={detailsId}
            onClick={onToggle}
          >
            <span className="experience-entry-marker" aria-hidden="true" />
            <span className="experience-entry-role">{entry.role}</span>
            <span className="experience-entry-years">
              {yearSpan(entry.period)}
            </span>
            <ExpandArrow />
            {entry.company && (
              <span className="experience-entry-company">{entry.company}</span>
            )}
          </button>
        </h4>

        {/* Always rendered so it can animate open and shut; while shut it is
            inert and hidden from assistive tech, not merely zero-height. */}
        <div
          id={detailsId}
          className="experience-entry-reveal"
          role="region"
          aria-labelledby={headerId}
          aria-hidden={!isOpen}
          inert={!isOpen}
        >
          <div className="experience-entry-clip">
            <div className="experience-entry-details">
              <p className="experience-entry-period">
                {pixelText(entry.period)}
              </p>

              {product && (
                <section className="experience-detail-section">
                  <h5 className="experience-detail-label">Project</h5>
                  <p className="experience-product-name">{product.name}</p>
                  <p className="experience-product-subtitle">
                    {product.subtitle}
                  </p>
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
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
