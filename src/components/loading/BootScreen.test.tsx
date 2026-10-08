import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GamePreloadState } from '../../game/world/preloadWorldAssets'
import { BootScreen } from './BootScreen'

afterEach(() => {
  cleanup()
})

const IDLE: GamePreloadState = {
  started: false,
  total: 10,
  settled: 0,
  failed: 0,
  characterReady: false,
  coreReady: false,
  complete: false,
  coreError: null,
}

/** A stand-in preload store whose state the test drives by hand. */
function createFakePreloader(initial: Partial<GamePreloadState> = {}) {
  let state: GamePreloadState = { ...IDLE, ...initial }
  const listeners = new Set<() => void>()
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState: () => state,
    set(next: Partial<GamePreloadState>) {
      state = { ...state, ...next }
      for (const listener of listeners) listener()
    },
  }
}

describe('BootScreen', () => {
  it('renders as an accessible status region with the system checklist, nothing checked before anything is ready', () => {
    render(
      <BootScreen
        rendererReady={false}
        engineReady={false}
        onBootComplete={vi.fn()}
        preloader={createFakePreloader()}
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('DHAWAL.OS')
    expect(status).toHaveTextContent(/initializing system/i)
    for (const stage of [
      'Renderer',
      'Input',
      'World manifest',
      'Character',
      'Core environment',
    ]) {
      expect(status).toHaveTextContent(stage)
    }
    expect(status).not.toHaveTextContent('✓')
    expect(status).toHaveTextContent('BACKGROUND ASSETS')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('each checklist line reflects the real thing it names, and the bar follows real preload progress', () => {
    const preloader = createFakePreloader({ started: true, settled: 4 })
    const { rerender } = render(
      <BootScreen
        rendererReady={false}
        engineReady={false}
        onBootComplete={vi.fn()}
        preloader={preloader}
      />,
    )

    expect(screen.getByText(/World manifest/)).toHaveClass('boot-stage-done')
    expect(screen.getByText('Renderer')).not.toHaveClass('boot-stage-done')
    expect(screen.getByText('Character')).not.toHaveClass('boot-stage-done')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    expect(screen.getByRole('status')).toHaveTextContent(/loading core assets/i)

    act(() =>
      preloader.set({ settled: 8, characterReady: true, coreReady: true }),
    )
    rerender(
      <BootScreen
        rendererReady={true}
        engineReady={false}
        onBootComplete={vi.fn()}
        preloader={preloader}
      />,
    )

    expect(screen.getByText(/Renderer/)).toHaveClass('boot-stage-done')
    expect(screen.getByText(/Character/)).toHaveClass('boot-stage-done')
    expect(screen.getByText(/Core environment/)).toHaveClass('boot-stage-done')
    expect(screen.getByText('Input')).not.toHaveClass('boot-stage-done')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '80',
    )
    expect(screen.getByRole('status')).toHaveTextContent(/starting world/i)
  })

  it('never calls onBootComplete while the real engine is not ready, however long it waits and however far the preload gets', async () => {
    const onBootComplete = vi.fn()
    render(
      <BootScreen
        rendererReady={true}
        engineReady={false}
        onBootComplete={onBootComplete}
        preloader={createFakePreloader({
          started: true,
          settled: 10,
          characterReady: true,
          coreReady: true,
          complete: true,
        })}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(onBootComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).not.toHaveTextContent(/system ready/i)
  })

  it('completes immediately — no cosmetic delay — when the engine is already ready as the screen appears', () => {
    const onBootComplete = vi.fn()
    render(
      <BootScreen
        rendererReady={true}
        engineReady={true}
        onBootComplete={onBootComplete}
        preloader={createFakePreloader({
          started: true,
          settled: 10,
          characterReady: true,
          coreReady: true,
          complete: true,
        })}
      />,
    )

    expect(onBootComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(/system ready/i)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('flips from not-ready to ready without ever completing twice', () => {
    const onBootComplete = vi.fn()
    const preloader = createFakePreloader()
    const { rerender } = render(
      <BootScreen
        rendererReady={false}
        engineReady={false}
        onBootComplete={onBootComplete}
        preloader={preloader}
      />,
    )
    expect(onBootComplete).not.toHaveBeenCalled()

    rerender(
      <BootScreen
        rendererReady={true}
        engineReady={true}
        onBootComplete={onBootComplete}
        preloader={preloader}
      />,
    )
    rerender(
      <BootScreen
        rendererReady={true}
        engineReady={true}
        onBootComplete={onBootComplete}
        preloader={preloader}
      />,
    )

    expect(onBootComplete).toHaveBeenCalledTimes(1)
  })

  it('can enter before every optional asset has landed — the bar shows the real, unfinished count', () => {
    const onBootComplete = vi.fn()
    render(
      <BootScreen
        rendererReady={true}
        engineReady={true}
        onBootComplete={onBootComplete}
        preloader={createFakePreloader({
          started: true,
          settled: 7,
          characterReady: true,
          coreReady: true,
        })}
      />,
    )

    expect(onBootComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '70',
    )
  })
})
