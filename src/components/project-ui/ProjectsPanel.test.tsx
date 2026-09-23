import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { projects } from '../../data/projects'
import { gameEventBridge } from '../../game/events/GameEventBridge'

afterEach(() => {
  cleanup()
})

function openProjects() {
  const user = userEvent.setup()
  render(<InteractionOverlay />)
  act(() => {
    gameEventBridge.emit('OPEN_PROJECTS')
  })
  return user
}

function title() {
  return screen.getByRole('heading', { level: 2 })
}

describe('ProjectsPanel', () => {
  it('opens on the home screen with only the two project types', () => {
    openProjects()

    expect(title()).toHaveTextContent('Projects')
    expect(
      screen.getByRole('button', { name: /experience projects/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /personal projects/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
    expect(screen.queryByText('Unifi')).toBeNull()
  })

  it('lists only experience projects under Experience', async () => {
    const user = openProjects()
    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )

    expect(title()).toHaveTextContent('Experience Projects')
    const list = screen.getByRole('list', { name: 'Experience Projects' })
    for (const project of projects) {
      const card = within(list).queryByRole('button', {
        name: new RegExp(`^${project.name}`),
      })
      if (project.category === 'experience') {
        expect(card).toBeInTheDocument()
      } else {
        expect(card).toBeNull()
      }
    }
    expect(within(list).getByText(/Software Engineer/)).toBeInTheDocument()
  })

  it('renders FocusGuard only under Personal projects, never Experience', async () => {
    const user = openProjects()
    await user.click(screen.getByRole('button', { name: /personal projects/i }))

    expect(title()).toHaveTextContent('Personal Projects')
    expect(
      screen.getByRole('button', { name: /^FocusGuard/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^DHAWAL\.OS/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))
    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )
    expect(screen.queryByRole('button', { name: /^FocusGuard/ })).toBeNull()
  })

  it('opens a project detail with its data, and Back returns to its list', async () => {
    const user = openProjects()
    const unifi = projects.find((p) => p.id === 'unifi')!

    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )
    await user.click(screen.getByRole('button', { name: /^Unifi/ }))

    expect(title()).toHaveTextContent('Unifi')
    expect(screen.getByText(unifi.description)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Technology' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Contributions' }),
    ).toBeInTheDocument()
    for (const item of unifi.contributions) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    expect(screen.getByText(unifi.role!)).toBeInTheDocument()
    // Kongtext has no en dash glyph, so the period is shown with ASCII "-".
    expect(screen.getByText('Jul 2025 - Jul 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(title()).toHaveTextContent('Experience Projects')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(title()).toHaveTextContent('Projects')
  })

  it('omits the Technology section when a project lists none', async () => {
    const user = openProjects()
    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )
    await user.click(screen.getByRole('button', { name: /^AIRVISION/ }))

    expect(screen.queryByRole('heading', { name: 'Technology' })).toBeNull()
  })

  it('Close from a detail view returns to the world and reopens on home', async () => {
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)
    const user = openProjects()

    await user.click(screen.getByRole('button', { name: /personal projects/i }))
    await user.click(screen.getByRole('button', { name: /^FocusGuard/ }))
    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(listener).toHaveBeenCalledWith('RETURN_TO_WORLD')

    act(() => {
      gameEventBridge.emit('OPEN_PROJECTS')
    })
    expect(title()).toHaveTextContent('Projects')
    expect(
      screen.getByRole('button', { name: /experience projects/i }),
    ).toBeInTheDocument()
    unsubscribe()
  })

  it('Escape closes the panel from a nested view', async () => {
    const user = openProjects()
    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )
    await user.click(screen.getByRole('button', { name: /^NexCRM/ }))

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('restores the default title when another section replaces Projects', async () => {
    const user = openProjects()
    await user.click(
      screen.getByRole('button', { name: /experience projects/i }),
    )

    act(() => {
      gameEventBridge.emit('OPEN_SKILLS')
    })

    expect(title()).toHaveTextContent('Skills')
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })
})
