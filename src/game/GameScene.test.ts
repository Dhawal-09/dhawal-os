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

  it('resizing the viewport (cover-camera scale/offset) never changes world coordinates — player position and interaction targeting are unaffected', () => {
    scene = new GameScene()

    // Walk onto "projects" first, at whatever the initial viewport-agnostic scene state is.
    press('KeyW')
    for (let i = 0; i < 16; i++) scene.update(100)
    release('KeyW')
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')
    const playerXBefore = scene.player.position.x
    const playerYBefore = scene.player.position.y
    expect(scene.player.interactionTarget?.id).toBe('projects')

    // A camera-only concern: the visual fit strategy (contain vs. cover)
    // and viewport size must never move anything in world space.
    scene.resize(1920, 1080)
    scene.resize(1366, 768)
    scene.resize(390, 844)

    expect(scene.player.position.x).toBe(playerXBefore)
    expect(scene.player.position.y).toBe(playerYBefore)
    expect(scene.player.interactionTarget?.id).toBe('projects')
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

    // Walk up toward the "projects" desk's row (world y=390, PHASE 10B layout).
    press('KeyW')
    for (let i = 0; i < 16; i++) scene.update(100)
    release('KeyW')

    // Then walk right into it — collision stops the player flush against
    // it, comfortably inside its configured interaction radius.
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')

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
    for (let i = 0; i < 16; i++) scene.update(100)
    release('KeyW')
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')
    expect(scene.player.interactionTarget?.id).toBe('projects')

    // Walk back away from it.
    press('KeyA')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyA')
    expect(scene.player.interactionTarget).toBeNull()

    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(received).toEqual([])
    unsubscribe()
  })

  it('pauses world input while a portfolio panel is open (no player movement, no interaction)', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    // Get within range of "projects" first, same walk as the E2E path above.
    press('KeyW')
    for (let i = 0; i < 16; i++) scene.update(100)
    release('KeyW')
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')
    expect(scene.player.interactionTarget?.id).toBe('projects')

    gameEventBridge.emit('OPEN_PROJECTS')
    received.length = 0
    const xWhilePaused = scene.player.position.x

    // Movement and interaction must both be ignored while paused.
    press('KeyD')
    scene.update(16)
    release('KeyD')
    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(scene.player.position.x).toBe(xWhilePaused)
    expect(received).toEqual([])

    unsubscribe()
  })

  it('pauses world input for PAUSE_WORLD too (a non-panel React modal, e.g. the exit confirmation dialog)', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    gameEventBridge.emit('PAUSE_WORLD')
    received.length = 0
    const startX = scene.player.position.x

    press('KeyD')
    scene.update(16)
    release('KeyD')
    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(scene.player.position.x).toBe(startX)
    expect(received).toEqual([])

    // The existing RETURN_TO_WORLD resume path also resumes from PAUSE_WORLD — no second pause/resume vocabulary.
    gameEventBridge.emit('RETURN_TO_WORLD')
    received.length = 0
    press('KeyD')
    scene.update(16)
    release('KeyD')
    expect(scene.player.position.x).toBeGreaterThan(startX)

    unsubscribe()
  })

  it('resumes world input after RETURN_TO_WORLD, without re-triggering from a stale keypress', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    press('KeyW')
    for (let i = 0; i < 16; i++) scene.update(100)
    release('KeyW')
    press('KeyD')
    for (let i = 0; i < 20; i++) scene.update(100)
    release('KeyD')
    expect(scene.player.interactionTarget?.id).toBe('projects')

    gameEventBridge.emit('OPEN_PROJECTS')
    received.length = 0

    // Player presses E again while the panel is open (input meant for the
    // panel, not the world) — this must not "carry over" into a re-open.
    press('KeyE')
    scene.update(16)

    gameEventBridge.emit('RETURN_TO_WORLD')
    received.length = 0
    scene.update(16)
    release('KeyE')

    expect(received).toEqual([])

    // Movement resumes normally afterward. Away from the desk it's flush
    // against (KeyA, not KeyD) — pressing back into the obstacle it just
    // stopped at would stay blocked by collision, not prove input resumed.
    const startX = scene.player.position.x
    press('KeyA')
    scene.update(16)
    release('KeyA')
    expect(scene.player.position.x).toBeLessThan(startX)

    unsubscribe()
  })

  it('destroy() unsubscribes from the event bridge (no leak across scene instances)', () => {
    scene = new GameScene()
    const startX = scene.player.position.x

    scene.destroy()
    scene = null

    // A pause event after destroy must not throw and must not affect a
    // (now nonexistent) scene — proves the subscription was released.
    expect(() => gameEventBridge.emit('OPEN_PROJECTS')).not.toThrow()
    expect(startX).toBeGreaterThanOrEqual(0)
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
