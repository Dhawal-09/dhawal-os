import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { PortfolioNav } from './PortfolioNav'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PortfolioNav', () => {
  it('renders a button for every portfolio section, including Resume', () => {
    render(<PortfolioNav />)

    for (const label of [
      'About Me',
      'Projects',
      'Experience',
      'Skills',
      'Education',
      'Certificates',
      'Contact',
      'Resume',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('emits the matching OPEN_* event through the existing GameEventBridge — no second event system', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)

    render(<PortfolioNav />)
    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect(listener).toHaveBeenCalledWith('OPEN_PROJECTS')
    unsubscribe()
  })

  it('bypasses the game entirely — works without any world/player interaction', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)

    render(<PortfolioNav />)
    await user.click(screen.getByRole('button', { name: 'Resume' }))

    expect(listener).toHaveBeenCalledWith('OPEN_RESUME')
    unsubscribe()
  })
})
