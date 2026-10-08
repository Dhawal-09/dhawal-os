import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { experience } from '../../data/experience'
import { projects } from '../../data/projects'
import { ExperiencePanel } from './ExperiencePanel'

afterEach(() => {
  cleanup()
})

/** The row headers, in order — one expand/collapse button per role. */
function rowButtons(): HTMLElement[] {
  const list = screen.getByRole('list', { name: /career timeline/i })
  return within(list)
    .getAllByRole('button', { hidden: true })
    .filter((button) => button.hasAttribute('aria-expanded'))
}

/** The details region a row header controls, whether open or shut. */
function detailsOf(button: HTMLElement): HTMLElement {
  return document.getElementById(button.getAttribute('aria-controls')!)!
}

function expandedButtons(): HTMLElement[] {
  return rowButtons().filter(
    (button) => button.getAttribute('aria-expanded') === 'true',
  )
}

describe('ExperiencePanel', () => {
  it('lists every role as a row in data order (newest first), with its company', () => {
    render(<ExperiencePanel />)

    const buttons = rowButtons()
    expect(buttons).toHaveLength(experience.length)
    experience.forEach((entry, index) => {
      expect(buttons[index]).toHaveTextContent(entry.role)
      expect(buttons[index]).toHaveTextContent(entry.company!)
    })
  })

  it('shows year spans on the rows, not the pixel-font-unsafe en dash', () => {
    render(<ExperiencePanel />)

    const [latest, previous] = rowButtons()
    expect(latest).toHaveTextContent('2025 - 2026')
    expect(previous).toHaveTextContent('2024 - 2025')
  })

  it('opens with every row collapsed — nothing expands until the visitor asks', () => {
    render(<ExperiencePanel />)

    expect(expandedButtons()).toEqual([])
    for (const button of rowButtons()) {
      expect(detailsOf(button)).toHaveAttribute('inert')
      expect(detailsOf(button)).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('clicking a row expands it', async () => {
    const user = userEvent.setup()
    render(<ExperiencePanel />)

    await user.click(rowButtons()[0])

    expect(expandedButtons()).toEqual([rowButtons()[0]])
    expect(detailsOf(rowButtons()[0])).not.toHaveAttribute('inert')
  })

  it("an expanded row shows that role's verified details straight from the data", () => {
    render(<ExperiencePanel />)

    const [latest] = experience
    const details = detailsOf(rowButtons()[0])
    expect(details).toHaveTextContent('Jul 2025 - Jul 2026')
    const product = projects.find((p) => p.id === latest.projectId)!
    expect(details).toHaveTextContent(product.name)
    expect(details).toHaveTextContent(product.subtitle)
    for (const tech of latest.technologies!) {
      expect(within(details).getByText(tech)).toBeInTheDocument()
    }
    for (const item of latest.responsibilities) {
      expect(within(details).getByText(item)).toBeInTheDocument()
    }
  })

  it('expanding another row collapses the previous one — only one is ever open', async () => {
    const user = userEvent.setup()
    render(<ExperiencePanel />)
    await user.click(rowButtons()[0])

    const [, previous] = experience
    await user.click(rowButtons()[1])

    expect(expandedButtons()).toEqual([rowButtons()[1]])
    expect(detailsOf(rowButtons()[0])).toHaveAttribute('inert')
    const details = detailsOf(rowButtons()[1])
    expect(details).not.toHaveAttribute('inert')
    for (const item of previous.responsibilities) {
      expect(within(details).getByText(item)).toBeInTheDocument()
    }

    await user.click(rowButtons()[0])
    expect(expandedButtons()).toEqual([rowButtons()[0]])
  })

  it('clicking the open row collapses it, leaving none expanded', async () => {
    const user = userEvent.setup()
    render(<ExperiencePanel />)

    await user.click(rowButtons()[0])
    await user.click(rowButtons()[0])

    expect(expandedButtons()).toEqual([])
  })

  it('rows toggle from the keyboard with Enter and Space', async () => {
    const user = userEvent.setup()
    render(<ExperiencePanel />)

    rowButtons()[1].focus()
    await user.keyboard('{Enter}')
    expect(expandedButtons()).toEqual([rowButtons()[1]])

    await user.keyboard(' ')
    expect(expandedButtons()).toEqual([])
  })

  it('each details region is labelled by its own row header', () => {
    render(<ExperiencePanel />)

    for (const button of rowButtons()) {
      expect(detailsOf(button)).toHaveAttribute('aria-labelledby', button.id)
    }
  })
})
