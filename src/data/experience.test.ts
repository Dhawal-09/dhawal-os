import { describe, expect, it } from 'vitest'
import { experience, validateExperience } from './experience'
import { projects } from './projects'

describe('experience data', () => {
  it('has at least one entry, each with a role, period, and responsibilities', () => {
    expect(experience.length).toBeGreaterThan(0)
    for (const entry of experience) {
      expect(entry.role.length).toBeGreaterThan(0)
      expect(entry.period.length).toBeGreaterThan(0)
      expect(entry.responsibilities.length).toBeGreaterThan(0)
    }
  })

  it('is ordered newest first (the Experience timeline renders it as-is)', () => {
    const startYears = experience.map((e) =>
      Number(e.period.match(/\d{4}/)![0]),
    )
    expect([...startYears].sort((a, b) => b - a)).toEqual(startYears)
  })

  it('every projectId points at an existing experience project', () => {
    for (const entry of experience) {
      if (!entry.projectId) continue
      const project = projects.find((p) => p.id === entry.projectId)
      expect(project?.category, entry.id).toBe('experience')
    }
  })

  it('has no duplicate ids', () => {
    const ids = experience.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects an entry with no responsibilities', () => {
    expect(() =>
      validateExperience([
        { id: 'x', role: 'Role', period: '2020', responsibilities: [] },
      ]),
    ).toThrow()
  })

  it('rejects duplicate ids', () => {
    const entry = {
      id: 'dup',
      role: 'Role',
      period: '2020',
      responsibilities: ['did things'],
    }
    expect(() => validateExperience([entry, { ...entry }])).toThrow()
  })
})
