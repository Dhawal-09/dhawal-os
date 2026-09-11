import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { ExitControl } from './ExitControl'

afterEach(() => {
  cleanup()
})

describe('ExitControl', () => {
  it('renders a visible, keyboard-accessible EXIT button, with no dialog until clicked', () => {
    render(<ExitControl onExitConfirmed={vi.fn()} />)

    expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking EXIT does not immediately exit — it opens the confirmation dialog and pauses the world', async () => {
    const user = userEvent.setup()
    const onExitConfirmed = vi.fn()
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)

    render(<ExitControl onExitConfirmed={onExitConfirmed} />)
    await user.click(screen.getByRole('button', { name: /^exit$/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onExitConfirmed).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledWith('PAUSE_WORLD')

    unsubscribe()
  })

  it('EXIT is keyboard-activatable via Enter', async () => {
    const user = userEvent.setup()
    render(<ExitControl onExitConfirmed={vi.fn()} />)

    screen.getByRole('button', { name: /^exit$/i }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('CANCEL in the dialog closes it, resumes the world, and never calls onExitConfirmed', async () => {
    const user = userEvent.setup()
    const onExitConfirmed = vi.fn()
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)

    render(<ExitControl onExitConfirmed={onExitConfirmed} />)
    await user.click(screen.getByRole('button', { name: /^exit$/i }))
    listener.mockClear()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onExitConfirmed).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledWith('RETURN_TO_WORLD')

    unsubscribe()
  })

  it('confirming EXIT in the dialog calls onExitConfirmed exactly once and closes the dialog', async () => {
    const user = userEvent.setup()
    const onExitConfirmed = vi.fn()

    render(<ExitControl onExitConfirmed={onExitConfirmed} />)
    await user.click(screen.getByRole('button', { name: /^exit$/i }))
    // Two "EXIT"-named buttons exist while the dialog is open — the
    // control button and the dialog's confirm button — so scope to the dialog.
    const dialogExitButton = within(screen.getByRole('dialog')).getByRole(
      'button',
      {
        name: /^exit$/i,
      },
    )
    await user.click(dialogExitButton)

    expect(onExitConfirmed).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
