import { education } from '../../data/education'
import { useIconUrls } from '../panel-icons/iconUrls'
import { EducationTimeline } from './EducationTimeline'
import './EducationPanel.css'

/** The icon URL map lives in its own on-demand chunk — see `useIconUrls`. */
const loadIconUrls = () =>
  import('./educationIconUrls').then((module) => module.educationIconUrls)

/**
 * The academic journey as a vertical timeline, rendered only from
 * `src/data/education.ts`. The shell (`InteractionOverlay`) mounts this only
 * while Education is open, so its icons exist in the DOM — and are fetched —
 * only then.
 */
export function EducationPanel() {
  const iconUrls = useIconUrls(loadIconUrls)

  return (
    <div className="panel-section education">
      <p className="panel-meta panel-subtitle">Academic Journey</p>
      <EducationTimeline entries={education} iconUrls={iconUrls} />
    </div>
  )
}
