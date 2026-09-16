import type { WorldObject } from '../WorldObject'
import {
  BOTTOM_WALL_INNER_Y,
  DESK_FOOTPRINT,
  INTERACTION_RADIUS,
  PLACEHOLDER_COLLIDER_SIZE,
  centeredCollider,
  centeredColliderClippedToBottom,
  deskCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * The general personal-info hub: "About Me" (also the player's spawn
 * point), "certificates", and the RESUME workstation. None of these have a
 * dedicated room of their own in the spec's room list, so they're grouped
 * here as the personal/professional-info content zone.
 */

/** Natural pixel dimensions of the approved desk PNG (assets/world/furniture/desk_resume_original.png), read directly from the source file. */
const RESUME_DESK_NATURAL_SIZE = { width: 986, height: 828 }

/** Target rendered width (world px) — reproduces the previous shared `FURNITURE_SCALE = 0.28` exactly. Change this single number to resize just this desk. */
const RESUME_DESK_TARGET_WIDTH = 276.08
const RESUME_DESK_SCALE = scaleForWidth(
  RESUME_DESK_NATURAL_SIZE,
  RESUME_DESK_TARGET_WIDTH,
)

export const aboutObjects: WorldObject[] = [
  {
    id: 'aboutMe',
    asset: 'content.aboutMe',
    label: 'ABOUT ME',
    // The exact world center — also the player's spawn point
    // (GameScene.ts: `{ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }`).
    // Reachable immediately with no walking, per PHASE 10B "About Me
    // somewhere accessible without blocking the main path".
    position: { x: 960, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    // Intentionally no `collision` — an ambient/info area, not a physical
    // obstacle, and it must never block the player's own spawn point.
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_ABOUT' },
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
    id: 'resume-desk',
    asset: 'furniture.resumeDesk',
    label: 'RESUME DESK',
    position: { x: 1480, y: 1080 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: RESUME_DESK_TARGET_WIDTH },
    collision: deskCollider(
      { x: 1480, y: 1080 },
      RESUME_DESK_NATURAL_SIZE,
      RESUME_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — "resume" below owns OPEN_RESUME.
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
