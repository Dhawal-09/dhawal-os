import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { experience } from '../../data/experience'
import { ExperiencePanel } from './ExperiencePanel'

afterEach(() => {
  cleanup()
})

describe('ExperiencePanel', () => {
  it('renders every role and its period from the data file', () => {
    render(<ExperiencePanel />)

    for (const entry of experience) {
      expect(
        screen.getByRole('heading', { name: entry.role }),
      ).toBeInTheDocument()
      expect(screen.getByText(new RegExp(entry.period))).toBeInTheDocument()
    }
  })
})
