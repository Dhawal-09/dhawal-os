import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExitConfirmDialog } from './ExitConfirmDialog'

afterEach(() => {
  cleanup()
})

describe('ExitConfirmDialog', () => {
  it('renders an accessible dialog with a heading and both actions', () => {
    render(<ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      screen.getByRole('heading', { name: /exit dhawal\.os/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^cancel$/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument()
  })

  it('moves focus into the dialog on open, and restores it on close', () => {
    function Wrapper({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Trigger</button>
          {open && (
            <ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={vi.fn()} />
          )}
        </>
      )
    }

    const { rerender } = render(<Wrapper open={false} />)
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()
    expect(trigger).toHaveFocus()

    rerender(<Wrapper open={true} />)
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(<Wrapper open={false} />)
    expect(trigger).toHaveFocus()
  })

  it('calls onCancel when CANCEL is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ExitConfirmDialog onCancel={onCancel} onConfirmExit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirmExit when EXIT is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmExit = vi.fn()
    render(
      <ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={onConfirmExit} />,
    )

    await user.click(screen.getByRole('button', { name: /^exit$/i }))

    expect(onConfirmExit).toHaveBeenCalledTimes(1)
  })

  it('Escape calls onCancel, not onConfirmExit', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirmExit = vi.fn()
    render(
      <ExitConfirmDialog onCancel={onCancel} onConfirmExit={onConfirmExit} />,
    )

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirmExit).not.toHaveBeenCalled()
  })

  it('wraps Tab forward from the last focusable element (EXIT) back to the first (CANCEL)', async () => {
    const user = userEvent.setup()
    render(<ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={vi.fn()} />)

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i })
    const exitButton = screen.getByRole('button', { name: /^exit$/i })

    exitButton.focus()
    expect(exitButton).toHaveFocus()

    await user.tab()

    expect(cancelButton).toHaveFocus()
  })

  it('wraps Shift+Tab backward from the first focusable element (CANCEL) to the last (EXIT)', async () => {
    const user = userEvent.setup()
    render(<ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={vi.fn()} />)

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i })
    const exitButton = screen.getByRole('button', { name: /^exit$/i })

    cancelButton.focus()
    expect(cancelButton).toHaveFocus()

    await user.tab({ shift: true })

    expect(exitButton).toHaveFocus()
  })

  it('does not throw when there is no window.matchMedia (reduced-motion probe degrades gracefully)', () => {
    const original = window.matchMedia
    // @ts-expect-error simulating an environment without matchMedia support
    delete window.matchMedia

    expect(() =>
      render(<ExitConfirmDialog onCancel={vi.fn()} onConfirmExit={vi.fn()} />),
    ).not.toThrow()

    window.matchMedia = original
  })
})
