import type { AmbientCandidate } from './InteractionSystem'
import type { WorldObject } from './WorldObject'

/**
 * Hobbies as environmental storytelling: no panel, no `[E]`. Walking up to a
 * hobby object makes the world quietly say one thing about it, in the same
 * in-world prompt every other contextual message uses; walking away fades
 * it. The objects themselves stay the story — these lines only caption them.
 *
 * Purely data: adding a hobby is one entry here, never a new code branch.
 */

interface Offset {
  x: number
  y: number
}

/**
 * One place a hobby's message can be triggered, tied to a real world object
 * by id. Both offsets are relative to that object's own `position`, so the
 * spot moves with the object if its placement is ever retuned.
 */
export interface HobbyFlavorSpot {
  /** `WorldObject.id` of the hobby object this spot belongs to. */
  object: string
  /** Offset to the trigger point — where the player actually stands (wall pieces are approached from the floor in front). */
  trigger: Offset
  /**
   * Offset to where the message's pointer aims. In the gym this is the top
   * of the brick wall above the object, so the caption box sits clear of the
   * wall displays instead of covering the thing it describes.
   */
  pointer: Offset
  /** World units around the trigger point within which the message shows. */
  radius: number
}

export interface HobbyFlavorObject {
  id: string
  message: string
  secondaryMessage?: string
  /** Every object that tells this hobby's story; the nearest spot in range shows the message. */
  spots: readonly HobbyFlavorSpot[]
}

/**
 * Hobby messages wrap narrower than the default prompt (42 glyphs) so the
 * two-line caption stays a compact box, including on a phone-sized viewport.
 */
export const HOBBY_WRAP_GLYPHS = 30

/**
 * No "side projects" entry: there is no workbench/personal-build object in
 * the world to caption (the main work desk already belongs to Projects), and
 * a spot is never invented without an object.
 */
export const hobbyFlavorObjects: readonly HobbyFlavorObject[] = [
  {
    id: 'hobby-football-jersey',
    message: 'HALA MADRID! ⚽',
    spots: [
      // The jersey hangs on the brick wall behind the gym station; the floor
      // pocket at its left edge is the one place to stand right under it.
      {
        object: 'hobbies-jersey',
        trigger: { x: -42, y: 20 },
        pointer: { x: 0, y: -140 },
        radius: 1,
      },
      // Under the club scarf — the football corner, and the first thing
      // reached when walking in from the entrance side.
      {
        object: 'hobbies-scarf',
        trigger: { x: 35, y: 80 },
        pointer: { x: 0, y: -170 },
        radius: 100,
      },
    ],
  },
  {
    id: 'hobby-running-medals',
    message: 'A few miles, a few races, a few medals. 🏃',
    spots: [
      // Wall plaque: trophy on top, medals hanging below.
      {
        object: 'hobbies-wall-trophy',
        trigger: { x: 0, y: 14 },
        pointer: { x: 0, y: -166 },
        radius: 65,
      },
    ],
  },
  {
    id: 'hobby-gym-equipment',
    message: 'Gym time. Build. Recover. Repeat. 💪',
    spots: [
      // Beside the dumbbell rack's open (right) end. The gym station keeps
      // its own one-liner (hobbiesRoom.ts), so it has no spot here.
      {
        object: 'hobbies-dumbbell-rack',
        trigger: { x: 80, y: -130 },
        pointer: { x: 80, y: -390 },
        radius: 70,
      },
    ],
  },
  {
    id: 'hobby-gaming-corner',
    message: 'Sometimes I play games. Sometimes I build them. 🎮',
    spots: [
      // On the mat, in front of the gaming table's monitor and controller.
      {
        object: 'gaming-table',
        trigger: { x: -90, y: -119 },
        pointer: { x: 0, y: -269 },
        radius: 110,
      },
    ],
  },
  {
    id: 'hobby-drawing',
    message: 'I like sketching, drawing and experimenting with ideas 🎨',
    spots: [
      // The framed artwork on the gym wall — the room's one drawing piece.
      {
        object: 'hobbies-artwork',
        trigger: { x: 0, y: 40 },
        pointer: { x: 0, y: -140 },
        radius: 55,
      },
    ],
  },
]

/**
 * The hobby spots as ambient (non-interactive) message candidates for
 * `InteractionSystem`. They are `info` messages: shown for as long as the
 * player stays in range, with no key hint and no action — so they can never
 * be what `[E]` triggers, and an interactable in range always wins the
 * prompt. Throws if an entry names an object that isn't in the world.
 */
export function hobbyAmbientCandidates(
  objects: readonly WorldObject[],
  hobbies: readonly HobbyFlavorObject[] = hobbyFlavorObjects,
): AmbientCandidate[] {
  const byId = new Map(objects.map((object) => [object.id, object]))
  const candidates: AmbientCandidate[] = []

  for (const hobby of hobbies) {
    const message = {
      type: 'info',
      text: hobby.message,
      secondaryText: hobby.secondaryMessage,
      wrapGlyphs: HOBBY_WRAP_GLYPHS,
    } as const

    for (const spot of hobby.spots) {
      const object = byId.get(spot.object)
      if (!object) {
        throw new Error(
          `Hobby "${hobby.id}" refers to unknown world object "${spot.object}"`,
        )
      }
      const { x, y } = object.position
      candidates.push({
        id: hobby.id,
        position: { x: x + spot.trigger.x, y: y + spot.trigger.y },
        pointer: { x: x + spot.pointer.x, y: y + spot.pointer.y },
        radius: spot.radius,
        message: { ...message, radius: spot.radius },
      })
    }
  }

  return candidates
}
