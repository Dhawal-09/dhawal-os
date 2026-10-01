import { describe, expect, it } from 'vitest'
import { buildContactItems, contactItems, contactProfile } from './contact'
import { RESUME_PDF_PATH } from './resume'

/** Every file actually present in the contact icons folder. */
const ICON_FILES = new Set(
  Object.keys(import.meta.glob('../../assets/world/Icons/Contacts/*')).map(
    (path) => path.slice(path.lastIndexOf('/') + 1),
  ),
)

const FULL_PROFILE = {
  email: 'someone@example.com',
  phone: '+00 12345 67890',
  linkedin: 'https://www.linkedin.com/in/someone/',
  github: 'https://github.com/someone',
  resume: '/resume.pdf',
  portfolio: 'https://example.com',
}

describe('contact data', () => {
  it('builds all six channels, in display order, from a complete profile', () => {
    const items = buildContactItems(FULL_PROFILE)

    expect(items.map((item) => item.label)).toEqual([
      'Email',
      'Phone',
      'LinkedIn',
      'GitHub',
      'Resume',
      'Portfolio',
    ])
  })

  it('turns each value into the right kind of link', () => {
    const byId = Object.fromEntries(
      buildContactItems(FULL_PROFILE).map((item) => [item.id, item]),
    )

    expect(byId.email.href).toBe('mailto:someone@example.com')
    expect(byId.phone.href).toBe('tel:+001234567890')
    expect(byId.phone.value).toBe('+00 12345 67890')
    expect(byId.linkedin.href).toBe('https://www.linkedin.com/in/someone/')
    expect(byId.linkedin.value).toBe('linkedin.com/in/someone')
    expect(byId.github.value).toBe('github.com/someone')
    expect(byId.resume.href).toBe('/resume.pdf')
    expect(byId.portfolio.value).toBe('example.com')
  })

  it('uses a distinct icon file that exists in assets/world/Icons/Contacts for every channel', () => {
    const files = buildContactItems(FULL_PROFILE).map((item) => item.icon.file)

    expect(new Set(files).size).toBe(6)
    for (const file of files) {
      expect(ICON_FILES).toContain(file)
    }
  })

  it('omits every channel the profile does not define', () => {
    expect(buildContactItems({})).toEqual([])
    expect(
      buildContactItems({ github: FULL_PROFILE.github }).map((i) => i.id),
    ).toEqual(['github'])
  })

  it('the real profile only produces rows for values that were actually supplied', () => {
    const defined = Object.entries(contactProfile)
      .filter(([, value]) => value)
      .map(([key]) => key)

    expect(contactItems.map((item) => item.id)).toEqual(defined)
  })

  it('links the resume through the shared resume path', () => {
    expect(contactProfile.resume).toBe(RESUME_PDF_PATH)
  })
})
