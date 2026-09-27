import { describe, expect, it } from 'vitest'
import { CollisionBody } from '../player/CollisionBody'
import { PLAYER_SPAWN_POSITION } from '../player/playerConstants'
import { CollisionSystem } from './CollisionSystem'
import { InteractionSystem } from './InteractionSystem'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'
import { EXTRA_COLLIDERS, worldObjects } from './worldObjects'

/**
 * Data rules + reachability for the contextual message system
 * (INTERACTION_SPEC.md "Contextual messages").
 */
describe('contextual message data', () => {
  it('every interactable has an interactive message, and only interactables do', () => {
    for (const object of worldObjects) {
      if (object.interaction) {
        expect(object.message?.type, object.id).toBe('interactive')
      } else if (object.message) {
        expect(object.message.type, object.id).not.toBe('interactive')
      }
    }
  })

  it('messages stay short: one-line [E] prompts, at most two wrapped lines of flavor/info, one-line response lines', () => {
    const ONE_LINE = 42 // ContextualMessageView wraps at 42 glyphs
    for (const object of worldObjects) {
      const { message, interaction } = object
      if (message) {
        const texts =
          message.type === 'interactive'
            ? [message.text]
            : [message.text, ...(message.variants ?? [])]
        const limit = message.type === 'interactive' ? ONE_LINE : ONE_LINE * 2
        for (const text of texts) {
          expect(text.length, object.id).toBeLessThanOrEqual(limit)
          expect(text.trim(), object.id).toBe(text)
        }
      }
      if (interaction?.action === 'WORLD_RESPONSE') {
        expect(interaction.response.length, object.id).toBeGreaterThan(0)
        expect(interaction.response.length, object.id).toBeLessThanOrEqual(3)
        for (const line of interaction.response) {
          expect(line.length, object.id).toBeLessThanOrEqual(ONE_LINE * 2)
        }
      }
    }
  })

  it('variants and `once` are flavor-only', () => {
    for (const object of worldObjects) {
      const message = object.message
      if (!message || message.type === 'flavor') continue
      if (message.type === 'info') {
        expect(message.variants, object.id).toBeUndefined()
        expect(message.once, object.id).toBeUndefined()
      }
    }
  })

  it('the world stays quiet: info/flavor spots are the exception, not the rule', () => {
    const ambient = worldObjects.filter(
      (object) => object.message && object.message.type !== 'interactive',
    )
    expect(ambient.length).toBeGreaterThan(0)
    expect(ambient.length).toBeLessThanOrEqual(worldObjects.length / 4)
  })

  it('each interactable candidate carries its own object’s message — the prompt and [E] can never disagree', () => {
    const system = InteractionSystem.fromWorldObjects(worldObjects)
    for (const object of worldObjects) {
      if (!object.interaction) continue
      const point = object.interactionPoint ?? object.position
      const candidate = system.findNearestInRange(point)
      expect(candidate?.id, object.id).toBe(object.id)
      expect(candidate?.action).toBe(object.interaction.action)
      expect(candidate?.message).toBe(object.message)
      if (object.interaction.action === 'WORLD_RESPONSE') {
        expect(candidate?.response).toBe(object.interaction.response)
      }
    }
  })

  it('every info/flavor spot, and every [E]-response spot, can actually be triggered from somewhere the player can stand', () => {
    const collision = CollisionSystem.fromWorldObjects(
      worldObjects,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      EXTRA_COLLIDERS,
    )
    const interactions = InteractionSystem.fromWorldObjects(worldObjects)
    const body = new CollisionBody()

    // Flood-fill every position the player can walk to from spawn, on a
    // 10-unit grid, using the real collision resolution.
    const step = 10
    const reachable: { x: number; y: number }[] = []
    const seen = new Set<string>()
    const queue = [{ ...PLAYER_SPAWN_POSITION }]
    seen.add(`${PLAYER_SPAWN_POSITION.x},${PLAYER_SPAWN_POSITION.y}`)
    while (queue.length > 0) {
      const point = queue.pop()!
      reachable.push(point)
      const rect = body.getRect(point.x, point.y)
      for (const [dx, dy] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const resolved = collision.resolveMovement(rect, dx, dy)
        if (resolved.x !== rect.x + dx || resolved.y !== rect.y + dy) continue
        const next = { x: point.x + dx, y: point.y + dy }
        const key = `${next.x},${next.y}`
        if (seen.has(key)) continue
        seen.add(key)
        queue.push(next)
      }
    }

    const unreachable: string[] = []
    for (const object of worldObjects) {
      if (object.interaction?.action === 'WORLD_RESPONSE') {
        const triggered = reachable.some(
          (point) => interactions.findNearestInRange(point)?.id === object.id,
        )
        if (!triggered) unreachable.push(object.id)
        continue
      }
      if (!object.message || object.message.type === 'interactive') continue
      const triggered = reachable.some(
        (point) =>
          !interactions.findNearestInRange(point) &&
          interactions.findNearestAmbientInRange(point)?.id === object.id,
      )
      if (!triggered) unreachable.push(object.id)
    }
    expect(unreachable).toEqual([])
  })
})
