import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ViewToggle } from './ViewToggle'

afterEach(() => {
  cleanup()
})

describe('ViewToggle (HUD camera selector)', () => {
  it('is closed by default and opens a CAMERA VIEW selector reflecting the current mode', async () => {
    const user = userEvent.setup()
    render(<ViewToggle mode="explore" onChange={vi.fn()} />)

    const button = screen.getByRole('button', { name: /view/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('radio', { name: /explore/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /overview/i })).not.toBeChecked()
  })

  it('selecting a mode reports it and keeps the selector open; CLOSE dismisses it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewToggle mode="explore" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /view/i }))
    await user.click(screen.getByRole('radio', { name: /overview/i }))
    expect(onChange).toHaveBeenCalledWith('overview')
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view/i })).toHaveFocus()
  })

  it('Escape closes the selector without changing the mode', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewToggle mode="overview" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /view/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
