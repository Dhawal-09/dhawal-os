import { useState, type CSSProperties } from 'react'
import { skillGroups } from '../../data/skills'
import type { Skill, SkillIcon } from '../../data/types'
import { useIconUrls } from '../panel-icons/iconUrls'
import './SkillsPanel.css'

type IconSkill = Skill & { icon: SkillIcon }

interface VisibleGroup {
  id: string
  title: string
  skills: IconSkill[]
  /** How many icons come before this group — drives the entrance stagger. */
  offset: number
}

/**
 * Only skills with an approved icon are shown; a group left with none is
 * dropped. Pure data — no image URL is involved here, so importing this
 * module never makes the browser fetch an icon.
 */
const VISIBLE_GROUPS: VisibleGroup[] = skillGroups.reduce<VisibleGroup[]>(
  (groups, group) => {
    const skills = group.skills.filter(
      (skill): skill is IconSkill => skill.icon !== undefined,
    )
    if (skills.length === 0) return groups
    const previous = groups[groups.length - 1]
    const offset = previous ? previous.offset + previous.skills.length : 0
    return [...groups, { id: group.id, title: group.title, skills, offset }]
  },
  [],
)

/** Groups in view the moment the panel opens — their icons load eagerly. */
const EAGER_GROUP_COUNT = 2

/** The icon URL map lives in its own on-demand chunk — see `useIconUrls`. */
const loadIconUrls = () =>
  import('./skillIconUrls').then((module) => module.skillIconUrls)

/**
 * Renders only from `src/data/skills.ts`: one section per category, each
 * technology shown as its pixel-art icon. The shell (`InteractionOverlay`)
 * mounts this only while Skills is open, so the icons exist in the DOM — and
 * are fetched — only then. The layout is complete on the first paint (every
 * icon's box is sized from its native dimensions); the images fill in as
 * they decode.
 */
export function SkillsPanel() {
  const iconUrls = useIconUrls(loadIconUrls)
  // Touch has no hover: tapping an icon pins its name until the next tap.
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <div className="panel-section skills-panel">
      <p className="panel-meta skills-subtitle">Technology Stack</p>
      <div className="skills-groups">
        {VISIBLE_GROUPS.map((group, groupIndex) => {
          const headingId = `skills-group-${group.id}`
          const eager = groupIndex < EAGER_GROUP_COUNT
          return (
            <section
              key={group.id}
              className="skills-group"
              aria-labelledby={headingId}
            >
              <h3 id={headingId} className="panel-group-title">
                {group.title}
              </h3>
              <ul className="skills-icons">
                {group.skills.map((skill, skillIndex) => {
                  const src = iconUrls?.[skill.icon.file]
                  return (
                    <li
                      key={skill.id}
                      style={
                        {
                          '--skills-order': group.offset + skillIndex,
                        } as CSSProperties
                      }
                    >
                      <button
                        type="button"
                        className={
                          activeId === skill.id
                            ? 'skills-icon is-active'
                            : 'skills-icon'
                        }
                        style={{
                          aspectRatio: `${skill.icon.width} / ${skill.icon.height}`,
                        }}
                        aria-label={skill.name}
                        onClick={() =>
                          setActiveId((current) =>
                            current === skill.id ? null : skill.id,
                          )
                        }
                        onBlur={() => setActiveId(null)}
                      >
                        {src && (
                          <img
                            src={src}
                            alt={skill.name}
                            width={skill.icon.width}
                            height={skill.icon.height}
                            loading={eager ? 'eager' : 'lazy'}
                            fetchPriority={groupIndex === 0 ? 'high' : 'auto'}
                            decoding="async"
                            draggable={false}
                          />
                        )}
                        <span className="skills-icon-name" aria-hidden="true">
                          {skill.name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
