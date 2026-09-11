import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { projects } from '../../data/projects'
import { ProjectsPanel } from './ProjectsPanel'

afterEach(() => {
  cleanup()
})

describe('ProjectsPanel', () => {
  it('renders every project title from the data file', () => {
    render(<ProjectsPanel />)

    for (const project of projects) {
      expect(
        screen.getByRole('heading', { name: project.title }),
      ).toBeInTheDocument()
    }
  })

  it('renders FocusGuard only under Personal projects, never Professional', () => {
    render(<ProjectsPanel />)

    const personalHeading = screen.getByRole('heading', {
      name: 'Personal projects',
    })
    const focusGuardHeading = screen.getByRole('heading', {
      name: /FocusGuard/,
    })

    // FocusGuard's heading must come after the "Personal projects" group
    // heading in document order, not the "Professional projects" one.
    expect(
      personalHeading.compareDocumentPosition(focusGuardHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
