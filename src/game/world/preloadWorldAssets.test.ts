import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadWorldAssets } from './preloadWorldAssets'

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }))

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>()
  return { ...actual, Assets: { load: loadMock } }
})

afterEach(() => {
  loadMock.mockReset()
  vi.useRealTimers()
})

describe('preloadWorldAssets', () => {
  it('loads every distinct url exactly once and resolves only after all of them settle', async () => {
    let releaseSlow!: () => void
    loadMock.mockImplementation((url: string) =>
      url === '/slow.png'
        ? new Promise<void>((resolve) => (releaseSlow = resolve))
        : Promise.resolve(),
    )

    let done = false
    const promise = preloadWorldAssets(['/a.png', '/slow.png', '/a.png']).then(
      () => (done = true),
    )

    await Promise.resolve()
    expect(loadMock).toHaveBeenCalledTimes(2)
    expect(done).toBe(false)

    releaseSlow()
    await promise
    expect(done).toBe(true)
  })

  it('never rejects when an asset fails — that object just keeps its placeholder', async () => {
    loadMock.mockImplementation((url: string) =>
      url === '/broken.png'
        ? Promise.reject(new Error('404'))
        : Promise.resolve(),
    )

    await expect(
      preloadWorldAssets(['/ok.png', '/broken.png']),
    ).resolves.toBeUndefined()
  })

  it('stops waiting after the timeout so a stalled request cannot hold the boot screen forever', async () => {
    vi.useFakeTimers()
    loadMock.mockImplementation(() => new Promise<void>(() => {}))

    const promise = preloadWorldAssets(['/never.png'])
    await vi.advanceTimersByTimeAsync(30_000)

    await expect(promise).resolves.toBeUndefined()
  })
})
