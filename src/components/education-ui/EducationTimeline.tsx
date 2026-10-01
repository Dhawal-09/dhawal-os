import type { CSSProperties } from 'react'
import type { EducationEntry } from '../../data/types'
import type { IconUrls } from '../panel-icons/iconUrls'
import { PanelIcon } from '../panel-icons/PanelIcon'

/**
 * The pixel font has no glyph for "–" (it renders as a blank gap), so text
 * shown in it uses ASCII "-" instead (same rule as ExperiencePanel).
 */
function pixelText(text: string): string {
  return text.replace(/\s*–\s*/g, ' - ')
}

interface EducationTimelineItemProps {
  entry: EducationEntry
  index: number
  iconSrc: string | undefined
}

/**
 * One stage: its icon beside the stage heading and whatever details the
 * data supplies. A detail that is undefined is not rendered at all.
 */
export function EducationTimelineItem({
  entry,
  index,
  iconSrc,
}: EducationTimelineItemProps) {
  const { title, degree, institution, university, period, grade } = entry
  return (
    <li
      className="education-stop panel-stagger-item"
      style={{ '--panel-order': index } as CSSProperties}
    >
      <span className="education-node" aria-hidden="true" />
      <div className="education-icon">
        {/* Decorative: the heading beside it already names the stage. */}
        <PanelIcon icon={entry.icon} src={iconSrc} alt="" />
      </div>
      <div className="education-stop-body">
        <h3 className="panel-group-title">{title}</h3>
        {degree && <p className="education-degree">{degree}</p>}
        {institution && <p className="education-institution">{institution}</p>}
        {university && <p className="education-university">{university}</p>}
        {(period || grade) && (
          <p className="panel-meta education-facts">
            {period && <span>{pixelText(period)}</span>}
            {grade && <span className="education-grade">{grade}</span>}
          </p>
        )}
      </div>
    </li>
  )
}

interface EducationTimelineProps {
  entries: readonly EducationEntry[]
  /** `null` until the icon URL map has loaded; the layout doesn't wait. */
  iconUrls: IconUrls | null
}

/** The stages in data order (oldest first), joined by a vertical spine. */
export function EducationTimeline({
  entries,
  iconUrls,
}: EducationTimelineProps) {
  return (
    <ol className="education-timeline" aria-label="Academic journey">
      {entries.map((entry, index) => (
        <EducationTimelineItem
          key={entry.id}
          entry={entry}
          index={index}
          iconSrc={iconUrls?.[entry.icon.file]}
        />
      ))}
    </ol>
  )
}
