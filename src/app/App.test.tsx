import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { audioManager } from '../game/audio/AudioManager'
import { authManager } from '../game/auth/AuthManager'
import { gameEventBridge } from '../game/events/GameEventBridge'
import { landingContactItems } from '../data/contact'
import { RESUME_PDF_PATH } from '../data/resume'
import App from './App'

const { gameAppCreateSpy, behavior, pendingCanvas, preloadStartSpy } =
  vi.hoisted(() => ({
    gameAppCreateSpy: vi.fn(),
    behavior: { current: 'success' as 'success' | 'error' | 'pending' },
    /** The callbacks of a 'pending' mount, so a test can settle it later. */
    pendingCanvas: {
      ready: null as (() => void) | null,
      fail: null as ((error: unknown) => void) | null,
    },
    preloadStartSpy: vi.fn(),
  }))

interface MockGameCanvasProps {
  onReady?: () => void
  onError?: (error: unknown) => void
  initialCameraMode?: string
}

vi.mock('./GameCanvas', () => ({
  // Mirrors real GameCanvas's contract: a single effect with empty deps
  // performs "initialization" exactly once per mount and reports the
  // result via onReady/onError — never on every re-render.
  GameCanvas: (props: MockGameCanvasProps) => {
    useEffect(() => {
      gameAppCreateSpy(props.initialCameraMode)
      if (behavior.current === 'success') props.onReady?.()
      else if (behavior.current === 'error')
        props.onError?.(new Error('simulated init failure'))
      else {
        // 'pending': an initialization that only settles when the test says so.
        pendingCanvas.ready = () => props.onReady?.()
        pendingCanvas.fail = (error) => props.onError?.(error)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <div data-testid="game-canvas-stub" />
  },
}))

// The real preload pulls ~90 PNGs through Pixi's Assets loader, which has no
// meaning in jsdom — it has its own unit test (preloadWorldAssets.test.ts).
vi.mock('../game/world/preloadWorldAssets', () => {
  const state = {
    started: true,
    total: 1,
    settled: 1,
    failed: 0,
    characterReady: true,
    coreReady: true,
    complete: true,
    coreError: null,
  }
  return {
    gamePreloader: {
      start: preloadStartSpy,
      subscribe: () => () => {},
      getState: () => state,
    },
  }
})

beforeEach(() => {
  gameAppCreateSpy.mockClear()
  preloadStartSpy.mockClear()
  behavior.current = 'success'
  pendingCanvas.ready = null
  pendingCanvas.fail = null
  window.sessionStorage.clear()
  authManager.logout()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  authManager.logout()
})

type User = ReturnType<typeof userEvent.setup>

const viewSelectHeading = () =>
  screen.queryByRole('heading', { name: /select your view/i })
const exitButton = () => screen.queryByRole('button', { name: /^exit$/i })

/** LANDING -> VIEW_SELECT. Synchronous by design: the screen never waits on the game. */
async function startJourney(user: User) {
  await user.click(screen.getByRole('button', { name: /start journey/i }))
  expect(viewSelectHeading()).toBeInTheDocument()
}

/** Picks `view` on VIEW_SELECT and clicks ENTER DHAWAL.OS — without waiting for what follows. */
async function pickViewAndEnter(user: User, view: RegExp = /explore view/i) {
  await user.click(screen.getByRole('radio', { name: view }))
  await user.click(screen.getByRole('button', { name: /enter dhawal\.os/i }))
}

async function waitForGame() {
  await waitFor(() => expect(exitButton()).toBeInTheDocument(), {
    timeout: 3000,
  })
}

/** VIEW_SELECT (picking `view`) -> LOADING -> GAME. */
async function enterFromViewSelect(user: User, view?: RegExp) {
  await pickViewAndEnter(user, view)
  await waitForGame()
}

/** Full LANDING -> START JOURNEY -> VIEW_SELECT -> LOADING -> GAME walk, for tests that just need to be in GAME. */
async function enterGame(user: User) {
  render(<App />)
  await startJourney(user)
  await enterFromViewSelect(user)
}

async function confirmExit(user: User) {
  await user.click(screen.getByRole('button', { name: /^exit$/i }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /^exit$/i }),
  )
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
      screen.getByRole('heading', { name: /HI,\s*I.M DHAWAL/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /view resume/i }),
    ).toBeInTheDocument()
  })

  it('START JOURNEY only shows VIEW_SELECT — it never mounts or initializes the engine', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)

    expect(viewSelectHeading()).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('game-canvas-stub')).not.toBeInTheDocument()
    expect(gameAppCreateSpy).not.toHaveBeenCalled()
    expect(exitButton()).not.toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(false)

    // Picking a view still starts nothing — only ENTER does.
    await user.click(screen.getByRole('radio', { name: /explore view/i }))
    expect(gameAppCreateSpy).not.toHaveBeenCalled()
  })

  it('START JOURNEY makes sure the asset download is under way, even if the page-load trigger has not fired yet', async () => {
    const user = userEvent.setup()
    render(<App />)
    preloadStartSpy.mockClear()

    await startJourney(user)

    expect(preloadStartSpy).toHaveBeenCalled()
  })

  it('ENTER DHAWAL.OS goes through initialization into GAME, with no access screen and the guest session ensured automatically', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'DHAWAL.OS' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /access system/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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

  it('ENTER DHAWAL.OS shows the initialization screen, initializes the engine behind it, and enters GAME the moment the engine is ready', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    render(<App />)
    await startJourney(user)

    expect(gameAppCreateSpy).not.toHaveBeenCalled()

    await pickViewAndEnter(user)

    expect(screen.getByRole('status')).toHaveTextContent(/initializing system/i)
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
    expect(viewSelectHeading()).not.toBeInTheDocument()
    expect(exitButton()).not.toBeInTheDocument()

    act(() => pendingCanvas.ready?.())

    expect(exitButton()).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
  })

  it('a failed initialization transitions LOADING -> ERROR with a recovery action, not a raw error', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)
    await pickViewAndEnter(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/unable to initialize/i)
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
    expect(exitButton()).not.toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('a failure arriving later, while the initialization screen is up, also transitions LOADING -> ERROR', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)
    await startJourney(user)
    await pickViewAndEnter(user)
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => pendingCanvas.fail?.(new Error('core asset missing')))

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to initialize/i)
    expect(exitButton()).not.toBeInTheDocument()
  })

  it('TRY AGAIN retries and can recover, without creating more than one fresh attempt — and keeps the chosen view', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)
    await pickViewAndEnter(user, /overview/i)
    await screen.findByRole('alert')
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    behavior.current = 'success'
    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitForGame()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    // Exactly one new attempt was made on retry — not zero, not more than one.
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(2)
    // The fresh engine opens in the view picked before the failure.
    expect(gameAppCreateSpy).toHaveBeenLastCalledWith('overview')
  })

  it('does not re-initialize GameApp because of unrelated React re-renders', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<App />)

    await startJourney(user)
    await enterFromViewSelect(user)
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

  it('shows only the verified contact channels from project data as icon links on landing (never fabricated)', () => {
    render(<App />)

    const nav = screen.getByRole('navigation', { name: /contact links/i })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      landingContactItems.map((item) => item.href),
    )
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

describe('App background game preload', () => {
  it('starts on LANDING, once the page is usable — before START JOURNEY, and without mounting the game', async () => {
    render(<App />)

    await waitFor(() => expect(preloadStartSpy).toHaveBeenCalled())

    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
    expect(gameAppCreateSpy).not.toHaveBeenCalled()
  })

  it('waits for the page to finish loading before starting', async () => {
    const readyState = vi
      .spyOn(document, 'readyState', 'get')
      .mockReturnValue('loading')
    render(<App />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(preloadStartSpy).not.toHaveBeenCalled()

    readyState.mockReturnValue('complete')
    window.dispatchEvent(new Event('load'))
    await waitFor(() => expect(preloadStartSpy).toHaveBeenCalled())

    readyState.mockRestore()
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

  it('an active session flag (a refresh after entering the game) skips LANDING and VIEW_SELECT, bootstrapping straight into GAME', async () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'true')
    authManager.createGuestSession()

    render(<App />)

    expect(
      screen.queryByRole('button', { name: /start journey/i }),
    ).not.toBeInTheDocument()
    expect(viewSelectHeading()).not.toBeInTheDocument()
    // Exactly one new GameApp is initialized for the new page session — the
    // old runtime is gone, so a real bootstrap still has to happen.
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    await waitForGame()
    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
  })

  it('an active session flag without a guest session still goes straight to GAME — the session is re-created silently, never via an access screen', async () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'true')

    render(<App />)

    await waitForGame()
    expect(
      screen.queryByRole('button', { name: /access system/i }),
    ).not.toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(true)
  })

  it('a malformed session flag value is treated as no active session (falls back to LANDING, never crashes)', () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'nonsense')

    expect(() => render(<App />)).not.toThrow()
    expect(
      screen.getByRole('button', { name: /start journey/i }),
    ).toBeInTheDocument()
  })

  it('the session flag is not set by START JOURNEY or by sitting on VIEW_SELECT — only by actually entering the game', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)
    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()

    await enterFromViewSelect(user)
    expect(window.sessionStorage.getItem('dhawalos:game-session-active')).toBe(
      'true',
    )
  })

  it('the session flag is not set while the initialization screen is still waiting on the engine', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    render(<App />)

    await startJourney(user)
    await pickViewAndEnter(user)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()
  })

  it('a failed initialization never sets the session flag', async () => {
    const user = userEvent.setup()
    behavior.current = 'error'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)

    await startJourney(user)
    await pickViewAndEnter(user)
    await screen.findByRole('alert')

    expect(
      window.sessionStorage.getItem('dhawalos:game-session-active'),
    ).toBeNull()
  })
})

describe('App guest access', () => {
  it('never shows the access screen or asks for any input — the only clicks are START JOURNEY, a view, and ENTER', async () => {
    const user = userEvent.setup()
    render(<App />)

    await startJourney(user)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/guest session/i)).not.toBeInTheDocument()

    await enterFromViewSelect(user)
    expect(screen.queryByText(/guest session/i)).not.toBeInTheDocument()
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
    expect(exitButton()).not.toBeInTheDocument()

    await startJourney(user)
    expect(exitButton()).not.toBeInTheDocument()

    await pickViewAndEnter(user)
    // Still LOADING (the mocked init hasn't resolved) — EXIT must not appear yet.
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(exitButton()).not.toBeInTheDocument()
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
    await enterFromViewSelect(user)

    await confirmExit(user)

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

  it('after EXIT, START JOURNEY works again, re-initializes exactly one new GameApp, and asks for the view again', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    await confirmExit(user)
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)

    await startJourney(user)
    // A fresh visit after EXIT — nothing carries over from the previous
    // session: no view is pre-selected, and the guest session is gone.
    expect(
      screen.getByRole('button', { name: /select a view/i }),
    ).toBeDisabled()
    expect(authManager.isAuthenticated()).toBe(false)

    await enterFromViewSelect(user)

    expect(screen.getByTestId('game-canvas-stub')).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(2)
    expect(window.sessionStorage.getItem('dhawalos:game-session-active')).toBe(
      'true',
    )
    expect(authManager.isAuthenticated()).toBe(true)
  })
})

describe('App view selection', () => {
  it('START JOURNEY leads to VIEW_SELECT — not straight into GAME — and there is no HUD VIEW control yet', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startJourney(user)

    expect(exitButton()).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /camera view/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /select a view/i }),
    ).toBeDisabled()
  })

  it('picking OVERVIEW sends it to the camera, and the HUD selector reflects it once in GAME', async () => {
    const received: string[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    const user = userEvent.setup()
    render(<App />)
    await startJourney(user)
    await enterFromViewSelect(user, /overview/i)
    unsubscribe()

    expect(received).toContain('CAMERA_OVERVIEW')
    expect(received).not.toContain('CAMERA_EXPLORE')
    expect(viewSelectHeading()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /view/i }))
    expect(screen.getByRole('radio', { name: /overview/i })).toBeChecked()
  })

  it('the view picked on VIEW_SELECT is the mode the engine is created in', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startJourney(user)
    await enterFromViewSelect(user, /overview/i)
    expect(gameAppCreateSpy).toHaveBeenLastCalledWith('overview')

    await confirmExit(user)
    await startJourney(user)
    await enterFromViewSelect(user, /explore view/i)
    expect(gameAppCreateSpy).toHaveBeenLastCalledWith('explore')
  })

  it('a refresh (which skips VIEW_SELECT) creates the engine in its default mode', async () => {
    window.sessionStorage.setItem('dhawalos:game-session-active', 'true')

    render(<App />)
    await waitForGame()

    expect(gameAppCreateSpy).toHaveBeenLastCalledWith(undefined)
  })

  it('switching from the HUD selector during GAME sends the new mode without leaving GAME', async () => {
    const user = userEvent.setup()
    await enterGame(user)
    const received: string[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    await user.click(screen.getByRole('button', { name: /view/i }))
    await user.click(screen.getByRole('radio', { name: /overview/i }))
    await user.click(screen.getByRole('radio', { name: /explore/i }))
    unsubscribe()

    expect(received).toEqual(['CAMERA_OVERVIEW', 'CAMERA_EXPLORE'])
    expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument()
    expect(gameAppCreateSpy).toHaveBeenCalledTimes(1)
  })
})

describe('App background music', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stays silent through LANDING, VIEW_SELECT and LOADING, starts in GAME, stops on EXIT, and starts again on re-entry', async () => {
    const playMusic = vi.spyOn(audioManager, 'playMusic')
    const stopMusic = vi.spyOn(audioManager, 'stopMusic')
    const user = userEvent.setup()

    render(<App />)
    await startJourney(user)
    expect(playMusic).not.toHaveBeenCalled()

    await enterFromViewSelect(user)
    expect(playMusic).toHaveBeenCalledTimes(1)
    expect(playMusic).toHaveBeenCalledWith('house-theme')
    expect(stopMusic).not.toHaveBeenCalled()

    await confirmExit(user)
    expect(stopMusic).toHaveBeenCalledTimes(1)

    await startJourney(user)
    await enterFromViewSelect(user)
    expect(playMusic).toHaveBeenCalledTimes(2)
  })
})

describe('App — on-screen mobile controls', () => {
  it('exist only in GAME — never on landing, view select or the initialization screen', async () => {
    const user = userEvent.setup()
    behavior.current = 'pending'
    const controls = () => screen.queryByRole('button', { name: 'Interact' })

    render(<App />)
    expect(controls()).toBeNull()

    await startJourney(user)
    expect(controls()).toBeNull()

    await pickViewAndEnter(user)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(controls()).toBeNull()

    act(() => pendingCanvas.ready?.())
    await waitFor(() => expect(controls()).toBeInTheDocument())
    expect(
      screen.getByRole('group', { name: 'Movement joystick' }),
    ).toBeInTheDocument()
  })

  it('are removed while a portfolio panel is open and return when it closes', async () => {
    const user = userEvent.setup()
    await enterGame(user)

    act(() => gameEventBridge.emit('OPEN_SKILLS'))
    expect(
      screen.queryByRole('group', { name: 'Movement joystick' }),
    ).toBeNull()

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.getByRole('group', { name: 'Movement joystick' }),
      ).toBeInTheDocument(),
    )
  })
})
