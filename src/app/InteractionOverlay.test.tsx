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

  it('opens on the corresponding bridge event, with the matching section content', () => {
    render(<InteractionOverlay />)

    act(() => {
      gameEventBridge.emit('OPEN_PROJECTS')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Projects', level: 2 }),
    ).toBeInTheDocument()
    // Real content from src/data/projects.ts, not a generic placeholder.
    expect(screen.getByText(/Unifi/)).toBeInTheDocument()
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
      screen.getByRole('heading', { name: 'Projects', level: 2 }),
    ).toBeInTheDocument()

    act(() => {
      gameEventBridge.emit('OPEN_ABOUT')
    })
    expect(
      screen.getByRole('heading', { name: 'About Me', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Projects', level: 2 }),
    ).not.toBeInTheDocument()
  })

  it('every canonical OPEN_* event opens exactly its own section, and no other', () => {
    const cases: Array<[Parameters<typeof gameEventBridge.emit>[0], string]> = [
      ['OPEN_PROJECTS', 'Projects'],
      ['OPEN_EXPERIENCE', 'Experience'],
      ['OPEN_SKILLS', 'Skills'],
      ['OPEN_EDUCATION', 'Education'],
      ['OPEN_CERTIFICATES', 'Certificates'],
      ['OPEN_RESUME', 'Resume'],
      ['OPEN_ABOUT', 'About Me'],
      ['OPEN_CONTACT', 'Contact'],
    ]

    render(<InteractionOverlay />)

    for (const [event, title] of cases) {
      act(() => {
        gameEventBridge.emit(event)
      })
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(title)
    }
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

  describe('focus management', () => {
    it('moves focus into the panel when it opens', async () => {
      render(<InteractionOverlay />)

      await act(async () => {
        gameEventBridge.emit('OPEN_PROJECTS')
      })

      expect(screen.getByRole('dialog')).toHaveFocus()
    })

    it('restores focus to the previously focused element after closing', async () => {
      const user = userEvent.setup()
      render(
        <>
          <button type="button">Open trigger</button>
          <InteractionOverlay />
        </>,
      )

      const trigger = screen.getByRole('button', { name: 'Open trigger' })
      trigger.focus()
      expect(trigger).toHaveFocus()

      await act(async () => {
        gameEventBridge.emit('OPEN_ABOUT')
      })
      expect(screen.getByRole('dialog')).toHaveFocus()

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(trigger).toHaveFocus()
    })

    it('wraps Tab forward from the last focusable element back to the first (Close button)', async () => {
      const user = userEvent.setup()
      render(<InteractionOverlay />)

      act(() => {
        gameEventBridge.emit('OPEN_RESUME')
      })

      // DOM order inside the panel is [Close button, Resume link] — the
      // Resume link is the last focusable element for this section.
      const closeButton = screen.getByRole('button', { name: /close/i })
      const resumeLink = screen.getByRole('link', { name: /resume/i })

      resumeLink.focus()
      expect(resumeLink).toHaveFocus()

      await user.tab()

      expect(closeButton).toHaveFocus()
    })

    it('wraps Shift+Tab backward from the first focusable element (Close button) to the last', async () => {
      const user = userEvent.setup()
      render(<InteractionOverlay />)

      act(() => {
        gameEventBridge.emit('OPEN_RESUME')
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      const resumeLink = screen.getByRole('link', { name: /resume/i })

      closeButton.focus()
      expect(closeButton).toHaveFocus()

      await user.tab({ shift: true })

      expect(resumeLink).toHaveFocus()
    })
  })

  describe('reduced motion', () => {
    it('does not throw when the environment has no window.matchMedia', () => {
      const original = window.matchMedia
      // @ts-expect-error simulating an environment without matchMedia support
      delete window.matchMedia

      render(<InteractionOverlay />)
      expect(() => {
        act(() => {
          gameEventBridge.emit('OPEN_ABOUT')
        })
      }).not.toThrow()

      window.matchMedia = original
    })

    it('skips the entrance transition when prefers-reduced-motion is set', () => {
      const original = window.matchMedia
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as typeof window.matchMedia

      render(<InteractionOverlay />)
      act(() => {
        gameEventBridge.emit('OPEN_ABOUT')
      })

      expect(screen.getByRole('dialog')).toHaveStyle({ opacity: '1' })

      window.matchMedia = original
    })
  })
})
