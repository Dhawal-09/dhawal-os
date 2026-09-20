import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BootScreen } from './BootScreen'

afterEach(() => {
  cleanup()
})

describe('BootScreen', () => {
  it('renders as an accessible status region with the boot checklist', () => {
    render(<BootScreen engineReady={false} onBootComplete={vi.fn()} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('DHAWAL.OS')
    expect(status).toHaveTextContent('Loading world')
    expect(status).toHaveTextContent('Loading assets')
    expect(status).toHaveTextContent('Initializing renderer')
    expect(status).toHaveTextContent('Initializing input')
    expect(status).toHaveTextContent('Loading environment')
  })

  it('never calls onBootComplete while the real engine is not ready, even after its own checklist finishes', async () => {
    const onBootComplete = vi.fn()
    render(<BootScreen engineReady={false} onBootComplete={onBootComplete} />)

    // Give the checklist's own short animation plenty of time to finish.
    await new Promise((resolve) => setTimeout(resolve, 800))

    expect(onBootComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/finalizing/i)
  })

  it('calls onBootComplete exactly once, once both the checklist finishes and the engine is ready', async () => {
    const onBootComplete = vi.fn()
    render(<BootScreen engineReady={true} onBootComplete={onBootComplete} />)

    await waitFor(() => expect(onBootComplete).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('status')).toHaveTextContent(/system ready/i)

    // Stays at exactly one call even as more time passes.
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onBootComplete).toHaveBeenCalledTimes(1)
  })

  it('flips from not-ready to ready mid-animation without ever completing twice', async () => {
    const onBootComplete = vi.fn()
    const { rerender } = render(
      <BootScreen engineReady={false} onBootComplete={onBootComplete} />,
    )

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onBootComplete).not.toHaveBeenCalled()

    rerender(<BootScreen engineReady={true} onBootComplete={onBootComplete} />)

    await waitFor(() => expect(onBootComplete).toHaveBeenCalledTimes(1))
  })

  it('exposes a progressbar that never exceeds 100', async () => {
    render(<BootScreen engineReady={true} onBootComplete={vi.fn()} />)

    await new Promise((resolve) => setTimeout(resolve, 700))

    const bar = screen.getByRole('progressbar')
    const value = Number(bar.getAttribute('aria-valuenow'))
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(100)
  })
})
