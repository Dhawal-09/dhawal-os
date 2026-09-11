import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { about } from '../../data/about'
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

  it('omits the social links section when no verified links exist in project data', () => {
    render(<LandingScreen onStartJourney={vi.fn()} />)

    expect(
      screen.queryByRole('navigation', { name: /social links/i }),
    ).not.toBeInTheDocument()
  })
})
