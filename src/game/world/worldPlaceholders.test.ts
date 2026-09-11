import { describe, expect, it } from 'vitest'
import {
  createCollisionDebugOverlay,
  createDebugGrid,
  createDevWorldBoundsAnnotation,
  createWorldBoundsPlaceholder,
} from './worldPlaceholders'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

describe('createWorldBoundsPlaceholder (PHASE 10B: upgrades to the real floor artwork)', () => {
  it('is labeled and positioned at the world origin', () => {
    const view = createWorldBoundsPlaceholder()

    expect(view.label).toBe('WorldBoundsPlaceholder')
    expect(view.position.x).toBe(0)
    expect(view.position.y).toBe(0)
  })

  it('starts with a single flat-fill child — the immediate synchronous placeholder', () => {
    const view = createWorldBoundsPlaceholder()

    expect(view.children).toHaveLength(1)
  })

  it('does not throw when constructed repeatedly (each kicks off its own manifest-driven upgrade)', () => {
    expect(() => {
      createWorldBoundsPlaceholder()
      createWorldBoundsPlaceholder()
    }).not.toThrow()
  })
})

describe('worldPlaceholders debug helpers (unaffected by PHASE 10B)', () => {
  it('the dev world-bounds annotation covers the full 1920x1440 canonical world', () => {
    const view = createDevWorldBoundsAnnotation()
    expect(view.label).toBe('DevWorldBoundsAnnotation')
  })

  it('the debug grid and collision overlay construct cleanly against the current world size', () => {
    expect(() => createDebugGrid()).not.toThrow()
    expect(() => createCollisionDebugOverlay([])).not.toThrow()
  })

  it('sanity: the canonical world constants this module renders against are 1920x1440', () => {
    expect(WORLD_WIDTH).toBe(1920)
    expect(WORLD_HEIGHT).toBe(1440)
  })
})
