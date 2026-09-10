import type { InteractionAction, WorldObject } from './WorldObject'

export interface InteractableCandidate {
  id: string
  action: InteractionAction
  position: { x: number; y: number }
  radius: number
}

/**
 * Determines proximity eligibility only — never what React displays (that's
 * GameEventBridge's job; INTERACTION_SPEC.md "Responsibility split"). Purely
 * geometric, no Pixi/rendering dependency, no per-object special-casing:
 * every candidate is driven entirely by its configured `action`.
 */
export class InteractionSystem {
  private readonly candidates: readonly InteractableCandidate[]

  constructor(candidates: readonly InteractableCandidate[] = []) {
    this.candidates = candidates
  }

  /** Only WorldObject entries with an `interaction` field become candidates. */
  static fromWorldObjects(objects: readonly WorldObject[]): InteractionSystem {
    const candidates: InteractableCandidate[] = []
    for (const object of objects) {
      if (!object.interaction) continue
      candidates.push({
        id: object.id,
        action: object.interaction.action,
        position: object.position,
        radius: object.interaction.radius,
      })
    }
    return new InteractionSystem(candidates)
  }

  /**
   * The nearest in-range candidate, or null. Deterministic: ties (equal
   * distance) resolve to whichever candidate appears first in the
   * configuration order.
   */
  findNearestInRange(playerPosition: {
    x: number
    y: number
  }): InteractableCandidate | null {
    let nearest: InteractableCandidate | null = null
    let nearestDistance = Infinity

    for (const candidate of this.candidates) {
      const dx = candidate.position.x - playerPosition.x
      const dy = candidate.position.y - playerPosition.y
      const distance = Math.hypot(dx, dy)

      if (distance > candidate.radius) continue
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = candidate
      }
    }

    return nearest
  }
}
