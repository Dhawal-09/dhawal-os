import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../test/stubPixiTextMetrics'
import {
  ContextualMessageView,
  DEFAULT_INTERACTIVE_TEXT,
  DEFAULT_MESSAGE_ELEVATION,
  interactHintLabel,
  messageForTarget,
  PLAYER_HEAD_CLEARANCE,
} from './ContextualMessageView'

function mockMatchMedia(matches: (query: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: matches(query) })),
  )
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('messageForTarget', () => {
  it('interactive target -> its message, anchored DEFAULT_MESSAGE_ELEVATION above its position', () => {
    const content = messageForTarget({
      id: 'about',
      action: 'OPEN_ABOUT',
      position: { x: 100, y: 200 },
      radius: 50,
      message: { type: 'interactive', text: 'Wanna see his ID card?' },
    })
    expect(content).toEqual({
      type: 'interactive',
      text: 'Wanna see his ID card?',
      anchor: { x: 100, y: 200 - DEFAULT_MESSAGE_ELEVATION },
    })
  })

  it('an interactable without a message keeps the generic INTERACT prompt', () => {
    const content = messageForTarget({
      id: 'x',
      action: 'OPEN_SKILLS',
      position: { x: 0, y: 0 },
      radius: 50,
    })
    expect(content.type).toBe('interactive')
    expect(content.text).toBe(DEFAULT_INTERACTIVE_TEXT)
  })

  it('ambient target -> info/flavor type, honoring a per-object elevation', () => {
    const content = messageForTarget({
      id: 'coffee',
      position: { x: 10, y: 300 },
      radius: 80,
      message: {
        type: 'flavor',
        text: 'Coffee first. Code later.',
        radius: 80,
        elevation: 120,
      },
    })
    expect(content.type).toBe('flavor')
    expect(content.anchor).toEqual({ x: 10, y: 180 })
  })
})

describe('messageForTarget head clearance', () => {
  const marker = {
    id: 'resume',
    action: 'OPEN_RESUME' as const,
    position: { x: 100, y: 1180 },
    radius: 70,
  }

  it('lifts the prompt clear of a player standing above the target', () => {
    const content = messageForTarget(marker, { x: 100, y: 1120 })
    expect(content.anchor.y).toBe(1120 - PLAYER_HEAD_CLEARANCE)
  })

  it('keeps the target-relative height when the player stands below it', () => {
    const content = messageForTarget(marker, { x: 100, y: 1240 })
    expect(content.anchor.y).toBe(1180 - DEFAULT_MESSAGE_ELEVATION)
  })
})

describe('interactHintLabel', () => {
  it('[E] on desktop (fine pointer)', () => {
    mockMatchMedia(() => false)
    expect(interactHintLabel()).toBe('[E]')
  })

  it('[TAP] on touch-first devices, never a keyboard key', () => {
    mockMatchMedia((query) => query === '(pointer: coarse)')
    expect(interactHintLabel()).toBe('[TAP]')
  })

  it('[E] when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(interactHintLabel()).toBe('[E]')
  })
})

describe('ContextualMessageView', () => {
  const visibleTexts = (view: ContextualMessageView) =>
    view.children
      .filter((child) => 'text' in child && child.visible)
      .map((child) => (child as unknown as { text: string }).text)

  it('starts hidden', () => {
    const view = new ContextualMessageView()
    expect(view.visible).toBe(false)
    expect(view.current).toBeNull()
    view.destroy()
  })

  it('interactive: shows the key hint + text at the anchor', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView()
    view.show({
      type: 'interactive',
      text: 'Wanna see what he built?',
      anchor: { x: 40, y: 50 },
    })
    expect(view.visible).toBe(true)
    expect(view.position.x).toBe(40)
    expect(view.position.y).toBe(50)
    expect(visibleTexts(view)).toEqual(['[E]', 'Wanna see what he built?'])
    view.destroy()
  })

  it('interactive on touch: [TAP] instead of [E]', () => {
    mockMatchMedia(
      (query) => query === REDUCED_MOTION || query === '(pointer: coarse)',
    )
    const view = new ContextualMessageView()
    view.show({ type: 'interactive', text: 'A', anchor: { x: 0, y: 0 } })
    expect(visibleTexts(view)).toEqual(['[TAP]', 'A'])
    view.destroy()
  })

  it('flavor: text only, no [E]', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView()
    view.show({
      type: 'flavor',
      text: 'Coffee first. Code later.',
      anchor: { x: 0, y: 0 },
    })
    expect(visibleTexts(view)).toEqual(['Coffee first. Code later.'])
    view.destroy()
  })

  it('switching targets replaces the text: one message at a time', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView()
    view.show({ type: 'interactive', text: 'A', anchor: { x: 0, y: 0 } })
    view.show({ type: 'info', text: 'B', anchor: { x: 5, y: 5 } })
    expect(visibleTexts(view)).toEqual(['B'])
    expect(view.current?.text).toBe('B')
    view.destroy()
  })

  it('hide clears the message (immediately under reduced motion)', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView()
    view.show({ type: 'info', text: 'B', anchor: { x: 0, y: 0 } })
    view.hide()
    expect(view.current).toBeNull()
    expect(view.visible).toBe(false)
    view.destroy()
  })

  it('stays a well-formed Pixi container (bounds work, no shadowed internals)', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView({ width: 1920, height: 1440 })
    view.show({ type: 'info', text: 'B', anchor: { x: 500, y: 500 } })
    expect(() => view.getBounds()).not.toThrow()
    view.destroy()
  })

  it('keeps the box inside the world near an edge, while the pointer stays on the target', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView({ width: 1920, height: 1440 })
    view.show({
      type: 'flavor',
      text: 'Knowledge checkpoint.',
      anchor: { x: 10, y: 5 },
    })
    expect(view.x).toBe(10)
    const bounds = view.getLocalBounds()
    expect(view.x + bounds.minX).toBeGreaterThanOrEqual(0)
    expect(view.y + bounds.minY).toBeGreaterThanOrEqual(0)
    view.destroy()
  })

  it('animated: rises into place and fades in, then fades out on hide', async () => {
    mockMatchMedia(() => false)
    const view = new ContextualMessageView()
    view.show({ type: 'info', text: 'B', anchor: { x: 0, y: 100 } })
    expect(view.alpha).toBeLessThan(1)
    expect(view.y).toBeGreaterThan(100)
    await vi.waitFor(() => expect(view.alpha).toBe(1), { timeout: 2000 })
    expect(view.y).toBe(100)

    view.hide()
    expect(view.current).toBeNull()
    await vi.waitFor(() => expect(view.visible).toBe(false), { timeout: 2000 })
    view.destroy()
  })

  it('info with a secondary line: message first, quieter supporting line under it, no [E]', () => {
    mockMatchMedia((query) => query === REDUCED_MOTION)
    const view = new ContextualMessageView()
    view.show({
      type: 'info',
      text: 'HALA MADRID!',
      secondaryText: 'Football has always been one of my favorite ways.',
      wrapGlyphs: 30,
      anchor: { x: 0, y: 0 },
    })
    expect(visibleTexts(view)).toEqual([
      'HALA MADRID!',
      'Football has always been one of my favorite ways.',
    ])

    // The next message without one drops the secondary line again.
    view.show({ type: 'interactive', text: 'A', anchor: { x: 0, y: 0 } })
    expect(visibleTexts(view)).toEqual(['[E]', 'A'])
    view.destroy()
  })

  describe('fitToView', () => {
    const content = {
      type: 'info' as const,
      text: 'Not everything has to be code.',
      anchor: { x: 500, y: 500 },
    }

    it('leaves the prompt at its natural size at the desktop gameplay zoom', () => {
      mockMatchMedia((query) => query === REDUCED_MOTION)
      const view = new ContextualMessageView({ width: 1920, height: 1440 })
      view.show(content)
      view.fitToView({ scale: 1.07, left: 0, right: 1280 })
      expect(view.scale.x).toBe(1)
      expect(view.x).toBe(500)
      view.destroy()
    })

    it('scales the prompt up when the world is drawn small (whole-house view, phones), so text stays legible', () => {
      mockMatchMedia((query) => query === REDUCED_MOTION)
      const view = new ContextualMessageView({ width: 1920, height: 1440 })
      view.show(content)
      view.fitToView({ scale: 0.5, left: 0, right: 1920 })
      // 12-unit text × 0.5 world scale × prompt scale ≥ 9 CSS px.
      expect(12 * 0.5 * view.scale.x).toBeGreaterThanOrEqual(9 - 1e-6)

      // …and back to natural size when zoomed in again.
      view.fitToView({ scale: 1.2, left: 200, right: 900 })
      expect(view.scale.x).toBe(1)
      view.destroy()
    })

    it('slides the box back inside the visible part of the world, without moving the pointer', () => {
      mockMatchMedia((query) => query === REDUCED_MOTION)
      const view = new ContextualMessageView({ width: 1920, height: 1440 })
      view.show(content)
      const centered = view.getLocalBounds()
      expect(centered.minX + centered.maxX).toBeCloseTo(0, 0)

      // The visible world starts just left of the pointer: the box must
      // shift right to stay on screen.
      view.fitToView({ scale: 1, left: 460, right: 1200 })
      const bounds = view.getLocalBounds()
      expect(view.x).toBe(500)
      expect(view.x + bounds.minX).toBeGreaterThanOrEqual(460)

      // Camera pans away from the edge: the box re-centres on its pointer.
      view.fitToView({ scale: 1, left: 0, right: 1200 })
      const recentred = view.getLocalBounds()
      expect(recentred.minX + recentred.maxX).toBeCloseTo(0, 0)
      view.destroy()
    })

    it('is a no-op while hidden or without a usable viewport', () => {
      const view = new ContextualMessageView({ width: 1920, height: 1440 })
      expect(() => {
        view.fitToView(null)
        view.fitToView({ scale: 0, left: 0, right: 0 })
        view.fitToView({ scale: 0.4, left: 0, right: 600 })
      }).not.toThrow()
      expect(view.scale.x).toBe(1)
      expect(view.visible).toBe(false)
      view.destroy()
    })
  })
})
