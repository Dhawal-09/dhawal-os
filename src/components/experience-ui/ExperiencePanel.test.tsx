import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { experience } from '../../data/experience'
import { projects } from '../../data/projects'
import { ExperiencePanel } from './ExperiencePanel'

afterEach(() => {
  cleanup()
})

function timelineButtons(): HTMLElement[] {
  const timeline = screen.getByRole('list', { name: /career timeline/i })
  return within(timeline).getAllByRole('button')
}

function details(): HTMLElement {
  return screen.getByRole('article')
}

describe('ExperiencePanel', () => {
  it('lists every role on the timeline in data order (newest first)', () => {
    render(<ExperiencePanel />)

    const buttons = timelineButtons()
    expect(buttons).toHaveLength(experience.length)
    experience.forEach((entry, index) => {
      expect(buttons[index]).toHaveTextContent(entry.role)
    })
  })

  it('shows year spans on the timeline, not the pixel-font-unsafe en dash', () => {
    render(<ExperiencePanel />)

    const [latest, previous] = timelineButtons()
    expect(latest).toHaveTextContent('2025 - 2026')
    expect(previous).toHaveTextContent('2024 - 2025')
  })

  it('selects the newest role on open and shows its details', () => {
    render(<ExperiencePanel />)

    const [latest] = experience
    expect(timelineButtons()[0]).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(details()).getByRole('heading', { name: latest.role }),
    ).toBeInTheDocument()
    expect(details()).toHaveTextContent(latest.company!)
    expect(details()).toHaveTextContent('Jul 2025 - Jul 2026')
    const product = projects.find((p) => p.id === latest.projectId)!
    expect(details()).toHaveTextContent(product.name)
    expect(details()).toHaveTextContent(product.subtitle)
    for (const item of latest.responsibilities) {
      expect(within(details()).getByText(item)).toBeInTheDocument()
    }
  })

  it('switches details when another role is selected, and back again', () => {
    render(<ExperiencePanel />)

    const [latest, previous] = experience
    fireEvent.click(timelineButtons()[1])

    expect(timelineButtons()[1]).toHaveAttribute('aria-pressed', 'true')
    expect(timelineButtons()[0]).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(details()).getByRole('heading', { name: previous.role }),
    ).toBeInTheDocument()
    for (const item of previous.responsibilities) {
      expect(within(details()).getByText(item)).toBeInTheDocument()
    }

    fireEvent.click(timelineButtons()[0])
    expect(
      within(details()).getByRole('heading', { name: latest.role }),
    ).toBeInTheDocument()
  })
})
