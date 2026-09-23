import { education } from './education'

/**
 * Transcribed only from `docs/CONTENT.md` "Identity" and the verified
 * education/experience facts already in this directory. No claims,
 * metrics, or achievements are added beyond what those sources state.
 */
export const about = {
  name: 'Dhawal Wani',
  title: 'Software Engineer',
  summary:
    'Software engineer working across full-stack web development — React, Node.js, Express.js, and PostgreSQL. MCA graduate from the Institute of Industrial and Computer Management, Pune.',
}

export interface AboutRow {
  label: string
  value: string
}

function highestDegree(): string {
  const mca = education.find((e) => e.id === 'mca')
  if (!mca) throw new Error('About Me expects the "mca" education entry')
  return mca.degree
}

/**
 * The About Me CHARACTER ID card. Name/role/education come from the data
 * above and `education.ts`; age, location, experience and the card id are
 * as supplied by Dhawal for the card.
 */
export const characterId = {
  id: 'DHAWAL-01',
  status: 'Online',
  rows: [
    { label: 'Age', value: '24' },
    { label: 'Location', value: 'India' },
    { label: 'Education', value: highestDegree() },
    { label: 'Experience', value: '1+ Years' },
  ] satisfies AboutRow[],
}

/**
 * Card photo: Dhawal's pixel-art head-and-shoulders portrait
 * (`public/assets/special/id.png` with its white background made
 * transparent, so it sits on the card's own navy photo panel).
 */
export const CHARACTER_PHOTO = `${import.meta.env.BASE_URL}assets/special/id-portrait.png`
