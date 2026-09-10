import { Container, Graphics, Text } from 'pixi.js'
import type { WorldLayer } from './worldConstants'

/**
 * Minimal axis-aligned collider shape. Phase 06 (CollisionSystem) owns
 * resolution against this data — this module only defines the shape.
 */
export interface Collider {
  x: number
  y: number
  width: number
  height: number
}

/** Canonical events a proximity interaction can trigger (see INTERACTION_SPEC.md). */
export type InteractionAction =
  | 'OPEN_PROJECTS'
  | 'OPEN_EXPERIENCE'
  | 'OPEN_SKILLS'
  | 'OPEN_EDUCATION'
  | 'OPEN_CERTIFICATES'
  | 'OPEN_RESUME'
  | 'OPEN_ABOUT'
  | 'OPEN_CONTACT'

/**
 * Data-driven world-object configuration (see WORLD_SPEC.md "World object
 * model"). Adding a new object must only require a new entry here plus an
 * asset — never a change to a core system.
 */
export interface WorldObject {
  id: string
  /** Stable logical asset id — never a temporary/placeholder filename. */
  asset: string
  /** Human-readable label, shown on the Phase 04 dev placeholder view. */
  label: string
  position: {
    x: number
    y: number
  }
  layer: WorldLayer
  collision?: Collider
  interaction?: {
    radius: number
    action: InteractionAction
  }
}

/** Uniform dev-only placeholder footprint. Real assets size themselves from their own texture. */
const PLACEHOLDER_SIZE = 96

const PLACEHOLDER_COLOR_BY_LAYER: Record<WorldLayer, number> = {
  background: 0x333333,
  object: 0xff00ff,
  foreground: 0x00e5ff,
}

/**
 * Builds a development-only placeholder view for a world object: a flat
 * tinted box + its label. Deliberately unfinished-looking (per
 * DHAWAL_OS asset strategy) so it is never mistaken for approved artwork.
 * Replacing it with the real asset later requires no change to `World.ts`
 * or this object's configuration entry.
 */
export function createWorldObjectPlaceholder(object: WorldObject): Container {
  const view = new Container({ label: `WorldObject:${object.id}` })
  view.position.set(object.position.x, object.position.y)

  const box = new Graphics()
    .rect(
      -PLACEHOLDER_SIZE / 2,
      -PLACEHOLDER_SIZE / 2,
      PLACEHOLDER_SIZE,
      PLACEHOLDER_SIZE,
    )
    .fill({ color: PLACEHOLDER_COLOR_BY_LAYER[object.layer], alpha: 0.35 })
    .stroke({ width: 2, color: PLACEHOLDER_COLOR_BY_LAYER[object.layer] })
  view.addChild(box)

  const text = new Text({
    text: object.label,
    style: {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
    },
  })
  text.anchor.set(0.5)
  view.addChild(text)

  return view
}
