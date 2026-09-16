import type { WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  DESK_FOOTPRINT,
  INTERACTION_RADIUS,
  PLACEHOLDER_COLLIDER_SIZE,
  centeredColliderClippedToBottom,
  deskCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * BOTTOM-LEFT: the EDUCATION workstation — the education desk plus its
 * "education" interaction marker.
 */

/** Natural pixel dimensions of the approved desk PNG (assets/world/furniture/desk_education.png), read directly from the source file. */
const EDUCATION_DESK_NATURAL_SIZE = { width: 920, height: 787 }

/** Target rendered width (world px) — reproduces the previous shared `FURNITURE_SCALE = 0.28` exactly. Change this single number to resize just this desk. */
const EDUCATION_DESK_TARGET_WIDTH = 212.6
const EDUCATION_DESK_SCALE = scaleForWidth(
  EDUCATION_DESK_NATURAL_SIZE,
  EDUCATION_DESK_TARGET_WIDTH,
)

export const educationObjects: WorldObject[] = [
  {
    id: 'education-desk',
    asset: 'furniture.educationDesk',
    label: 'EDUCATION DESK',
    position: { x: 625, y: 1060 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: EDUCATION_DESK_TARGET_WIDTH },
    collision: deskCollider(
      { x: 300, y: 1080 },
      EDUCATION_DESK_NATURAL_SIZE,
      EDUCATION_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — "education" below owns OPEN_EDUCATION.
  },
  {
    id: 'education',
    asset: 'content.education',
    label: 'EDUCATION',
    position: { x: 300, y: 1180 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // PHASE 10B.1 CLEANUP: the default symmetric 96px box's bottom edge
    // (1228) redundantly overlapped the bottom room-boundary wall (1200) by
    // 28px — both obstacles blocked the same strip, harmless but removed
    // for cleanliness. Only the bottom edge is clipped; reachability is
    // unaffected (see worldObjects.test.ts's reachability regression test).
    collision: centeredColliderClippedToBottom(
      { x: 300, y: 1180 },
      PLACEHOLDER_COLLIDER_SIZE,
      BOTTOM_WALL_INNER_Y,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EDUCATION' },
  },
]
