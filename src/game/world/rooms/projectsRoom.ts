import type { WorldObject } from '../WorldObject'
import {
  DESK_FOOTPRINT,
  INTERACTION_RADIUS,
  centeredCollider,
  deskCollider,
  scaleForWidth,
} from './worldObjectHelpers'

/**
 * TOP-RIGHT: the PROJECTS workstation — the main work desk plus its
 * "projects" interaction marker, positioned in front of (south of) it with a
 * clear gap (see the pairwise-overlap check in worldObjects.test.ts).
 */

/** Natural pixel dimensions of the approved desk PNG (assets/world/furniture/desk_laptop.png), read directly from the source file. */
const MAIN_WORK_DESK_NATURAL_SIZE = { width: 1279, height: 764 }

/** Target rendered width (world px) — reproduces the previous shared `FURNITURE_SCALE = 0.28` exactly. Change this single number to resize just this desk. */
const MAIN_WORK_DESK_TARGET_WIDTH = 358.12
const MAIN_WORK_DESK_SCALE = scaleForWidth(
  MAIN_WORK_DESK_NATURAL_SIZE,
  MAIN_WORK_DESK_TARGET_WIDTH,
)

/** Natural pixel dimensions of the approved gaming chair PNG (assets/world/furniture/GamingChair.png) — a square, padded canvas, read directly from the source file. */
const GAMING_CHAIR_NATURAL_SIZE = { width: 1024, height: 1024 }

/** Target rendered width (world px) — change this single number to resize the chair; height follows automatically (no distortion). */
const GAMING_CHAIR_TARGET_WIDTH = 150
const GAMING_CHAIR_SCALE = scaleForWidth(
  GAMING_CHAIR_NATURAL_SIZE,
  GAMING_CHAIR_TARGET_WIDTH,
)

/** The chair's *solid* footprint is just its base/seat near the floor, not its tall backrest rising above it — same reasoning as `DESK_FOOTPRINT`. */
const GAMING_CHAIR_FOOTPRINT = { widthFraction: 0.55, heightFraction: 0.2 }

/** WORLD POSITION — SAFE TO TUNE — in the open floor in front of (south of) main-work-desk, centered on the same x, clear of the "projects" marker's own placeholder box (x:952-1048, y:352-448) so it isn't hidden behind it in dev. */
const GAMING_CHAIR_POSITION = { x: 1000, y: 420 }

export const projectsObjects: WorldObject[] = [
  {
    id: 'main-work-desk',
    asset: 'furniture.mainWorkDesk',
    label: 'MAIN WORK DESK',
    position: { x: 1000, y: 360 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    message: {
      type: 'info',
      text: 'This is where the backend magic happens.',
      radius: 160,
    },
    transform: { width: MAIN_WORK_DESK_TARGET_WIDTH },
    collision: deskCollider(
      { x: 1000, y: 340 },
      MAIN_WORK_DESK_NATURAL_SIZE,
      MAIN_WORK_DESK_SCALE,
      DESK_FOOTPRINT,
    ),
    // No `interaction` — "projects" below owns OPEN_PROJECTS.
  },
  {
    id: 'gaming-chair',
    asset: 'furniture.gamingChair',
    label: 'GAMING CHAIR',
    position: GAMING_CHAIR_POSITION,
    layer: 'object',
    transform: { width: GAMING_CHAIR_TARGET_WIDTH },
    collision: deskCollider(
      GAMING_CHAIR_POSITION,
      GAMING_CHAIR_NATURAL_SIZE,
      GAMING_CHAIR_SCALE,
      GAMING_CHAIR_FOOTPRINT,
    ),
    // No `interaction` — purely environmental furniture, nothing to open.
  },
  {
    id: 'projects',
    asset: 'content.projects',
    label: 'PROJECTS',
    position: { x: 1000, y: 300 }, // WORLD POSITION — SAFE TO TUNE
    layer: 'object',
    collision: centeredCollider({ x: 1000, y: 400 }),
    interaction: { radius: INTERACTION_RADIUS, action: 'OPEN_PROJECTS' },
    message: { type: 'interactive', text: 'Wanna see what he built?' },
  },
  {
    id: 'projects-code-poster',
    asset: 'frames.codePoster',
    label: 'WALL FRAME',
    position: { x: 1230, y: 170 }, // WORLD POSITION — SAFE TO TUNE — open wall gap between the desk (x≤1179) and the kitchen fridge (x≥1395)
    layer: 'object',
    transform: { width: 60 },
    // No `collision` — wall-mounted decor, visual placement pass only.
    message: {
      type: 'flavor',
      text: 'Another day. Another build.',
      // The closest walkable point is ~140 below the wall-mounted frame.
      radius: 150,
      // Already high on the wall — the default would push it off the top.
      elevation: 60,
    },
  },
]
