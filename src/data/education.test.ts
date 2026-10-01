import { describe, expect, it } from 'vitest'
import { education, validateEducation } from './education'
import type { EducationEntry } from './types'

/** Every file actually present in the education icons folder. */
const ICON_FILES = new Set(
  Object.keys(
    import.meta.glob('../../assets/world/Icons/EducationIcons/*'),
  ).map((path) => path.slice(path.lastIndexOf('/') + 1)),
)

const icon = { file: 'school.png', width: 1, height: 1 }

describe('education data', () => {
  it('lists the four stages in chronological order', () => {
    expect(education.map((entry) => entry.level)).toEqual([
      'school',
      'junior-college',
      'bachelor',
      'master',
    ])
    for (const entry of education) {
      expect(entry.title.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate ids', () => {
    const ids = education.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every stage its own icon file that exists in assets/world/Icons/EducationIcons', () => {
    const files = education.map((entry) => entry.icon.file)
    expect(new Set(files).size).toBe(files.length)
    for (const file of files) {
      expect(ICON_FILES).toContain(file)
    }
  })

  it('carries the supplied facts for every stage', () => {
    const byId = Object.fromEntries(education.map((e) => [e.id, e]))

    expect(byId.school).toMatchObject({
      degree: 'X (SSC)',
      institution: 'The Good Samaritan School, Pune',
      period: '2017–2018',
      grade: '89.20%',
    })
    expect(byId['junior-college']).toMatchObject({
      degree: 'XII (HSC)',
      institution: 'Modern Junior College, Pune',
      period: '2018–2020',
      grade: '74.77%',
    })
    expect(byId.bca).toMatchObject({
      degree: 'BCA (Science)',
      period: '2020–2023',
      grade: 'CGPA 9.01',
    })
    expect(byId.mca).toMatchObject({
      degree: 'MCA',
      period: '2023–2025',
      grade: 'CGPA 8.46',
      university: 'Savitribai Phule Pune University',
    })
  })

  it('rejects an entry with no stage title', () => {
    const entry: EducationEntry = { id: 'x', level: 'school', title: '', icon }
    expect(() => validateEducation([entry])).toThrow()
  })

  it('rejects duplicate ids', () => {
    const entry: EducationEntry = {
      id: 'x',
      level: 'school',
      title: 'School',
      icon,
    }
    expect(() => validateEducation([entry, entry])).toThrow()
  })
})
