import { describe, expect, it } from 'vitest'
import { certificates, validateCertificates } from './certificates'

describe('certificates data', () => {
  it('is empty until verified certificate content is supplied (no fabricated entries)', () => {
    expect(certificates).toEqual([])
  })

  it('rejects an entry missing a title', () => {
    expect(() => validateCertificates([{ id: 'x', title: '' }])).toThrow()
  })

  it('rejects duplicate ids', () => {
    const entry = { id: 'dup', title: 'Something' }
    expect(() => validateCertificates([entry, { ...entry }])).toThrow()
  })
})
