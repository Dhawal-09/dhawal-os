import type { EducationEntry } from './types'

/** Transcribed only from `docs/CONTENT.md` "Education". */
export const education: EducationEntry[] = [
  {
    id: 'mca',
    degree: 'MCA',
    institution: 'Institute of Industrial and Computer Management, Pune',
    period: '2023–2025',
    detail: '8.46 CGPA',
  },
  {
    id: 'bca',
    degree: 'BCA',
    institution: 'Indira College of Commerce and Science, Pune',
    period: '2020–2023',
    detail: '9.01 CGPA',
  },
]

export function validateEducation(entries: EducationEntry[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    if (!entry.id || !entry.degree || !entry.institution || !entry.period) {
      throw new Error(
        `Education entry is missing a required field: ${JSON.stringify(entry)}`,
      )
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate education id: "${entry.id}"`)
    }
    seenIds.add(entry.id)
  }
}

validateEducation(education)
