import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameEventBridge } from './events/GameEventBridge'
import { GameScene } from './GameScene'
import { Player } from './player/Player'
import { World } from './world/World'
import { WORLD_HEIGHT, WORLD_WIDTH } from './world/worldConstants'

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }))
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }))
}

describe('GameScene', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    // GameScene owns a real InputManager (real window listeners) — every
    // scene created in a test must be torn down or listeners leak across
    // the whole test run.
    scene?.destroy()
    scene = null
  })

  it('is labeled and mounts exactly the World', () => {
    scene = new GameScene()

    expect(scene.label).toBe('GameScene')
    expect(scene.world).toBeInstanceOf(World)
    expect(scene.children).toHaveLength(1)
    expect(scene.children[0]).toBe(scene.world)
  })

  it('mounts the player into World.playerLayer, at the world center', () => {
    scene = new GameScene()

    expect(scene.player).toBeInstanceOf(Player)
    expect(scene.world.playerLayer.children).toContain(scene.player)
    expect(scene.player.position.x).toBe(WORLD_WIDTH / 2)
    expect(scene.player.position.y).toBe(WORLD_HEIGHT / 2)
  })

  it('resize does not throw and is safe to call before/after any viewport size', () => {
    scene = new GameScene()

    expect(() => {
      scene?.resize(1280, 720)
      scene?.resize(0, 0)
      scene?.resize(390, 844)
    }).not.toThrow()
  })

  it('update() drives the player from real keyboard input, through the game loop', () => {
    scene = new GameScene()
    const startX = scene.player.position.x

    press('KeyD')
    scene.update(16)
    scene.update(16)
    scene.update(16)
    release('KeyD')

    expect(scene.player.position.x).toBeGreaterThan(startX)
    expect(scene.player.direction).toBe('right')
  })

  it('end to end: approaching "projects" and pressing E emits OPEN_PROJECTS on the real event bridge', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    // Walk up toward the "projects" placeholder's row (world y=300).
    press('KeyW')
    for (let i = 0; i < 10; i++) scene.update(100)
    release('KeyW')

    // Then walk left into it — collision stops the player flush against
    // it, comfortably inside its configured interaction radius.
    press('KeyA')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyA')

    expect(scene.player.interactionTarget?.id).toBe('projects')

    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(received).toEqual(['OPEN_PROJECTS'])
    unsubscribe()
  })

  it('walking away from "projects" clears the interaction target and no longer reacts to E', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    press('KeyW')
    for (let i = 0; i < 10; i++) scene.update(100)
    release('KeyW')
    press('KeyA')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyA')
    expect(scene.player.interactionTarget?.id).toBe('projects')

    // Walk back away from it.
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')
    expect(scene.player.interactionTarget).toBeNull()

    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(received).toEqual([])
    unsubscribe()
  })

  it('destroy() removes its keyboard listeners (no leak across scene instances)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    scene = new GameScene()
    const addedCount = addSpy.mock.calls.length

    scene.destroy()
    scene = null

    const keyboardRemovals = removeSpy.mock.calls.filter(([type]) =>
      ['keydown', 'keyup', 'blur'].includes(type as string),
    )
    expect(keyboardRemovals.length).toBeGreaterThan(0)
    expect(addedCount).toBeGreaterThan(0)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
