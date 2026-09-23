import type { WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  INTERACTION_RADIUS,
  PLACEHOLDER_COLLIDER_SIZE,
  centeredCollider,
  centeredColliderClippedToBottom,
} from './worldObjectHelpers'

/**
 * The general personal-info hub: "About Me" (also the player's spawn
 * point), "certificates", and the RESUME content marker. None of these have
 * a dedicated room of their own in the spec's room list, so they're grouped
 * here as the personal/professional-info content zone.
 *
 * The resume DESK furniture piece (previously `furniture.resumeDesk`,
 * desk_resume_original.png) has been removed — not needed. The RESUME
 * content marker/interaction below is unaffected.
 */

export const aboutObjects: WorldObject[] = [
  {
    id: 'aboutMe',
    asset: 'content.aboutMe',
    label: 'ABOUT ME',
    // The exact world center — also the player's spawn point
    // (GameScene.ts: `{ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }`).
    // Reachable immediately with no walking, per PHASE 10B "About Me
    // somewhere accessible without blocking the main path".
    position: { x: 1670, y: 1040 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // The ID card resting on the round side table, slightly askew.
    transform: { width: 22, rotation: -0.18, anchor: { x: 0.5, y: 0.5 } },
    // Intentionally no `collision` — an ambient/info area, not a physical
    // obstacle, and it must never block the player's own spawn point.
    // Wider than the default INTERACTION_RADIUS: the card sits on a table
    // walled in by the two lounge chairs, so approach from any open side.
    interaction: { radius: 130, action: 'OPEN_ABOUT' },
  },
  {
    id: 'certificates',
    asset: 'content.certificates',
    label: 'CERTIFICATES',
    position: { x: 960, y: 1100 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 960, y: 1100 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_CERTIFICATES' },
  },
  {
    id: 'resume',
    asset: 'content.resume',
    label: 'RESUME',
    position: { x: 1480, y: 1180 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // PHASE 10B.1 CLEANUP: same redundant 28px overlap with the bottom wall
    // as "education" — see educationRoom.ts's comment.
    collision: centeredColliderClippedToBottom(
      { x: 1480, y: 1180 },
      PLACEHOLDER_COLLIDER_SIZE,
      BOTTOM_WALL_INNER_Y,
    ),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_RESUME' },
  },
]
