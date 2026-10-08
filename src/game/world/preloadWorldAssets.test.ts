import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GamePreloader } from './preloadWorldAssets'

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }))

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>()
  return { ...actual, Assets: { load: loadMock } }
})

/** Per-url manual control over when (and how) each `Assets.load` settles. */
const pending = new Map<
  string,
  { resolve: () => void; reject: (error: Error) => void }
>()

function createPreloader(): GamePreloader {
  return new GamePreloader({
    character: ['/hero.png'],
    environment: ['/floor.png'],
    optional: ['/floor.png', '/sofa.png', '/plant.png'],
  })
}

/** Lets the `.then` handlers attached to a just-settled load run. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  loadMock.mockImplementation(
    (url: string) =>
      new Promise<void>((resolve, reject) => {
        pending.set(url, { resolve, reject })
      }),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  loadMock.mockReset()
  pending.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('GamePreloader', () => {
  it('does nothing until started, then requests every distinct url exactly once — core first', () => {
    const preloader = createPreloader()
    expect(loadMock).not.toHaveBeenCalled()
    expect(preloader.getState()).toMatchObject({ started: false, total: 4 })

    preloader.start()
    preloader.start()

    expect(loadMock.mock.calls.map(([url]) => url)).toEqual([
      '/hero.png',
      '/floor.png',
      '/sofa.png',
      '/plant.png',
    ])
    expect(preloader.getState()).toMatchObject({ started: true, settled: 0 })
  })

  it('reports real progress and core readiness as assets land, notifying subscribers', async () => {
    const preloader = createPreloader()
    const listener = vi.fn()
    preloader.subscribe(listener)
    preloader.start()

    pending.get('/hero.png')!.resolve()
    await flush()
    expect(preloader.getState()).toMatchObject({
      settled: 1,
      characterReady: true,
      coreReady: false,
      complete: false,
    })

    pending.get('/floor.png')!.resolve()
    await flush()
    expect(preloader.getState()).toMatchObject({
      settled: 2,
      coreReady: true,
      complete: false,
    })

    pending.get('/sofa.png')!.resolve()
    pending.get('/plant.png')!.resolve()
    await flush()
    expect(preloader.getState()).toMatchObject({
      settled: 4,
      failed: 0,
      complete: true,
    })
    expect(listener).toHaveBeenCalled()
  })

  it('whenReady resolves only once the core is loaded and everything else has settled', async () => {
    const preloader = createPreloader()
    preloader.start()
    let done = false
    const ready = preloader.whenReady().then(() => (done = true))

    pending.get('/hero.png')!.resolve()
    pending.get('/floor.png')!.resolve()
    pending.get('/sofa.png')!.resolve()
    await flush()
    expect(done).toBe(false)

    pending.get('/plant.png')!.resolve()
    await ready
    expect(done).toBe(true)
  })

  it('whenReady resolves immediately when everything is already loaded', async () => {
    const preloader = createPreloader()
    preloader.start()
    for (const load of pending.values()) load.resolve()
    await flush()

    await expect(preloader.whenReady()).resolves.toBeUndefined()
  })

  it('an optional asset failing is logged and counted, but never blocks or rejects', async () => {
    const preloader = createPreloader()
    preloader.start()
    const ready = preloader.whenReady()

    pending.get('/sofa.png')!.reject(new Error('404'))
    pending.get('/hero.png')!.resolve()
    pending.get('/floor.png')!.resolve()
    pending.get('/plant.png')!.resolve()

    await expect(ready).resolves.toBeUndefined()
    expect(preloader.getState()).toMatchObject({
      failed: 1,
      coreReady: true,
      complete: true,
      coreError: null,
    })
    expect(console.warn).toHaveBeenCalled()
  })

  it('a core asset failing rejects whenReady instead of letting a broken game open', async () => {
    const preloader = createPreloader()
    preloader.start()
    const ready = preloader.whenReady()

    pending.get('/hero.png')!.reject(new Error('404'))

    await expect(ready).rejects.toThrow('404')
    expect(preloader.getState().coreError).toBeInstanceOf(Error)
    expect(console.error).toHaveBeenCalled()
  })

  it('start() after a failure retries only the failed assets', async () => {
    const preloader = createPreloader()
    preloader.start()
    pending.get('/hero.png')!.reject(new Error('404'))
    pending.get('/floor.png')!.resolve()
    await flush()
    loadMock.mockClear()

    preloader.start()

    expect(loadMock.mock.calls.map(([url]) => url)).toEqual(['/hero.png'])
    expect(preloader.getState().coreError).toBeNull()
  })

  it('past the timeout, whenReady resolves if the core made it — the rest keeps loading behind the game', async () => {
    vi.useFakeTimers()
    const preloader = createPreloader()
    preloader.start()
    const ready = preloader.whenReady(30_000)

    pending.get('/hero.png')!.resolve()
    pending.get('/floor.png')!.resolve()
    await vi.advanceTimersByTimeAsync(30_000)

    await expect(ready).resolves.toBeUndefined()
    expect(preloader.getState().complete).toBe(false)
  })

  it('past the timeout, whenReady rejects if the core is still missing', async () => {
    vi.useFakeTimers()
    const preloader = createPreloader()
    preloader.start()
    const ready = preloader.whenReady(30_000)
    const assertion = expect(ready).rejects.toThrow(/timed out/i)

    await vi.advanceTimersByTimeAsync(30_000)

    await assertion
  })
})
