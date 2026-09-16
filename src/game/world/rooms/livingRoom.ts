import type { WorldObject } from '../WorldObject'
import { INTERACTION_RADIUS, centeredCollider } from './worldObjectHelpers'

/**
 * MIDDLE-LEFT: the "experience"/lounge content marker, plus the Experience
 * room's furniture. Every furniture item below is visual-only (no
 * collision — visual placement pass only, same precedent as kitchen.ts).
 * The "experience" marker is deliberately the *last* entry so it always
 * draws on top of the furniture beneath it (World.ts draws array order,
 * not a Y-sort) — its label/hotspot must never be hidden behind the rug or
 * furniture placed near it.
 */

const LIVING_TV_CONSOLE_NATURAL_SIZE = { width: 1200, height: 896 } // BelowTv.png
const LIVING_TV_CONSOLE_TARGET_WIDTH = 290
const LIVING_TV_CONSOLE_HEIGHT =
  LIVING_TV_CONSOLE_TARGET_WIDTH *
  (LIVING_TV_CONSOLE_NATURAL_SIZE.height / LIVING_TV_CONSOLE_NATURAL_SIZE.width)
const LIVING_TV_CONSOLE_POSITION = { x: 420, y: 650 } // WORLD POSITION — SAFE TO TUNE

/** The TV stands directly on top of the console — its floor point is the console's own top edge, not a hand-picked number, so retuning the console's height never leaves the TV floating or sunken. */
const LIVING_TV_POSITION = {
  x: LIVING_TV_CONSOLE_POSITION.x,
  y: LIVING_TV_CONSOLE_POSITION.y - LIVING_TV_CONSOLE_HEIGHT,
}

export const livingRoomObjects: WorldObject[] = [
  {
    id: 'living-rug',
    asset: 'living.rug',
    label: 'RUG',
    position: { x: 530, y: 740 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 360 },
  },
  {
    id: 'living-storage-cabinet',
    asset: 'living.storageCabinet',
    label: 'STORAGE CABINET',
    position: { x: 520, y: 760 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 150 },
  },
  {
    id: 'living-tv-console',
    asset: 'living.tvConsole',
    label: 'TV CONSOLE',
    position: LIVING_TV_CONSOLE_POSITION,
    layer: 'object',
    transform: { width: LIVING_TV_CONSOLE_TARGET_WIDTH },
  },
  {
    id: 'living-tv',
    asset: 'living.tv',
    label: 'TV',
    position: LIVING_TV_POSITION,
    layer: 'object',
    transform: { width: 220 },
  },
  {
    id: 'living-bookshelf',
    asset: 'living.bookshelf',
    label: 'BOOKSHELF',
    position: { x: 680, y: 880 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 140 },
  },
  {
    id: 'living-big-plant',
    asset: 'living.bigPlant',
    label: 'INDOOR PLANT',
    position: { x: 675, y: 305 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    transform: { width: 200 },
  },
  
  {
    id: 'experience',
    asset: 'content.experience',
    label: 'EXPERIENCE',
    position: { x: 380, y: 720 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 380, y: 720 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_EXPERIENCE' },
  },
]
