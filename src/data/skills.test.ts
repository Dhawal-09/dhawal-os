import { describe, expect, it } from 'vitest'
import { skillGroups, validateSkillGroups } from './skills'

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

  it('rejects a group with no skills', () => {
    expect(() =>
      validateSkillGroups([{ id: 'x', title: 'Empty', skills: [] }]),
    ).toThrow()
  })
})
