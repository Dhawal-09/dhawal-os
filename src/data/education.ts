import type { EducationEntry, IconAsset } from './types'

/**
 * `visible`: [x, y, width, height] of the artwork inside the PNG (alpha
 * scan, plus a few px of margin). The four icons carry very different
 * amounts of transparent padding, so the panel sizes them by this.
 */
function icon(
  file: string,
  width: number,
  height: number,
  [x, y, visibleWidth, visibleHeight]: [number, number, number, number],
): IconAsset {
  return {
    file,
    width,
    height,
    visible: { x, y, width: visibleWidth, height: visibleHeight },
  }
}

/**
 * The academic journey, oldest stage first, transcribed only from
 * `docs/CONTENT.md` "Education" (the MCA's university was supplied directly
 * by the portfolio owner). Every detail is optional: one that has not been
 * supplied is left out, and the panel simply doesn't render it.
 */
export const education: EducationEntry[] = [
  {
    id: 'school',
    level: 'school',
    title: 'School',
    icon: icon('school.png', 502, 404, [27, 27, 418, 373]),
    degree: 'X (SSC)',
    institution: 'The Good Samaritan School, Pune',
    period: '2017–2018',
    grade: '89.20%',
  },
  {
    id: 'junior-college',
    level: 'junior-college',
    title: 'Junior College',
    icon: icon('juniorclg.png', 928, 771, [58, 27, 748, 716]),
    degree: 'XII (HSC)',
    institution: 'Modern Junior College, Pune',
    period: '2018–2020',
    grade: '74.77%',
  },
  {
    id: 'bca',
    level: 'bachelor',
    title: "Bachelor's Degree",
    icon: icon('graduation.png', 879, 748, [17, 21, 772, 685]),
    degree: 'BCA (Science)',
    institution: 'Indira College of Commerce and Science, Pune',
    period: '2020–2023',
    grade: 'CGPA 9.01',
  },
  {
    id: 'mca',
    level: 'master',
    title: "Master's Degree",
    icon: icon('master.png', 949, 965, [79, 126, 764, 780]),
    degree: 'MCA',
    institution: 'Institute of Industrial and Computer Management, Pune',
    university: 'Savitribai Phule Pune University',
    period: '2023–2025',
    grade: 'CGPA 8.46',
  },
]

export function validateEducation(entries: EducationEntry[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    const { icon: entryIcon } = entry
    if (
      !entry.id ||
      !entry.level ||
      !entry.title ||
      !entryIcon?.file ||
      !(entryIcon.width > 0) ||
      !(entryIcon.height > 0)
    ) {
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
