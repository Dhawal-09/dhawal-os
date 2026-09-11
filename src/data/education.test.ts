import { describe, expect, it } from 'vitest'
import { education, validateEducation } from './education'

describe('education data', () => {
  it('has at least one entry, each with a degree, institution, and period', () => {
    expect(education.length).toBeGreaterThan(0)
    for (const entry of education) {
      expect(entry.degree.length).toBeGreaterThan(0)
      expect(entry.institution.length).toBeGreaterThan(0)
      expect(entry.period.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate ids', () => {
    const ids = education.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects an entry missing an institution', () => {
    expect(() =>
      validateEducation([
        { id: 'x', degree: 'BSc', institution: '', period: '2020' },
      ]),
    ).toThrow()
  })
})
