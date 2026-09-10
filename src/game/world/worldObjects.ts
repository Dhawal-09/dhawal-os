import type { WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

/**
 * Placeholder positions for every labeled content area (see WORLD_SPEC.md
 * "Content areas represented in the world"). Positions are arbitrary until
 * the approved room layout is confirmed against the reference — see
 * PHASE-04-WORLD.md "Known risks". Adding a new area requires only a new
 * entry here plus an asset, never a core-system change.
 */
export const worldObjects: WorldObject[] = [
  {
    id: 'projects',
    asset: 'content.projects',
    label: 'PROJECTS',
    position: { x: 300, y: 300 },
    layer: 'object',
  },
  {
    id: 'experience',
    asset: 'content.experience',
    label: 'EXPERIENCE',
    position: { x: 720, y: 220 },
    layer: 'object',
  },
  {
    id: 'skills',
    asset: 'content.skills',
    label: 'SKILLS',
    position: { x: 1140, y: 300 },
    layer: 'object',
  },
  {
    id: 'education',
    asset: 'content.education',
    label: 'EDUCATION',
    position: { x: 300, y: 720 },
    layer: 'object',
  },
  {
    id: 'certificates',
    asset: 'content.certificates',
    label: 'CERTIFICATES',
    position: { x: 720, y: 800 },
    layer: 'object',
  },
  {
    id: 'resume',
    asset: 'content.resume',
    label: 'RESUME',
    position: { x: 1140, y: 720 },
    layer: 'object',
  },
  {
    id: 'aboutMe',
    asset: 'content.aboutMe',
    label: 'ABOUT ME',
    position: { x: 720, y: 512 },
    layer: 'object',
  },
]

/**
 * Fails fast on authoring mistakes: duplicate ids, or a position outside the
 * canonical world bounds. Exported separately so it can be exercised with
 * synthetic fixtures in tests, independent of the real shipped data.
 */
export function validateWorldObjects(objects: WorldObject[]): void {
  const seenIds = new Set<string>()

  for (const object of objects) {
    if (seenIds.has(object.id)) {
      throw new Error(`Duplicate world object id: "${object.id}"`)
    }
    seenIds.add(object.id)

    const { x, y } = object.position
    if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) {
      throw new Error(
        `World object "${object.id}" position (${x}, ${y}) is outside the canonical ${WORLD_WIDTH}x${WORLD_HEIGHT} bounds.`,
      )
    }
  }
}

validateWorldObjects(worldObjects)
