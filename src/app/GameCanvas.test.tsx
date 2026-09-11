import { cleanup, render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameCanvas } from './GameCanvas'

const { create, destroy, resize, triggerInteractTap } = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  resize: vi.fn(),
  triggerInteractTap: vi.fn(),
}))

vi.mock('../game/GameApp', () => ({
  GameApp: { create },
}))

beforeEach(() => {
  create.mockReset()
  destroy.mockReset()
  resize.mockReset()
  triggerInteractTap.mockReset()
  create.mockImplementation(async () => ({
    canvas: document.createElement('canvas'),
    destroy,
    resize,
    scene: { triggerInteractTap },
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('GameCanvas', () => {
  it('mounts the Pixi canvas and cleans up the observer/instance on unmount', async () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, 'observe')
    const disconnectSpy = vi.spyOn(ResizeObserver.prototype, 'disconnect')

    const { unmount, container } = render(<GameCanvas />)

    await waitFor(() => {
      expect(container.querySelector('canvas')).not.toBeNull()
    })

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(destroy).not.toHaveBeenCalled()

    unmount()

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('survives StrictMode double-invoke without leaking GameApp instances or observers', async () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, 'observe')
    const disconnectSpy = vi.spyOn(ResizeObserver.prototype, 'disconnect')

    const { unmount, container } = render(
      <StrictMode>
        <GameCanvas />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(container.querySelector('canvas')).not.toBeNull()
    })

    // StrictMode double-invokes the effect in development: one phantom
    // instance is created and torn down immediately, one instance survives.
    expect(create).toHaveBeenCalledTimes(2)
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(observeSpy).toHaveBeenCalledTimes(1)

    unmount()

    expect(destroy).toHaveBeenCalledTimes(2)
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('renders an accessible fallback message when Pixi initialization fails', async () => {
    create.mockRejectedValueOnce(new Error('WebGL unavailable'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { findByRole } = render(<GameCanvas />)

    expect(await findByRole('alert')).toHaveTextContent(/unavailable/i)
    expect(errorSpy).toHaveBeenCalled()
  })

  it("wires a touch pointerdown on the canvas host to the game scene's tap-to-interact stub", async () => {
    const { container, unmount } = render(<GameCanvas />)
    const host = container.querySelector('.game-canvas-host')

    await waitFor(() => {
      expect(container.querySelector('canvas')).not.toBeNull()
    })

    host?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }),
    )
    expect(triggerInteractTap).toHaveBeenCalledTimes(1)

    unmount()

    // No further calls once unmounted — the listener was removed, not left dangling.
    host?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }),
    )
    expect(triggerInteractTap).toHaveBeenCalledTimes(1)
  })

  it('ignores a mouse pointerdown on the canvas host (a desktop click there is for keyboard focus, not the mobile tap stub — see PHASE-08-PORTFOLIO-UI.md)', async () => {
    const { container } = render(<GameCanvas />)
    const host = container.querySelector('.game-canvas-host')

    await waitFor(() => {
      expect(container.querySelector('canvas')).not.toBeNull()
    })

    host?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
    )

    expect(triggerInteractTap).not.toHaveBeenCalled()
  })

  it('calls onReady exactly once after a successful initialization', async () => {
    const onReady = vi.fn()
    const onError = vi.fn()
    render(<GameCanvas onReady={onReady} onError={onError} />)

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1)
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onError (not onReady) with the underlying error when initialization fails', async () => {
    const failure = new Error('WebGL unavailable')
    create.mockRejectedValueOnce(failure)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReady = vi.fn()
    const onError = vi.fn()

    render(<GameCanvas onReady={onReady} onError={onError} />)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    })
    expect(onError).toHaveBeenCalledWith(failure)
    expect(onReady).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('never calls onReady/onError for a cancelled StrictMode phantom instance', async () => {
    const onReady = vi.fn()
    const onError = vi.fn()

    const { unmount } = render(
      <StrictMode>
        <GameCanvas onReady={onReady} onError={onError} />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1)
    })
    expect(onError).not.toHaveBeenCalled()

    unmount()
  })

  it('does not re-run initialization (or call onReady again) when onReady/onError props change identity across re-renders', async () => {
    const onReadyA = vi.fn()
    const { rerender } = render(<GameCanvas onReady={onReadyA} />)

    await waitFor(() => {
      expect(onReadyA).toHaveBeenCalledTimes(1)
    })
    expect(create).toHaveBeenCalledTimes(1)

    const onReadyB = vi.fn()
    rerender(<GameCanvas onReady={onReadyB} />)
    rerender(<GameCanvas onReady={onReadyB} />)

    expect(create).toHaveBeenCalledTimes(1)
    expect(onReadyB).not.toHaveBeenCalled()
  })
})
