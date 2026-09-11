import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameHud } from './GameHud'

afterEach(() => {
  cleanup()
})

describe('GameHud', () => {
  it('renders the DHAWAL.OS brand and sound toggle, with the menu closed by default', () => {
    render(<GameHud />)

    expect(
      screen.getByRole('heading', { name: 'DHAWAL.OS' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /on/i })).toBeInTheDocument()
    const menuToggle = screen.getByRole('button', { name: /open menu/i })
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('navigation', { name: /portfolio sections/i }),
    ).not.toBeInTheDocument()
  })

  it('opens the existing PortfolioNav as a disclosure panel on menu click, without building a new nav system', async () => {
    const user = userEvent.setup()
    render(<GameHud />)

    await user.click(screen.getByRole('button', { name: /open menu/i }))

    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(
      screen.getByRole('navigation', { name: /portfolio sections/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument()
  })

  it('clicking the menu toggle again closes the panel', async () => {
    const user = userEvent.setup()
    render(<GameHud />)

    const toggle = screen.getByRole('button', { name: /open menu/i })
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: /close menu/i }))

    expect(
      screen.queryByRole('navigation', { name: /portfolio sections/i }),
    ).not.toBeInTheDocument()
  })

  it('Escape closes the open menu and returns focus to the toggle button', async () => {
    const user = userEvent.setup()
    render(<GameHud />)

    const toggle = screen.getByRole('button', { name: /open menu/i })
    await user.click(toggle)
    expect(
      screen.getByRole('navigation', { name: /portfolio sections/i }),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('navigation', { name: /portfolio sections/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus()
  })

  it('renders EXIT only when onExitConfirmed is provided (GAME state only)', () => {
    const { rerender } = render(<GameHud />)
    expect(
      screen.queryByRole('button', { name: /^exit$/i }),
    ).not.toBeInTheDocument()

    rerender(<GameHud onExitConfirmed={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument()
  })
})
