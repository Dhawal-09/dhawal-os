import { cat } from '../../data/cat'

/** Renders only from `src/data/cat.ts` — the Education room's easter-egg cat, not a portfolio section. */
export function CatPanel() {
  return (
    <div className="panel-section">
      <h4>{cat.name}</h4>
      <p className="panel-meta">{cat.title}</p>
      <p>{cat.summary}</p>
    </div>
  )
}
