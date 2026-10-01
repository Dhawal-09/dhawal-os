import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { about } from '../../data/about'
import { contactLinks } from '../../data/contact'
import { LandingScreen } from './LandingScreen'

afterEach(() => {
  cleanup()
})

describe('LandingScreen', () => {
  it('renders the DHAWAL.OS branding, primary copy, and verified supporting content', () => {
    render(<LandingScreen onStartJourney={vi.fn()} />)

    expect(screen.getByText('DHAWAL.OS')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /HI, I.M DHAWAL/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(about.title)).toBeInTheDocument()
    expect(screen.getByText(about.summary)).toBeInTheDocument()
  })

  it('calls onStartJourney when the START JOURNEY button is activated', async () => {
    const user = userEvent.setup()
    const onStartJourney = vi.fn()
    render(<LandingScreen onStartJourney={onStartJourney} />)

    await user.click(screen.getByRole('button', { name: /start journey/i }))

    expect(onStartJourney).toHaveBeenCalledTimes(1)
  })

  it('START JOURNEY is keyboard-activatable via Enter and Space', async () => {
    const user = userEvent.setup()
    const onStartJourney = vi.fn()
    render(<LandingScreen onStartJourney={onStartJourney} />)

    const button = screen.getByRole('button', { name: /start journey/i })
    button.focus()
    await user.keyboard('{Enter}')
    expect(onStartJourney).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(onStartJourney).toHaveBeenCalledTimes(2)
  })

  it('VIEW RESUME links directly to the static resume asset, independent of the game', () => {
    render(<LandingScreen onStartJourney={vi.fn()} />)

    const link = screen.getByRole('link', { name: /view resume/i })
    expect(link).toHaveAttribute('href', '/resume.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('shows exactly the verified profile links from project data as social links — none fabricated', () => {
    render(<LandingScreen onStartJourney={vi.fn()} />)

    const nav = screen.queryByRole('navigation', { name: /social links/i })
    if (contactLinks.length === 0) {
      expect(nav).not.toBeInTheDocument()
      return
    }
    const links = within(nav!).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      contactLinks.map((link) => link.url),
    )
  })
})
