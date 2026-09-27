import { afterEach, describe, expect, it, vi } from 'vitest'
import '../test/stubPixiTextMetrics'
import { audioManager } from './audio/AudioManager'
import { gameEventBridge, type GameEvent } from './events/GameEventBridge'
import {
  FLAVOR_COOLDOWN_MS,
  FLAVOR_HOLD_MS,
  GameScene,
  RESPONSE_HOLD_MS,
} from './GameScene'
import { worldObjects } from './world/worldObjects'

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }))
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }))
}

function messageOf(id: string): string | undefined {
  return worldObjects.find((object) => object.id === id)?.message?.text
}

/** Texts currently shown by the prompt (hint and body), in order. */
function shownTexts(scene: GameScene): string[] {
  return scene.contextualMessage.children
    .filter((child) => 'text' in child && child.visible)
    .map((child) => (child as unknown as { text: string }).text)
}

/** Walks right from spawn until the first interactable (currently "skills") is in range. */
function walkToInteractable(scene: GameScene): void {
  press('KeyD')
  for (let i = 0; i < 80 && !scene.player.interactionTarget; i++) {
    scene.update(50)
  }
  release('KeyD')
}

/** Places the player at a point (tests only) and runs one idle frame. */
function standAt(scene: GameScene, x: number, y: number): void {
  scene.player.position.set(x, y)
  scene.update(16)
}

/** Runs idle frames for (at least) `ms` of scene time. */
function idle(scene: GameScene, ms: number): void {
  for (let t = 0; t <= ms; t += 50) scene.update(50)
}

/** Kitchen spots (kitchen.ts `interactionPoint`s). */
const PANS = [1565, 330] as const
const COFFEE = [1725, 330] as const
const DOORWAY_PLANT = [1350, 700] as const

describe('GameScene contextual messages', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    scene?.destroy()
    scene = null
    vi.restoreAllMocks()
  })

  it('shows nothing with no target nearby', () => {
    scene = new GameScene()
    scene.update(16)
    expect(scene.contextualMessage.current).toBeNull()
  })

  it('interactive: the prompt and [E] refer to the same target', () => {
    const received: GameEvent[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    walkToInteractable(scene)
    const target = scene.player.interactionTarget!

    expect(scene.contextualMessage.current?.type).toBe('interactive')
    expect(scene.contextualMessage.current?.text).toBe(messageOf(target.id))
    expect(shownTexts(scene)).toEqual(['[E]', messageOf(target.id)])

    press('KeyE')
    scene.update(16)
    release('KeyE')
    const object = worldObjects.find((o) => o.id === target.id)!
    expect(received).toEqual([object.interaction!.action])

    gameEventBridge.emit('RETURN_TO_WORLD')
    unsubscribe()
  })

  it('the appear SFX plays once on entering range, not per frame, and again only after leaving and returning', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    scene = new GameScene()
    walkToInteractable(scene)
    expect(playOpen).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 30; i++) scene.update(16)
    expect(playOpen).toHaveBeenCalledTimes(1)

    const inRange = { x: scene.player.position.x, y: scene.player.position.y }
    standAt(scene, 960, 720) // spawn: nothing in range
    expect(scene.contextualMessage.current).toBeNull()

    standAt(scene, inRange.x, inRange.y)
    expect(scene.contextualMessage.current?.type).toBe('interactive')
    expect(playOpen).toHaveBeenCalledTimes(2)
  })

  it('a panel opening hides the prompt; closing restores it for the same target without replaying the SFX', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    scene = new GameScene()
    walkToInteractable(scene)
    const text = scene.contextualMessage.current?.text

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(scene.contextualMessage.current).toBeNull()
    const callsAfterOpen = playOpen.mock.calls.length

    gameEventBridge.emit('RETURN_TO_WORLD')
    scene.update(16)
    expect(scene.contextualMessage.current?.text).toBe(text)
    expect(scene.player.interactionTarget).not.toBeNull()
    expect(playOpen).toHaveBeenCalledTimes(callsAfterOpen)
  })

  it('a panel opened from the HUD menu (or the exit dialog) also hides the prompt', () => {
    scene = new GameScene()
    walkToInteractable(scene)
    gameEventBridge.emit('OPEN_PROJECTS')
    expect(scene.contextualMessage.current).toBeNull()
    gameEventBridge.emit('RETURN_TO_WORLD')

    scene.update(16)
    expect(scene.contextualMessage.current).not.toBeNull()
    gameEventBridge.emit('PAUSE_WORLD')
    expect(scene.contextualMessage.current).toBeNull()
    gameEventBridge.emit('RETURN_TO_WORLD')
  })

  it('flavor: hanging pans show text only, no [E], no SFX, and E does nothing', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    const received: GameEvent[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    standAt(scene, ...PANS)

    expect(scene.player.interactionTarget).toBeNull()
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'flavor',
      text: 'Someone actually uses these?',
    })
    expect(shownTexts(scene)).toEqual(['Someone actually uses these?'])
    expect(playOpen).not.toHaveBeenCalled()

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(received).toEqual([])
    unsubscribe()
  })

  it('flavor: fades on its own, stays gone while standing still, and returns only on re-entry after the cooldown', () => {
    scene = new GameScene()
    standAt(scene, ...PANS)
    expect(scene.promptDebugState).toMatchObject({
      id: 'kitchen-hanging-pans',
      mode: 'flavor',
      state: 'flavor',
    })

    idle(scene, FLAVOR_HOLD_MS)
    expect(scene.contextualMessage.current).toBeNull()
    expect(scene.promptDebugState.state).toBe('flavor-done')

    // Standing still well past the cooldown: no restart.
    idle(scene, FLAVOR_COOLDOWN_MS * 2)
    expect(scene.contextualMessage.current).toBeNull()

    // Its cooldown started when it faded, long ago — re-entering shows it.
    standAt(scene, 960, 720)
    standAt(scene, ...PANS)
    expect(scene.contextualMessage.current?.text).toBe(
      'Someone actually uses these?',
    )

    // Walking off mid-message and straight back is within the cooldown.
    standAt(scene, 960, 720)
    standAt(scene, ...PANS)
    expect(scene.contextualMessage.current).toBeNull()
    standAt(scene, 960, 720)
    idle(scene, FLAVOR_COOLDOWN_MS)
    standAt(scene, ...PANS)
    expect(scene.contextualMessage.current?.type).toBe('flavor')
  })

  it('flavor: variants cycle in order, one per visit — never per frame', () => {
    scene = new GameScene()
    const seen: string[] = []
    for (let visit = 0; visit < 4; visit++) {
      standAt(scene, ...DOORWAY_PLANT)
      const text = scene.contextualMessage.current?.text
      for (let i = 0; i < 20; i++) {
        scene.update(16)
        if (scene.contextualMessage.current) {
          expect(scene.contextualMessage.current.text).toBe(text)
        }
      }
      seen.push(text!)
      standAt(scene, 960, 720)
      idle(scene, FLAVOR_COOLDOWN_MS)
    }
    expect(seen).toEqual([
      'Plant status: operational.',
      'Still alive. Impressive.',
      'Photosynthesis detected.',
      'Plant status: operational.',
    ])
  })

  it('[E] response: the coffee machine answers in the prompt, plays the open SFX, pauses nothing, then the prompt returns', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    const received: GameEvent[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    standAt(scene, ...COFFEE)
    expect(scene.player.interactionTarget?.id).toBe('kitchen-coffee-machine')
    expect(shownTexts(scene)).toEqual(['[E]', 'Brew developer fuel?'])
    expect(playOpen).toHaveBeenCalledTimes(1)

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(received).toEqual(['WORLD_RESPONSE'])
    expect(playOpen).toHaveBeenCalledTimes(2)
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'info',
      text: 'COFFEE DEPLOYED.\n+10 DEBUGGING ENERGY.',
    })
    expect(scene.promptDebugState.state).toBe('response')

    // The world keeps running: moving still works during the response.
    const before = scene.player.position.x
    press('KeyA')
    scene.update(16)
    release('KeyA')
    expect(scene.player.position.x).toBeLessThan(before)
    standAt(scene, ...COFFEE)

    idle(scene, RESPONSE_HOLD_MS)
    expect(shownTexts(scene)).toEqual(['[E]', 'Brew developer fuel?'])
    expect(playOpen).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('priority: an interactable in range owns the prompt over a nearby flavor spot', () => {
    scene = new GameScene()
    // Inside both the counter's flavor radius and the dining table's [E] radius.
    standAt(scene, 1678, 440)
    expect(scene.player.interactionTarget?.id).toBe('kitchen-dining-table')
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'interactive',
      text: 'Take a break?',
    })
  })

  it('every kitchen interactable answers [E] with its own response', () => {
    const kitchenResponses = worldObjects.filter(
      (object) =>
        object.id.startsWith('kitchen-') &&
        object.interaction?.action === 'WORLD_RESPONSE',
    )
    expect(kitchenResponses.map((object) => object.id).sort()).toEqual([
      'kitchen-coffee-machine',
      'kitchen-cooktop',
      'kitchen-dining-table',
      'kitchen-fridge',
      'kitchen-side-counter',
    ])
    for (const object of kitchenResponses) {
      scene?.destroy()
      scene = new GameScene()
      const point = object.interactionPoint ?? object.position
      standAt(scene, point.x, point.y)
      expect(scene.player.interactionTarget?.id, object.id).toBe(object.id)
      press('KeyE')
      scene.update(16)
      release('KeyE')
      const interaction = object.interaction!
      expect(scene.contextualMessage.current?.text, object.id).toBe(
        interaction.action === 'WORLD_RESPONSE'
          ? interaction.response.join('\n')
          : undefined,
      )
    }
  })

  it('moving between targets swaps the message (info -> interactive)', () => {
    scene = new GameScene()
    standAt(scene, 440, 600) // in front of the living-room TV
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'info',
      text: messageOf('living-tv'),
    })

    standAt(scene, 380, 700) // on the rug, by the Experience marker
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'interactive',
      text: messageOf('experience'),
    })
  })

  it('W+D diagonal movement keeps the prompt consistent with the interaction target every frame', () => {
    scene = new GameScene()
    walkToInteractable(scene)
    press('KeyW')
    press('KeyD')
    for (let i = 0; i < 40; i++) {
      if (i === 20) release('KeyW')
      scene.update(16)
      const target = scene.player.interactionTarget
      const current = scene.contextualMessage.current
      if (target) {
        expect(current?.type).toBe('interactive')
        expect(current?.text).toBe(target.message?.text)
      } else if (current) {
        expect(current.type).not.toBe('interactive')
      }
    }
    release('KeyD')
  })

  it('destroying the scene mid-animation is safe', () => {
    scene = new GameScene()
    walkToInteractable(scene)
    expect(() => {
      scene?.destroy()
      scene = null
    }).not.toThrow()
  })
})
