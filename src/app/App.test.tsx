import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authManager } from '../game/auth/AuthManager'
import { RESUME_PDF_PATH } from '../data/resume'
import App from './App'

const { gameAppCreateSpy, behavior } = vi.hoisted(() => ({
  gameAppCreateSpy: vi.fn(),
  behavior: { current: 'success' as 'success' | 'error' | 'pending' },
}))

interface MockGameCanvasProps {
  onReady?: () => void
  onError?: (error: unknown) => void
}

vi.mock('./GameCanvas', () => ({
  // Mirrors real GameCanvas's contract: a single effect with empty deps
  // performs "initialization" exactly once per mount and reports the
  // result via onReady/onError — never on every re-render.
  GameCanvas: (props: MockGameCanvasProps) => {
    useEffect(() => {
      gameAppCreateSpy()
      if (behavior.current === 'success') props.onReady?.()
      else if (behavior.current === 'error')
        props.onError?.(new Error('simulated init failure'))
      // 'pending': simulate an initialization that never resolves.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <div data-testid="game-canvas-stub" />
  },
}))

beforeEach(() => {
  gameAppCreateSpy.mockClear()
  behavior.current = 'success'
  window.sessionStorage.clear()
  authManager.logout()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  authManager.logout()
})

async function startJourney(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /start journey/i }))
}

/** Waits for BOOT to finish and the ACCESS panel to appear — the real engine must have actually reported ready. */
async function waitForAccessPanel() {
  await waitFor(
    () => {
      expect(
        screen.getByRole('button', { name: /access system/i }),
      ).toBeInTheDocument()
    },
    { timeout: 3000 },
  )
}

/** Clicks ACCESS SYSTEM and waits through the (brief) guest-access animation into GAME. */
async function grantAccess(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /access system/i }))
  await waitFor(
    () => {
      expect(
        screen.getByRole('button', { name: /^exit$/i }),
      ).toBeInTheDocument()
    },
    { timeout: 3000 },
  )
}

/** Full LANDING -> START JOURNEY -> BOOT -> ACCESS -> GAME walk, for tests that just need to be in GAME. */
async function enterGame(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await startJourney(user)
  await waitForAccessPanel()
  await grantAccess(user)
}

describe('App lifecycle', () => {
  it('the initial application state is LANDING — the game is not mounted/initialized yet', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('game-canvas-stub')).not.toBeInTheDocument()
    expect(gameAppCreateSpy).not.toHaveBeenCalled()
  })

  it('renders the landing screen with branding and the primary CTAs', () => {
    render(<App />)

    expect(screen.getByText('DHAWAL.OS')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /HI, I.M DHAWAL/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /view resume/i }),
    ).toBeInTheDocument()
  })

  it('START JOURNEY moves the lifecycle to LOADING (boot screen) and triggers GameApp initialization', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    render(<App />)

    await startJourney(user)

    expect(screen.getByRole('status')).toHaveTextContent(/initializing system/i)
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
  })

  it('a successful initialization transitions LOADING -> ACCESS, never reaching GAME on its own', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)
    await waitForAccessPanel()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^exit$/i }),
    ).not.toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(false)
  })

  it('clicking ACCESS SYSTEM on the guest-access panel completes ACCESS -> GAME', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'DHAWAL.OS' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /access system/i }),
    ).not.toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(true)
    // The portfolio nav is reachable via the HUD's menu disclosure
    // (PHASE 09 GameHud), not shown expanded by default.
    expect(
      screen.queryByRole('navigation', { name: /portfolio sections/i }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(
      screen.getByRole('navigation', { name: /portfolio sections/i }),
    ).toBeInTheDocument()
  })

  it('a failed initialization transitions LOADING -> ERROR with a recovery action, not a raw error', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/unable to initialize/i)
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('TRY AGAIN retries and can recover, without creating more than one fresh attempt', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)
    await screen.findByRole('alert')
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    behavior.current = 'success'
    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitForAccessPanel()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    // Exactly one new attempt was made on retry — not zero, not more than one.
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(2)
  })

  it('does not re-initialize GameApp because of unrelated React re-renders', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<App />)

    await startJourney(user)
    await waitForAccessPanel()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    // Force additional renders of the same App instance/tree.
    rerender(<App />)
    rerender(<App />)

    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
  })

  it('VIEW RESUME on the landing screen uses the same resume asset path as the in-game Resume panel', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /view resume/i })).toHaveAttribute(
      'href',
      RESUME_PDF_PATH,
    )
  })

  it('omits social links on landing when no verified URLs exist in project data (never fabricated)', () => {
    render(<App />)

    expect(
      screen.queryByRole('navigation', { name: /social links/i }),
    ).not.toBeInTheDocument()
  })

  it('reduced-motion preference does not break the lifecycle transitions', async () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia

    const user = userEvent.setup()
    await enterGame(user)

    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()

    window.matchMedia = original
  })
})

describe('App session persistence (refresh behavior)', () => {
  it('a fresh visit with no session flag starts in LANDING', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(gameAppCreateSpy).not.toHaveBeenCalled()
  })

  it('an active session flag but no guest-auth session (simulating a refresh mid-ACCESS) skips LANDING, bootstraps the engine, and still gates on ACCESS', async () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'true')

    render(<App />)

    expect(
      screen.queryByRole('button', { name: /start journey/i }),
    ).not.toBeInTheDocument()
    // Exactly one new GameApp is initialized for the new page session — the
    // old runtime is gone, so a real bootstrap still has to happen.
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    await waitForAccessPanel()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
  })

  it('an active session flag AND a persisted guest session (refresh after fully entering the game) skips LANDING and ACCESS, bootstrapping straight into GAME', async () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'true')
    authManager.createGuestSession()

    render(<App />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /^exit$/i }),
        ).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(
      screen.queryByRole('button', { name: /access system/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
  })

  it('a malformed session flag value is treated as no active session (falls back to LANDING, never crashes)', () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'nonsense')

    expect(() => render(<App />)).not.toThrow()
    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
  })

  it('the session flag is only set once the engine successfully becomes ready, not merely on START_JOURNEY', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    render(<App />)

    await startJourney(user)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()
  })

  it('the session flag is set once the engine reports ready, even before ACCESS completes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)
    await waitFor(() => {
      expect(
        window.sessionStorage.getItem('dhawalos:game-session-active'),
      ).toBe('true')
    })
  })

  it('a failed initialization never sets the session flag', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)
    await screen.findByRole('alert')

    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()
  })
})

describe('App guest-access flow', () => {
  it('the access panel requires no keyboard/typed input — clicking ACCESS SYSTEM alone is enough', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)
    await waitForAccessPanel()

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await grantAccess(user)
    expect(authManager.isAuthenticated()).toBe(true)
  })

  it('never shows an entrance-based [E] AUTHENTICATE prompt or interaction anywhere in the app shell', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    expect(screen.queryByText(/\[E\] AUTHENTICATE/i)).not.toBeInTheDocument()
  })
})

describe('App exit flow', () => {
  it('shows a visible EXIT control once in GAME, not before', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    render(<App />)
    expect(
      screen.queryByRole('button', { name: /^exit$/i }),
    ).not.toBeInTheDocument()

    await startJourney(user)
    // Still LOADING (the mocked init never resolves) — EXIT must not appear yet.
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^exit$/i }),
    ).not.toBeInTheDocument()
  })

  it('EXIT appears once GAME is actually reached', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument()
  })

  it('clicking EXIT then CANCEL keeps the game running, without touching the session flag or GameApp', async () => {
    const user = userEvent.setup()
    await enterGame(user)
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^exit$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('dhawalos:game-session-active')).toBe(
      'true',
    )
    expect(authManager.isAuthenticated()).toBe(true)
  })

  it('confirming EXIT clears the session flag and guest session, unmounts GameCanvas, and returns to LANDING — via a plain React re-render, the same render() container throughout (never a page reload)', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await startJourney(user)
    await waitForAccessPanel()
    await grantAccess(user)

    await user.click(screen.getByRole('button', { name: /^exit$/i }))
    const dialogExitButton = within(screen.getByRole('dialog')).getByRole(
      'button',
      {
        name: /^exit$/i,
      },
    )
    await user.click(dialogExitButton)

    // Still the same RTL-managed container/DOM node — a real reload would
    // tear down and rebuild the whole page, not just re-render this tree.
    expect(container.querySelector('.landing-screen')).not.toBeNull()
    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('game-canvas-stub')).not.toBeInTheDocument()
    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()
    expect(authManager.isAuthenticated()).toBe(false)
  })

  it('after EXIT, START JOURNEY works again, re-initializes exactly one new GameApp, and requires guest access again', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    await user.click(screen.getByRole('button', { name: /^exit$/i }))
    const dialogExitButton = within(screen.getByRole('dialog')).getByRole(
      'button',
      {
        name: /^exit$/i,
      },
    )
    await user.click(dialogExitButton)
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    await startJourney(user)
    await waitForAccessPanel()
    // A fresh visit after EXIT — guest access is required again, not
    // silently skipped (the previous session was cleared on EXIT).
    expect(
      screen.getByRole('button', { name: /access system/i }),
    ).toBeInTheDocument()

    await grantAccess(user)

    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(2)
    expect(window.sessionStorage.getItem('dhawalos:game-session-active')).toBe(
      'true',
    )
  })
})
