import { describe, expect, it } from 'vitest'
import { experience } from './experience'
import { projects, validateProjects } from './projects'
import type { Project } from './types'

const baseEntry: Project = {
  id: 'x',
  category: 'experience',
  name: 'x',
  subtitle: 'x',
  description: 'y',
  technologies: [],
  contributions: [],
}

describe('projects data', () => {
  it('has at least one experience and one personal entry', () => {
    expect(projects.some((p) => p.category === 'experience')).toBe(true)
    expect(projects.some((p) => p.category === 'personal')).toBe(true)
  })

  it('never merges FocusGuard with experience projects', () => {
    const focusGuard = projects.find((p) => p.id === 'focusguard')
    expect(focusGuard?.category).toBe('personal')
  })

  it('every entry has a non-empty id, name, subtitle, description, and contributions', () => {
    for (const project of projects) {
      expect(project.id.length).toBeGreaterThan(0)
      expect(project.name.length).toBeGreaterThan(0)
      expect(project.subtitle.length).toBeGreaterThan(0)
      expect(project.description.length).toBeGreaterThan(0)
      expect(project.contributions.length).toBeGreaterThan(0)
    }
  })

  it('reads role and period from experience.ts instead of duplicating them', () => {
    const roles = new Set(experience.map((e) => `${e.role}|${e.period}`))
    for (const project of projects) {
      if (project.role || project.period) {
        expect(roles.has(`${project.role}|${project.period}`)).toBe(true)
      }
    }
  })

  it('has no duplicate ids', () => {
    const ids = projects.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects an entry missing a required field', () => {
    expect(() => validateProjects([{ ...baseEntry, id: '' }])).toThrow()
  })

  it('rejects duplicate ids', () => {
    expect(() => validateProjects([baseEntry, { ...baseEntry }])).toThrow()
  })
})
