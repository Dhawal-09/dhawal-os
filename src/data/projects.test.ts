import { describe, expect, it } from 'vitest'
import { projects, validateProjects } from './projects'

describe('projects data', () => {
  it('has at least one professional and one personal entry', () => {
    expect(projects.some((p) => p.category === 'professional')).toBe(true)
    expect(projects.some((p) => p.category === 'personal')).toBe(true)
  })

  it('never merges FocusGuard with professional projects', () => {
    const focusGuard = projects.find((p) => p.id === 'focusguard')
    expect(focusGuard?.category).toBe('personal')
  })

  it('every entry has a non-empty id, title, description, and highlights', () => {
    for (const project of projects) {
      expect(project.id.length).toBeGreaterThan(0)
      expect(project.title.length).toBeGreaterThan(0)
      expect(project.description.length).toBeGreaterThan(0)
      expect(project.highlights.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate ids', () => {
    const ids = projects.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects an entry missing a required field', () => {
    expect(() =>
      validateProjects([
        {
          id: '',
          title: 'x',
          category: 'professional',
          description: 'y',
          technologies: [],
          highlights: [],
        },
      ]),
    ).toThrow()
  })

  it('rejects duplicate ids', () => {
    const entry = {
      id: 'dup',
      title: 'x',
      category: 'professional' as const,
      description: 'y',
      technologies: [],
      highlights: [],
    }
    expect(() => validateProjects([entry, { ...entry }])).toThrow()
  })
})
