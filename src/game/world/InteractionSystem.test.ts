import { describe, expect, it } from 'vitest'
import type { WorldObject } from './WorldObject'
import { InteractionSystem } from './InteractionSystem'

describe('InteractionSystem', () => {
  it('returns null when nothing is configured', () => {
    const system = new InteractionSystem()

    expect(system.findNearestInRange({ x: 0, y: 0 })).toBeNull()
  })

  it("returns null when the player is outside every candidate's radius", () => {
    const system = new InteractionSystem([
      {
        id: 'a',
        action: 'OPEN_PROJECTS',
        position: { x: 100, y: 100 },
        radius: 20,
      },
    ])

    expect(system.findNearestInRange({ x: 200, y: 200 })).toBeNull()
  })

  it('becomes available once the player is inside the radius', () => {
    const system = new InteractionSystem([
      {
        id: 'a',
        action: 'OPEN_PROJECTS',
        position: { x: 100, y: 100 },
        radius: 50,
      },
    ])

    const result = system.findNearestInRange({ x: 100, y: 130 }) // distance 30 < 50

    expect(result?.id).toBe('a')
    expect(result?.action).toBe('OPEN_PROJECTS')
  })

  it('treats the radius boundary itself as in range', () => {
    const system = new InteractionSystem([
      {
        id: 'a',
        action: 'OPEN_PROJECTS',
        position: { x: 0, y: 0 },
        radius: 50,
      },
    ])

    expect(system.findNearestInRange({ x: 50, y: 0 })).not.toBeNull()
    expect(system.findNearestInRange({ x: 50.01, y: 0 })).toBeNull()
  })

  it('disappears again once the player leaves the radius', () => {
    const system = new InteractionSystem([
      {
        id: 'a',
        action: 'OPEN_PROJECTS',
        position: { x: 100, y: 100 },
        radius: 50,
      },
    ])

    expect(system.findNearestInRange({ x: 110, y: 100 })).not.toBeNull()
    expect(system.findNearestInRange({ x: 500, y: 500 })).toBeNull()
  })

  it('selects the nearest candidate when multiple radii overlap the player', () => {
    const system = new InteractionSystem([
      {
        id: 'far',
        action: 'OPEN_PROJECTS',
        position: { x: 0, y: 0 },
        radius: 200,
      },
      {
        id: 'near',
        action: 'OPEN_EXPERIENCE',
        position: { x: 100, y: 0 },
        radius: 200,
      },
    ])

    const result = system.findNearestInRange({ x: 90, y: 0 })

    expect(result?.id).toBe('near')
  })

  it('is deterministic on exact ties — the first-configured candidate wins', () => {
    const system = new InteractionSystem([
      {
        id: 'first',
        action: 'OPEN_PROJECTS',
        position: { x: -50, y: 0 },
        radius: 200,
      },
      {
        id: 'second',
        action: 'OPEN_EXPERIENCE',
        position: { x: 50, y: 0 },
        radius: 200,
      },
    ])

    const result = system.findNearestInRange({ x: 0, y: 0 }) // equidistant (50) from both

    expect(result?.id).toBe('first')
  })
})

describe('InteractionSystem.fromWorldObjects', () => {
  const objects: WorldObject[] = [
    {
      id: 'projects',
      asset: 'content.projects',
      label: 'PROJECTS',
      position: { x: 0, y: 0 },
      layer: 'object',
      interaction: { radius: 50, action: 'OPEN_PROJECTS' },
    },
    {
      id: 'aboutMe',
      asset: 'content.aboutMe',
      label: 'ABOUT ME',
      position: { x: 10, y: 0 },
      layer: 'object',
      // no `interaction` field — must not become a candidate.
    },
  ]

  it('only includes objects with a configured interaction', () => {
    const system = InteractionSystem.fromWorldObjects(objects)

    const result = system.findNearestInRange({ x: 0, y: 0 })

    expect(result?.id).toBe('projects')
  })

  it('a non-interactable object never becomes a target, even standing on it', () => {
    const onlyNonInteractable = InteractionSystem.fromWorldObjects([objects[1]])

    expect(onlyNonInteractable.findNearestInRange({ x: 10, y: 0 })).toBeNull()
  })
})

describe('InteractionSystem contextual messages', () => {
  const base = { asset: 'x', label: 'X', layer: 'object' as const }
  const objects: WorldObject[] = [
    {
      ...base,
      id: 'desk',
      position: { x: 0, y: 0 },
      interaction: { radius: 50, action: 'OPEN_PROJECTS' },
      message: { type: 'interactive', text: 'Wanna see what he built?' },
    },
    {
      ...base,
      id: 'coffee',
      position: { x: 60, y: 0 },
      message: {
        type: 'flavor',
        text: 'Coffee first. Code later.',
        radius: 80,
      },
    },
    {
      ...base,
      id: 'sign',
      position: { x: 300, y: 0 },
      message: { type: 'info', text: 'Just info.', radius: 40 },
    },
    // Invalid combination: ignored, never half-applied.
    {
      ...base,
      id: 'orphan-interactive',
      position: { x: 600, y: 0 },
      message: { type: 'interactive', text: 'No action behind me' },
    },
  ]
  const system = InteractionSystem.fromWorldObjects(objects)

  it('the interactable candidate carries its own interactive message', () => {
    const target = system.findNearestInRange({ x: 10, y: 0 })
    expect(target?.id).toBe('desk')
    expect(target?.action).toBe('OPEN_PROJECTS')
    expect(target?.message?.text).toBe('Wanna see what he built?')
  })

  it('info/flavor objects are ambient candidates: never interactables, never with an action', () => {
    expect(system.findNearestInRange({ x: 120, y: 0 })).toBeNull()
    const ambient = system.findNearestAmbientInRange({ x: 120, y: 0 })
    expect(ambient?.id).toBe('coffee')
    expect(ambient?.message.type).toBe('flavor')
    expect(ambient).not.toHaveProperty('action')
    expect(system.findNearestAmbientInRange({ x: 300, y: 10 })?.id).toBe('sign')
  })

  it('an interactive message without an interaction is ignored', () => {
    expect(system.findNearestInRange({ x: 600, y: 0 })).toBeNull()
    expect(system.findNearestAmbientInRange({ x: 600, y: 0 })).toBeNull()
  })

  it('both lists answer independently with the same nearest-in-range rule', () => {
    // Inside both radii: GameScene gives the interactable priority.
    expect(system.findNearestInRange({ x: 30, y: 0 })?.id).toBe('desk')
    expect(system.findNearestAmbientInRange({ x: 30, y: 0 })?.id).toBe('coffee')
  })
})
