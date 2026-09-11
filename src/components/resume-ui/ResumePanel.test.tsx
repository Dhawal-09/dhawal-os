import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ResumePanel } from './ResumePanel'

afterEach(() => {
  cleanup()
})

describe('ResumePanel', () => {
  it('links directly to the static /resume.pdf asset, independent of any game state', () => {
    render(<ResumePanel />)

    const link = screen.getByRole('link', { name: /resume/i })
    expect(link).toHaveAttribute('href', '/resume.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
