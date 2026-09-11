import { skillGroups } from '../../data/skills'

/** Renders only from `src/data/skills.ts`, grouped exactly as in `docs/CONTENT.md`. */
export function SkillsPanel() {
  return (
    <div className="panel-section">
      {skillGroups.map((group) => (
        <div key={group.id} className="panel-list-item">
          <h4>{group.title}</h4>
          <p>{group.skills.join(', ')}</p>
        </div>
      ))}
    </div>
  )
}
