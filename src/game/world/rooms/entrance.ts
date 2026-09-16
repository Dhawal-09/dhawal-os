import type { WorldObject } from '../WorldObject'
import { deskCollider, scaleForHeight } from './worldObjectHelpers'

/**
 * BOTTOM-MIDDLE: the entrance door, embedded in the bottom wall band. It is
 * decorative/physical-only this phase — no open/close/teleport behavior
 * (there is none yet; PHASE 09.1 / PHASE 10B.1 both exclude it).
 */

/** Natural pixel dimensions of the approved door PNG (assets/world/structural/door.png), read directly from the source file. */
const DOOR_NATURAL_SIZE = { width: 141, height: 185 }

/** Target rendered height (world px) — a door's height against the wall is the dimension that actually matters; width follows the PNG's own aspect ratio. Reproduces the previous `DOOR_SCALE = 1` (native size) exactly. */
const DOOR_TARGET_HEIGHT = 185
const DOOR_SCALE = scaleForHeight(DOOR_NATURAL_SIZE, DOOR_TARGET_HEIGHT)

/** The door's art fills almost its entire canvas (verified: opaque pixels cover ~93% of it) — only a thin anti-aliased edge is trimmed from the footprint. */
const DOOR_FOOTPRINT = { widthFraction: 0.9, heightFraction: 0.95 }

export const entranceObjects: WorldObject[] = [
  {
    id: 'door',
    asset: 'structural.door',
    label: 'DOOR',
    position: { x: 960, y: 1370 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { height: DOOR_TARGET_HEIGHT },
    collision: deskCollider(
      { x: 960, y: 1370 },
      DOOR_NATURAL_SIZE,
      DOOR_SCALE,
      DOOR_FOOTPRINT,
    ),
    // No `interaction` yet — physical/visual only this phase; door open/
    // close and room transition are explicitly out of scope.
  },
]
