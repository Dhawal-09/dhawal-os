import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorScreen } from './ErrorScreen'

afterEach(() => {
  cleanup()
})

describe('ErrorScreen', () => {
  it('shows a recovery message without a raw stack trace', () => {
    render(<ErrorScreen onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to initialize/i)
    expect(screen.getByRole('alert').textContent).not.toMatch(
      /at\s+\S+\.tsx?:\d+/,
    )
  })

  it('calls onRetry when TRY AGAIN is activated', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorScreen onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
