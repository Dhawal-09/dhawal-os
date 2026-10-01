import { describe, expect, it } from 'vitest'
import { skillGroups, validateSkillGroups } from './skills'

/** Every file actually present in the icons folder, by exact filename. */
const ICON_FILES = new Set(
  Object.keys(import.meta.glob('../../assets/world/Icons/*')).map((path) =>
    path.slice(path.lastIndexOf('/') + 1),
  ),
)

describe('skills data', () => {
  it('has multiple groups, each with a title and at least one skill', () => {
    expect(skillGroups.length).toBeGreaterThan(1)
    for (const group of skillGroups) {
      expect(group.title.length).toBeGreaterThan(0)
      expect(group.skills.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate group ids', () => {
    const ids = skillGroups.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no duplicate skill ids', () => {
    const ids = skillGroups.flatMap((g) => g.skills.map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only references icon files that exist in assets/world/Icons', () => {
    expect(ICON_FILES.size).toBeGreaterThan(0)
    for (const group of skillGroups) {
      for (const skill of group.skills) {
        if (!skill.icon) continue
        expect(ICON_FILES, skill.name).toContain(skill.icon.file)
        expect(skill.icon.width).toBeGreaterThan(0)
        expect(skill.icon.height).toBeGreaterThan(0)
      }
    }
  })

  it('never uses the same icon file for two skills', () => {
    const files = skillGroups.flatMap((g) =>
      g.skills.flatMap((s) => (s.icon ? [s.icon.file] : [])),
    )
    expect(new Set(files).size).toBe(files.length)
  })

  it('rejects a group with no skills', () => {
    expect(() =>
      validateSkillGroups([{ id: 'x', title: 'Empty', skills: [] }]),
    ).toThrow()
  })

  it('rejects a duplicate skill id across groups', () => {
    expect(() =>
      validateSkillGroups([
        { id: 'a', title: 'A', skills: [{ id: 'git', name: 'Git' }] },
        { id: 'b', title: 'B', skills: [{ id: 'git', name: 'Git' }] },
      ]),
    ).toThrow()
  })
})
