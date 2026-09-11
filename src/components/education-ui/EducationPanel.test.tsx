import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { education } from '../../data/education'
import { EducationPanel } from './EducationPanel'

afterEach(() => {
  cleanup()
})

describe('EducationPanel', () => {
  it('renders every degree and institution from the data file', () => {
    render(<EducationPanel />)

    for (const entry of education) {
      expect(
        screen.getByRole('heading', { name: entry.degree }),
      ).toBeInTheDocument()
      expect(screen.getByText(entry.institution)).toBeInTheDocument()
    }
  })
})
