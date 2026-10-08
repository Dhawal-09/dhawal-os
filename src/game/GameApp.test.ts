import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/stubPixiTextMetrics'
import { GameApp } from './GameApp'
import { CameraMode } from './world/cameraConstants'

const {
  initMock,
  renderMock,
  destroyMock,
  resizeMock,
  addChildMock,
  tickerAddMock,
} = vi.hoisted(() => ({
  initMock: vi.fn(async () => {}),
  renderMock: vi.fn(),
  destroyMock: vi.fn(),
  resizeMock: vi.fn(),
  addChildMock: vi.fn(),
  tickerAddMock: vi.fn(),
}))

interface Destroyable {
  destroy(options?: unknown): void
}

const { startMock, whenReadyMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  whenReadyMock: vi.fn(async () => {}),
}))

// The real preloader fetches ~90 PNGs through Pixi's Assets loader, which has
// no meaning in jsdom — it has its own unit test (preloadWorldAssets.test.ts).
vi.mock('./world/preloadWorldAssets', () => ({
  gamePreloader: { start: startMock, whenReady: whenReadyMock },
}))

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>()

  class MockApplication {
    private stageChild: Destroyable | null = null

    stage = {
      addChild: (child: Destroyable) => {
        this.stageChild = child
        addChildMock(child)
      },
    }
    ticker = { add: tickerAddMock }
    renderer = { resize: resizeMock }
    canvas = document.createElement('canvas')
    init = initMock
    render = renderMock

    // Mirrors real Pixi's Application.destroy -> stage.destroy(options)
    // cascade, so GameScene's own destroy() override (which tears down its
    // real InputManager's window listeners) actually runs in these tests.
    destroy = (rendererOptions?: unknown, options?: unknown): void => {
      destroyMock(rendererOptions, options)
      this.stageChild?.destroy(options)
    }
  }

  return { ...actual, Application: MockApplication }
})

beforeEach(() => {
  initMock.mockClear()
  destroyMock.mockClear()
  resizeMock.mockClear()
  addChildMock.mockClear()
  tickerAddMock.mockClear()
})

describe('GameApp', () => {
  it('initializes the renderer, mounts a GameScene, and wires the ticker', async () => {
    const gameApp = await GameApp.create({ width: 800, height: 600 })

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(addChildMock).toHaveBeenCalledTimes(1)
    expect(tickerAddMock).toHaveBeenCalledTimes(1)
    expect(gameApp.canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(gameApp.scene.label).toBe('GameScene')

    gameApp.destroy()
  })

  it('ensures the asset preload is running and reports the renderer as soon as it is up', async () => {
    const onRendererReady = vi.fn()

    const gameApp = await GameApp.create({
      width: 800,
      height: 600,
      onRendererReady,
    })

    expect(startMock).toHaveBeenCalled()
    expect(onRendererReady).toHaveBeenCalledTimes(1)

    gameApp.destroy()
  })

  it('rejects — tearing the renderer down, never mounting a scene — when a core asset fails', async () => {
    whenReadyMock.mockRejectedValueOnce(new Error('core asset missing'))

    await expect(GameApp.create({ width: 800, height: 600 })).rejects.toThrow(
      'core asset missing',
    )

    expect(addChildMock).not.toHaveBeenCalled()
    expect(destroyMock).toHaveBeenCalledTimes(1)
  })

  it('renders once before reporting ready, so textures are uploaded behind the initialization screen', async () => {
    renderMock.mockClear()

    const gameApp = await GameApp.create({ width: 800, height: 600 })

    expect(renderMock).toHaveBeenCalledTimes(1)

    gameApp.destroy()
  })

  it('opens directly in OVERVIEW when asked — the camera is framed there from its first frame, with no transition left to run', async () => {
    const overview = await GameApp.create({
      width: 800,
      height: 600,
      initialCameraMode: CameraMode.OVERVIEW,
    })
    expect(overview.scene.cameraState.mode).toBe(CameraMode.OVERVIEW)
    const framed = { ...overview.scene.cameraState }
    overview.scene.update(16)
    overview.scene.update(2000)
    expect(overview.scene.cameraState).toMatchObject({
      zoom: framed.zoom,
      cameraX: framed.cameraX,
      cameraY: framed.cameraY,
    })
    overview.destroy()

    const explore = await GameApp.create({ width: 800, height: 600 })
    expect(explore.scene.cameraState.mode).toBe(CameraMode.EXPLORE)
    explore.destroy()
  })

  it('an attempt aborted straight away never initializes a renderer or builds a scene', async () => {
    initMock.mockClear()
    const controller = new AbortController()
    const creation = GameApp.create({
      width: 800,
      height: 600,
      signal: controller.signal,
    })
    controller.abort()

    await expect(creation).rejects.toBeDefined()

    expect(initMock).not.toHaveBeenCalled()
    expect(addChildMock).not.toHaveBeenCalled()
    expect(destroyMock).not.toHaveBeenCalled()
  })

  it('resizes the renderer to the given dimensions', async () => {
    const gameApp = await GameApp.create({ width: 800, height: 600 })

    gameApp.resize(1024, 768)

    expect(resizeMock).toHaveBeenCalledWith(1024, 768)

    gameApp.destroy()
  })

  it('ignores non-positive resize dimensions', async () => {
    const gameApp = await GameApp.create({ width: 800, height: 600 })
    resizeMock.mockClear()

    gameApp.resize(0, 100)
    gameApp.resize(100, -1)

    expect(resizeMock).not.toHaveBeenCalled()

    gameApp.destroy()
  })

  it('destroy is idempotent and does not throw', async () => {
    const gameApp = await GameApp.create({ width: 800, height: 600 })

    expect(() => {
      gameApp.destroy()
      gameApp.destroy()
    }).not.toThrow()

    expect(destroyMock).toHaveBeenCalledTimes(1)
  })

  it('ignores resize calls after destroy', async () => {
    const gameApp = await GameApp.create({ width: 800, height: 600 })
    gameApp.destroy()
    resizeMock.mockClear()

    gameApp.resize(500, 500)

    expect(resizeMock).not.toHaveBeenCalled()
  })
})
