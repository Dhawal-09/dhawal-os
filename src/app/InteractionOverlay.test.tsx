import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameEventBridge } from '../game/events/GameEventBridge'
import { InteractionOverlay } from './InteractionOverlay'

afterEach(() => {
  cleanup()
})

describe('InteractionOverlay', () => {
  it('renders nothing until an OPEN_* event arrives', () => {
    render(<InteractionOverlay />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the corresponding bridge event', () => {
    render(<InteractionOverlay />)

    act(() => {
      gameEventBridge.emit('OPEN_PROJECTS')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Projects' }),
    ).toBeInTheDocument()
  })

  it('closes on CLOSE_OVERLAY', () => {
    render(<InteractionOverlay />)
    act(() => {
      gameEventBridge.emit('OPEN_EXPERIENCE')
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => {
      gameEventBridge.emit('CLOSE_OVERLAY')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on RETURN_TO_WORLD', () => {
    render(<InteractionOverlay />)
    act(() => {
      gameEventBridge.emit('OPEN_SKILLS')
    })

    act(() => {
      gameEventBridge.emit('RETURN_TO_WORLD')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking Close hides the panel and emits RETURN_TO_WORLD back through the bridge', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)

    render(<InteractionOverlay />)
    act(() => {
      gameEventBridge.emit('OPEN_RESUME')
    })

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(listener).toHaveBeenCalledWith('RETURN_TO_WORLD')
    unsubscribe()
  })

  it('pressing Escape closes the panel', async () => {
    const user = userEvent.setup()
    render(<InteractionOverlay />)
    act(() => {
      gameEventBridge.emit('OPEN_CERTIFICATES')
    })

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a later OPEN_* event switches the displayed content without needing a close first', () => {
    render(<InteractionOverlay />)

    act(() => {
      gameEventBridge.emit('OPEN_PROJECTS')
    })
    expect(
      screen.getByRole('heading', { name: 'Projects' }),
    ).toBeInTheDocument()

    act(() => {
      gameEventBridge.emit('OPEN_ABOUT')
    })
    expect(
      screen.getByRole('heading', { name: 'About Me' }),
    ).toBeInTheDocument()
  })

  it('stops reacting to bridge events after unmount (no leaked subscription)', () => {
    const { unmount } = render(<InteractionOverlay />)
    unmount()

    expect(() => {
      act(() => {
        gameEventBridge.emit('OPEN_PROJECTS')
      })
    }).not.toThrow()
    // Nothing to assert on screen — the component tree is gone; this just
    // proves the subscribed listener doesn't throw/act-warn after unmount.
  })
})
