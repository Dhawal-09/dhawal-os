import { about } from '../../data/about'

/** Renders only from `src/data/about.ts` — transcribed from `docs/CONTENT.md` "Identity". */
export function AboutPanel() {
  return (
    <div className="panel-section">
      <h4>{about.name}</h4>
      <p className="panel-meta">{about.title}</p>
      <p>{about.summary}</p>
    </div>
  )
}
