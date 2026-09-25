import type {
  AmbientMessage,
  InteractionAction,
  InteractiveMessage,
  WorldObject,
} from './WorldObject'

export interface InteractableCandidate {
  id: string
  action: InteractionAction
  position: { x: number; y: number }
  radius: number
  /** The object's `interactive` message, if configured — the prompt text for this action. */
  message?: InteractiveMessage
}

/**
 * A non-interactive (info/flavor) message spot: a WorldObject with a
 * `message` but no `interaction`. Never has an action, so it can never be
 * what `[E]` triggers.
 */
export interface AmbientCandidate {
  id: string
  position: { x: number; y: number }
  radius: number
  message: AmbientMessage
}

interface ProximityCandidate {
  position: { x: number; y: number }
  radius: number
}

/**
 * The nearest in-range candidate, or null. Deterministic: ties (equal
 * distance) resolve to whichever candidate appears first in the
 * configuration order. The single proximity algorithm for both lists.
 */
function nearestInRange<T extends ProximityCandidate>(
  candidates: readonly T[],
  playerPosition: { x: number; y: number },
): T | null {
  let nearest: T | null = null
  let nearestDistance = Infinity

  for (const candidate of candidates) {
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

/**
 * Determines proximity eligibility only — never what React displays (that's
 * GameEventBridge's job; INTERACTION_SPEC.md "Responsibility split"). Purely
 * geometric, no Pixi/rendering dependency, no per-object special-casing:
 * every candidate is driven entirely by its configured `action`.
 *
 * Also the source of the contextual message spots: interactables carry their
 * `interactive` message on the candidate itself (so the prompt and `[E]`
 * always describe the same object), and info/flavor-only objects form a
 * separate, lower-priority list (`findNearestAmbientInRange`).
 */
export class InteractionSystem {
  private readonly candidates: readonly InteractableCandidate[]
  private readonly ambientCandidates: readonly AmbientCandidate[]

  constructor(
    candidates: readonly InteractableCandidate[] = [],
    ambientCandidates: readonly AmbientCandidate[] = [],
  ) {
    this.candidates = candidates
    this.ambientCandidates = ambientCandidates
  }

  /**
   * Only WorldObject entries with an `interaction` field become (actionable)
   * candidates. Entries with an info/flavor `message` and no `interaction`
   * become ambient candidates. An `interactive` message on an object without
   * an `interaction`, or an info/flavor message on one that has it, is
   * ignored (`worldObjects.test.ts` rejects both in data).
   */
  static fromWorldObjects(objects: readonly WorldObject[]): InteractionSystem {
    const candidates: InteractableCandidate[] = []
    const ambientCandidates: AmbientCandidate[] = []
    for (const object of objects) {
      const { message } = object
      if (object.interaction) {
        candidates.push({
          id: object.id,
          action: object.interaction.action,
          position: object.position,
          radius: object.interaction.radius,
          message: message?.type === 'interactive' ? message : undefined,
        })
      } else if (message && message.type !== 'interactive') {
        ambientCandidates.push({
          id: object.id,
          position: object.position,
          radius: message.radius,
          message,
        })
      }
    }
    return new InteractionSystem(candidates, ambientCandidates)
  }

  /** The nearest in-range interactable — what `[E]` triggers. */
  findNearestInRange(playerPosition: {
    x: number
    y: number
  }): InteractableCandidate | null {
    return nearestInRange(this.candidates, playerPosition)
  }

  /**
   * The nearest in-range info/flavor spot. Callers must only consult this
   * when `findNearestInRange` found nothing — an interactable in range
   * always owns the prompt.
   */
  findNearestAmbientInRange(playerPosition: {
    x: number
    y: number
  }): AmbientCandidate | null {
    return nearestInRange(this.ambientCandidates, playerPosition)
  }
}
