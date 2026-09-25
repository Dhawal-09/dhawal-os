import { afterEach, describe, expect, it, vi } from 'vitest'
import '../test/stubPixiTextMetrics'
import { audioManager } from './audio/AudioManager'
import { gameEventBridge, type GameEvent } from './events/GameEventBridge'
import { GameScene } from './GameScene'
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

  it('flavor: coffee machine shows text only, no [E], no SFX, and E does nothing', () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    const received: GameEvent[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    standAt(scene, 1725, 330)

    expect(scene.player.interactionTarget).toBeNull()
    expect(scene.contextualMessage.current).toMatchObject({
      type: 'flavor',
      text: 'Coffee first. Code later.',
    })
    expect(shownTexts(scene)).toEqual(['Coffee first. Code later.'])
    expect(playOpen).not.toHaveBeenCalled()

    press('KeyE')
    scene.update(16)
    release('KeyE')
    expect(received).toEqual([])
    unsubscribe()
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
