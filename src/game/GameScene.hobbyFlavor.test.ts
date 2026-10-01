import { afterEach, describe, expect, it, vi } from 'vitest'
import '../test/stubPixiTextMetrics'
import { audioManager } from './audio/AudioManager'
import { gameEventBridge, type GameEvent } from './events/GameEventBridge'
import { GameScene } from './GameScene'
import { hobbyAmbientCandidates, hobbyFlavorObjects } from './world/hobbyFlavor'
import { worldObjects } from './world/worldObjects'

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }))
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }))
}

/** Texts currently shown by the prompt (hint, message, secondary line), in order. */
function shownTexts(scene: GameScene): string[] {
  return scene.contextualMessage.children
    .filter((child) => 'text' in child && child.visible)
    .map((child) => (child as unknown as { text: string }).text)
}

/** Places the player at a point (tests only) and runs one idle frame. */
function standAt(scene: GameScene, x: number, y: number): void {
  scene.player.position.set(x, y)
  scene.update(16)
}

/** Open floor in the middle of the house: nothing in range. */
const NOWHERE = [960, 720] as const

const spots = hobbyAmbientCandidates(worldObjects)

describe('GameScene hobby flavor messages', () => {
  let scene: GameScene | null = null

  afterEach(() => {
    scene?.destroy()
    scene = null
    vi.restoreAllMocks()
  })

  it.each(spots.map((spot) => [spot.id, spot] as const))(
    '%s: walking up shows its message, with no [E] and no sound',
    (_id, spot) => {
      const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
      const hobby = hobbyFlavorObjects.find((h) => h.id === spot.id)!
      scene = new GameScene()

      standAt(scene, spot.position.x, spot.position.y)

      expect(scene.promptDebugState).toMatchObject({
        id: hobby.id,
        mode: 'info',
        state: 'info',
      })
      expect(shownTexts(scene)).toEqual(
        hobby.secondaryMessage
          ? [hobby.message, hobby.secondaryMessage]
          : [hobby.message],
      )
      expect(scene.player.interactionTarget).toBeNull()
      expect(playOpen).not.toHaveBeenCalled()
    },
  )

  it('stays up for as long as the player is nearby, and goes when they walk away', () => {
    scene = new GameScene()
    const [spot] = spots
    standAt(scene, spot.position.x, spot.position.y)
    const text = scene.contextualMessage.current?.text

    // Far longer than a timed flavor line would last.
    for (let t = 0; t < 20_000; t += 50) scene.update(50)
    expect(scene.contextualMessage.current?.text).toBe(text)

    standAt(scene, ...NOWHERE)
    expect(scene.contextualMessage.current).toBeNull()
    expect(scene.promptDebugState.state).toBe('none')

    // No cooldown: coming straight back shows it again.
    standAt(scene, spot.position.x, spot.position.y)
    expect(scene.contextualMessage.current?.text).toBe(text)
  })

  it('is not interactable: E opens nothing, emits nothing and pauses nothing', () => {
    const received: GameEvent[] = []
    const unsubscribe = gameEventBridge.subscribe((event) =>
      received.push(event),
    )
    scene = new GameScene()
    const [spot] = spots
    standAt(scene, spot.position.x, spot.position.y)

    press('KeyE')
    scene.update(16)
    release('KeyE')

    expect(received).toEqual([])
    expect(scene.contextualMessage.current?.type).toBe('info')
    unsubscribe()
  })

  it('never interrupts movement: the player keeps walking while a message is up', () => {
    scene = new GameScene()
    const rack = spots.find((spot) => spot.radius >= 100)!
    standAt(scene, rack.position.x, rack.position.y)
    expect(scene.contextualMessage.current).not.toBeNull()
    const startX = scene.player.position.x

    press('KeyD')
    for (let i = 0; i < 5; i++) scene.update(16)
    release('KeyD')

    expect(scene.player.position.x).toBeGreaterThan(startX)
    expect(scene.contextualMessage.current).not.toBeNull()
  })

  it('shows one hobby at a time, and swaps cleanly when walking from one object to the next', () => {
    scene = new GameScene()
    const medals = spots.find((spot) => spot.id === 'hobby-running-medals')!
    const drawing = spots.find((spot) => spot.id === 'hobby-drawing')!

    standAt(scene, medals.position.x, medals.position.y)
    expect(scene.promptDebugState.id).toBe('hobby-running-medals')

    standAt(scene, drawing.position.x, drawing.position.y)
    expect(scene.promptDebugState.id).toBe('hobby-drawing')
    expect(scene.contextualMessage.current?.text).toBe(drawing.message.text)
    expect(shownTexts(scene)).not.toContain(medals.message.text)
  })

  it('a real interaction prompt still wins: an interactable in range owns the prompt', () => {
    scene = new GameScene()
    const experience = worldObjects.find((o) => o.id === 'experience')!
    // Just below the Career Timeline stand, next to the gaming corner.
    standAt(scene, experience.position.x, experience.position.y + 110)

    expect(scene.player.interactionTarget?.id).toBe('experience')
    expect(scene.promptDebugState).toMatchObject({
      id: 'experience',
      mode: 'interactive',
    })
    expect(shownTexts(scene)[0]).toMatch(/^\[(E|TAP)\]$/)
  })

  it('a panel opening hides the message; it returns when the panel closes', () => {
    scene = new GameScene()
    const [spot] = spots
    standAt(scene, spot.position.x, spot.position.y)

    gameEventBridge.emit('OPEN_SKILLS')
    expect(scene.contextualMessage.current).toBeNull()

    gameEventBridge.emit('RETURN_TO_WORLD')
    scene.update(16)
    expect(scene.contextualMessage.current?.text).toBe(spot.message.text)
  })
})
