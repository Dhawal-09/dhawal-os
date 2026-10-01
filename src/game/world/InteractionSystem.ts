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
  /** `WORLD_RESPONSE` only: the lines shown in the prompt after `[E]`. */
  response?: readonly string[]
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
  /**
   * Where the prompt's pointer aims, when that isn't straight above
   * `position` — e.g. a wall-mounted object whose message triggers from the
   * floor in front of it.
   */
  pointer?: { x: number; y: number }
}

interface ProximityCandidate {
  position: { x: number; y: number }
  radius: number
}

/**
 * Hysteresis (world units) for ambient spots: the spot already showing its
 * message stays in range this much past its radius, and a neighbour only
 * takes over once it is nearer by more than this — so standing on the
 * boundary between two overlapping spots never flickers between them.
 */
export const AMBIENT_STICKINESS = 12

/**
 * The nearest in-range candidate, or null. Deterministic: ties (equal
 * distance) resolve to whichever candidate appears first in the
 * configuration order. The single proximity algorithm for both lists.
 * `sticky` (the candidate currently active, if any) is favoured by
 * `stickiness` units on both its radius and its distance.
 */
function nearestInRange<T extends ProximityCandidate>(
  candidates: readonly T[],
  playerPosition: { x: number; y: number },
  sticky: T | null = null,
  stickiness = 0,
): T | null {
  let nearest: T | null = null
  let nearestDistance = Infinity

  for (const candidate of candidates) {
    const dx = candidate.position.x - playerPosition.x
    const dy = candidate.position.y - playerPosition.y
    const bonus = candidate === sticky ? stickiness : 0
    const distance = Math.hypot(dx, dy) - bonus

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
   *
   * `extraAmbient`: ambient spots that aren't a WorldObject's own `message`
   * (the hobby storytelling spots — `hobbyFlavor.ts`).
   */
  static fromWorldObjects(
    objects: readonly WorldObject[],
    extraAmbient: readonly AmbientCandidate[] = [],
  ): InteractionSystem {
    const candidates: InteractableCandidate[] = []
    const ambientCandidates: AmbientCandidate[] = []
    for (const object of objects) {
      const { message, interaction } = object
      const position = object.interactionPoint ?? object.position
      if (interaction) {
        candidates.push({
          id: object.id,
          action: interaction.action,
          position,
          radius: interaction.radius,
          message: message?.type === 'interactive' ? message : undefined,
          ...(interaction.action === 'WORLD_RESPONSE' && {
            response: interaction.response,
          }),
        })
      } else if (message && message.type !== 'interactive') {
        ambientCandidates.push({
          id: object.id,
          position,
          radius: message.radius,
          message,
        })
      }
    }
    return new InteractionSystem(candidates, [
      ...ambientCandidates,
      ...extraAmbient,
    ])
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
   * always owns the prompt. Pass the spot currently showing as `current` to
   * keep it from flickering against a neighbour (`AMBIENT_STICKINESS`).
   */
  findNearestAmbientInRange(
    playerPosition: { x: number; y: number },
    current: AmbientCandidate | null = null,
  ): AmbientCandidate | null {
    return nearestInRange(
      this.ambientCandidates,
      playerPosition,
      current,
      AMBIENT_STICKINESS,
    )
  }
}
