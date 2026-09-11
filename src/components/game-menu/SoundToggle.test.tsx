import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SoundToggle } from './SoundToggle'

afterEach(() => {
  cleanup()
})

describe('SoundToggle', () => {
  it('starts ON and is a real accessible toggle button', () => {
    render(<SoundToggle />)

    const button = screen.getByRole('button', { name: /on/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles to OFF and back on click', async () => {
    const user = userEvent.setup()
    render(<SoundToggle />)

    const button = screen.getByRole('button')
    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveTextContent(/off/i)

    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveTextContent(/on/i)
  })
})
