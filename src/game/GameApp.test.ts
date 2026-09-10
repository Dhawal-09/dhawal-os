import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameApp } from './GameApp'

const { initMock, destroyMock, resizeMock, addChildMock, tickerAddMock } =
  vi.hoisted(() => ({
    initMock: vi.fn(async () => {}),
    destroyMock: vi.fn(),
    resizeMock: vi.fn(),
    addChildMock: vi.fn(),
    tickerAddMock: vi.fn(),
  }))

interface Destroyable {
  destroy(options?: unknown): void
}

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
