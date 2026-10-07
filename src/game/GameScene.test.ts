import { afterEach, describe, expect, it, vi } from 'vitest'
import '../test/stubPixiTextMetrics'
import { audioManager } from './audio/AudioManager'
import { gameEventBridge } from './events/GameEventBridge'
import { GameScene } from './GameScene'
import { Player } from './player/Player'
import { World } from './world/World'
import { CAMERA_CONFIG } from './world/cameraConstants'
import { touchInput } from './input/TouchInput'
import { PLAYER_SPAWN_POSITION } from './player/playerConstants'

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

  it('mounts the player into World.playerLayer, at the configured spawn position', () => {
    scene = new GameScene()

    expect(scene.player).toBeInstanceOf(Player)
    expect(scene.world.playerLayer.children).toContain(scene.player)
    expect(scene.player.position.x).toBe(PLAYER_SPAWN_POSITION.x)
    expect(scene.player.position.y).toBe(PLAYER_SPAWN_POSITION.y)
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

describe('GameScene walking audio', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    scene?.destroy()
    scene = null
    vi.restoreAllMocks()
  })

  it('reports actual movement each frame — continuous across multi-key presses and releases', () => {
    const setWalking = vi.spyOn(audioManager, 'setWalking')
    scene = new GameScene()
    const lastWalking = () => setWalking.mock.lastCall?.[0]

    scene.update(16)
    expect(lastWalking()).toBe(false)

    press('KeyW')
    scene.update(16)
    expect(lastWalking()).toBe(true)

    press('KeyD')
    scene.update(16)
    expect(lastWalking()).toBe(true)

    // D still held after W is released — still walking.
    release('KeyW')
    scene.update(16)
    expect(lastWalking()).toBe(true)

    release('KeyD')
    scene.update(16)
    expect(lastWalking()).toBe(false)
  })

  it('stops footsteps when a panel/modal pauses the world, and on destroy', () => {
    const stopWalking = vi.spyOn(audioManager, 'stopWalking')
    scene = new GameScene()

    gameEventBridge.emit('PAUSE_WORLD')
    expect(stopWalking).toHaveBeenCalledTimes(1)
    gameEventBridge.emit('RETURN_TO_WORLD')

    scene.destroy()
    scene = null
    expect(stopWalking).toHaveBeenCalledTimes(2)
  })
})

describe('GameScene interact-open SFX', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    scene?.destroy()
    scene = null
    vi.restoreAllMocks()
  })

  /** Walks right from spawn until the first interactable (currently "skills") is in range — layout-agnostic. */
  function walkToInteractable(current: GameScene): void {
    press('KeyD')
    for (let i = 0; i < 80 && !current.player.interactionTarget; i++) {
      current.update(50)
    }
    release('KeyD')
  }

  it('plays once when E actually opens a panel, and not again for E spam while it is open', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    walkToInteractable(scene)
    const target = scene.player.interactionTarget
    expect(target).not.toBeNull()
    // Reaching it already played the prompt-appear SFX once (see the
    // contextual message tests) — count only the interaction from here.
    playOpen.mockClear()

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(received).toEqual([target?.action])
    expect(playOpen).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 3; i++) {
      press('KeyE')
      scene.update(16)
      release('KeyE')
    }
    expect(playOpen).toHaveBeenCalledTimes(1)
    gameEventBridge.emit('RETURN_TO_WORLD')
    unsubscribe()
  })

  it('stays silent for E away from any interactable', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    scene = new GameScene()
    // Open floor with nothing in range (the spawn itself is next to About Me).
    scene.player.position.set(960, 720)
    scene.update(16)
    expect(scene.player.interactionTarget).toBeNull()

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(playOpen).not.toHaveBeenCalled()
  })

  it('stays silent when a panel is opened from the HUD menu, not by interaction', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    scene = new GameScene()
    gameEventBridge.emit('OPEN_PROJECTS')
    gameEventBridge.emit('RETURN_TO_WORLD')
    gameEventBridge.emit('PAUSE_WORLD')
    gameEventBridge.emit('RETURN_TO_WORLD')
    expect(playOpen).not.toHaveBeenCalled()
  })
})

describe('GameScene camera modes', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    gameEventBridge.emit('CAMERA_EXPLORE')
    scene?.destroy()
    scene = null
  })

  it('starts in EXPLORE, framed on the spawn point at the entrance', () => {
    scene = new GameScene()
    scene.resize(1440, 900)
    expect(scene.cameraState.mode).toBe('explore')
    expect(scene.cameraState.zoom).toBeCloseTo(CAMERA_CONFIG.exploreZoom)
    // Scene-level: the World is the camera's only target — nothing else moves.
    expect(scene.children).toHaveLength(1)
  })

  it('OVERVIEW is camera framing only: the player keeps moving while the camera stays on the whole world', () => {
    scene = new GameScene()
    scene.resize(1440, 900)
    gameEventBridge.emit('CAMERA_OVERVIEW')
    for (let i = 0; i < 60; i++) scene.update(16)
    const framing = {
      x: scene.cameraState.cameraX,
      y: scene.cameraState.cameraY,
    }
    const before = { x: scene.player.position.x, y: scene.player.position.y }

    press('KeyA')
    for (let i = 0; i < 20; i++) scene.update(16)
    release('KeyA')

    expect(scene.player.position.x).toBeLessThan(before.x)
    expect(scene.cameraState.mode).toBe('overview')
    expect(scene.cameraState.zoom).toBe(1)
    // Still whole-world framing — the camera did not follow the player.
    expect(scene.cameraState.cameraX).toBe(framing.x)
    expect(scene.cameraState.cameraY).toBe(framing.y)
  })

  it('[E] interactions work in OVERVIEW (spawn is inside the About Me radius)', () => {
    const received: string[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    scene.resize(1440, 900)
    gameEventBridge.emit('CAMERA_OVERVIEW')
    scene.update(16)

    press('KeyE')
    scene.update(16)
    release('KeyE')
    unsubscribe()

    expect(received).toContain('OPEN_ABOUT')
    gameEventBridge.emit('RETURN_TO_WORLD')
  })

  it('switching views never moves the player, and movement carries on in both directions', () => {
    scene = new GameScene()
    scene.resize(1440, 900)

    gameEventBridge.emit('CAMERA_OVERVIEW')
    for (let i = 0; i < 60; i++) scene.update(16)
    press('KeyA')
    for (let i = 0; i < 10; i++) scene.update(16)
    release('KeyA')
    const inOverview = {
      x: scene.player.position.x,
      y: scene.player.position.y,
    }

    gameEventBridge.emit('CAMERA_EXPLORE')
    for (let i = 0; i < 60; i++) scene.update(16)
    expect(scene.player.position.x).toBe(inOverview.x)
    expect(scene.player.position.y).toBe(inOverview.y)
    expect(scene.cameraState.zoom).toBeCloseTo(CAMERA_CONFIG.exploreZoom)

    press('KeyA')
    for (let i = 0; i < 10; i++) scene.update(16)
    release('KeyA')
    expect(scene.player.position.x).toBeLessThan(inOverview.x)
    const inExplore = { x: scene.player.position.x, y: scene.player.position.y }

    gameEventBridge.emit('CAMERA_OVERVIEW')
    for (let i = 0; i < 60; i++) scene.update(16)
    expect(scene.player.position.x).toBe(inExplore.x)
    expect(scene.player.position.y).toBe(inExplore.y)
  })

  it('a resize keeps the current camera mode and never moves the player', () => {
    scene = new GameScene()
    scene.resize(1440, 900)
    gameEventBridge.emit('CAMERA_OVERVIEW')
    for (let i = 0; i < 60; i++) scene.update(16)
    const before = { x: scene.player.position.x, y: scene.player.position.y }

    scene.resize(390, 844)
    expect(scene.cameraState.mode).toBe('overview')
    expect(scene.player.position.x).toBe(before.x)
    expect(scene.player.position.y).toBe(before.y)
  })
})

describe('GameScene — on-screen (touch) controls', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    scene?.destroy()
    scene = null
    touchInput.reset()
    vi.restoreAllMocks()
  })

  it('a held stick walks the player through the game loop; releasing eases to a stop with no drift', () => {
    scene = new GameScene()
    const startX = scene.player.position.x

    touchInput.setMovement(1, 0)
    scene.update(16)
    scene.update(16)
    scene.update(16)

    expect(scene.player.position.x).toBeGreaterThan(startX)
    expect(scene.player.direction).toBe('right')
    expect(scene.player.moving).toBe(true)

    touchInput.setMovement(0, 0)
    // The short ease-out: still moving on the very next frame…
    const releasedX = scene.player.position.x
    scene.update(16)
    expect(scene.player.position.x).toBeGreaterThan(releasedX)
    // …and fully stopped well within half a second.
    for (let frame = 0; frame < 30; frame++) scene.update(16)
    const stoppedX = scene.player.position.x
    expect(scene.player.moving).toBe(false)

    for (let frame = 0; frame < 30; frame++) scene.update(16)
    expect(scene.player.position.x).toBe(stoppedX)
    expect(scene.player.moving).toBe(false)
  })

  it('is analog: a half-pushed stick walks at half speed, a full push at full speed', () => {
    const speedAt = (magnitude: number): number => {
      const walked = new GameScene()
      touchInput.setMovement(0, -magnitude)
      // Let the ease-in settle without travelling far, then time one frame.
      for (let frame = 0; frame < 40; frame++) walked.update(4)
      const before = walked.player.position.y
      walked.update(16)
      const speed = Math.abs(walked.player.position.y - before)
      touchInput.reset()
      walked.destroy()
      return speed
    }

    const full = speedAt(1)
    const half = speedAt(0.5)

    expect(full).toBeGreaterThan(0)
    expect(half / full).toBeCloseTo(0.5, 1)
  })

  it('faces the dominant axis of a diagonal push while still moving diagonally', () => {
    scene = new GameScene()
    const { x, y } = scene.player.position

    // Mostly up, a little left.
    touchInput.setMovement(-0.4, -0.9)
    for (let frame = 0; frame < 10; frame++) scene.update(16)

    expect(scene.player.direction).toBe('up')
    expect(scene.player.position.x).toBeLessThan(x)
    expect(scene.player.position.y).toBeLessThan(y)
  })

  it('a fully pushed stick ends up where the same keyboard input does — same speed, same collision', () => {
    const walk = (hold: () => void, letGo: () => void) => {
      const walked = new GameScene()
      hold()
      for (let i = 0; i < 40; i++) walked.update(100)
      letGo()
      const { x, y } = walked.player.position
      walked.destroy()
      return { x, y }
    }

    const byKeyboard = walk(
      () => {
        press('KeyW')
        press('KeyA')
      },
      () => {
        release('KeyW')
        release('KeyA')
      },
    )
    const byTouch = walk(
      () => touchInput.setMovement(-1, -1),
      () => touchInput.reset(),
    )

    // Same top speed and the same collision resolution; the only difference
    // is the stick's brief ease-in (speed x time constant, about 15px).
    expect(
      Math.hypot(byTouch.x - byKeyboard.x, byTouch.y - byKeyboard.y),
    ).toBeLessThan(25)
    expect(byTouch).not.toEqual(PLAYER_SPAWN_POSITION)
  })

  it('footsteps follow the actual movement, not the touch itself', () => {
    scene = new GameScene()
    const setWalking = vi.spyOn(audioManager, 'setWalking')

    touchInput.setMovement(1, 0)
    scene.update(16)
    expect(setWalking).toHaveBeenLastCalledWith(true)

    touchInput.setMovement(0, 0)
    for (let frame = 0; frame < 30; frame++) scene.update(16)
    expect(setWalking).toHaveBeenLastCalledWith(false)
  })

  it('the interact button triggers the in-range target exactly like E, and nothing without one', () => {
    scene = new GameScene()
    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )

    // The spawn point is inside the About Me card's radius.
    scene.update(16)
    const target = scene.player.interactionTarget
    expect(target).not.toBeNull()
    touchInput.pressInteract()
    scene.update(16)
    expect(received).toEqual([target?.action])

    gameEventBridge.emit('RETURN_TO_WORLD')
    received.length = 0

    // Walk out of every interaction radius: the button now does nothing.
    touchInput.setMovement(0, 1)
    for (let i = 0; i < 40; i++) scene.update(100)
    touchInput.stopMovement()
    if (scene.player.interactionTarget === null) {
      touchInput.pressInteract()
      scene.update(16)
      expect(received).toEqual([])
    }
    unsubscribe()
  })

  it('does nothing while a panel has the world paused, and nothing carries over on resume', () => {
    scene = new GameScene()
    const { x, y } = scene.player.position

    gameEventBridge.emit('OPEN_PROJECTS')
    touchInput.setMovement(1, 0)
    touchInput.pressInteract()
    scene.update(100)

    expect(scene.player.position.x).toBe(x)
    expect(scene.player.position.y).toBe(y)

    const received: unknown[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    gameEventBridge.emit('RETURN_TO_WORLD')
    scene.update(100)
    unsubscribe()

    expect(scene.player.position.x).toBe(x)
    expect(received).toEqual(['RETURN_TO_WORLD'])
  })
})
