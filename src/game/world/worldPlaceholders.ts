import { Container, Graphics, Text } from 'pixi.js'
import type { WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

const GRID_STEP = 200

/**
 * Obvious "not final art" placeholder for the room background — no approved
 * room artwork exists in the repository yet (see ASSET_SPEC.md /
 * PHASE-04-WORLD.md "Known risks"). Replaced wholesale once the asset lands;
 * nothing else in `World.ts` depends on its contents.
 */
export function createWorldBoundsPlaceholder(): Container {
  const view = new Container({ label: 'WorldBoundsPlaceholder' })

  const bounds = new Graphics()
    .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    .fill({ color: 0x141414 })
    .stroke({ width: 4, color: 0xff00ff })
  view.addChild(bounds)

  const label = new Text({
    text: `DEVELOPMENT PLACEHOLDER — ${WORLD_WIDTH}×${WORLD_HEIGHT}\nNo approved room artwork yet`,
    style: {
      fontFamily: 'monospace',
      fontSize: 20,
      fill: 0xff00ff,
      align: 'center',
    },
  })
  label.anchor.set(0.5)
  // Bottom edge, clear of the content-area placeholders clustered mid-canvas.
  label.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT - 40)
  view.addChild(label)

  return view
}

/**
 * Coordinate ruler over the canonical bounds, for verifying world dimensions
 * and object placement during development. The caller gates this to
 * `import.meta.env.DEV` — it must never render in production (PERFORMANCE.md).
 */
export function createDebugGrid(): Container {
  const view = new Container({ label: 'DebugGrid' })

  const lines = new Graphics()
  for (let x = 0; x <= WORLD_WIDTH; x += GRID_STEP) {
    lines.moveTo(x, 0).lineTo(x, WORLD_HEIGHT)
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += GRID_STEP) {
    lines.moveTo(0, y).lineTo(WORLD_WIDTH, y)
  }
  lines.stroke({ width: 1, color: 0x00e5ff, alpha: 0.3 })
  view.addChild(lines)

  const labelStyle = { fontFamily: 'monospace', fontSize: 10, fill: 0x00e5ff }

  for (let x = 0; x <= WORLD_WIDTH; x += GRID_STEP) {
    const label = new Text({ text: String(x), style: labelStyle })
    label.position.set(x + 2, 2)
    view.addChild(label)
  }

  for (let y = GRID_STEP; y <= WORLD_HEIGHT; y += GRID_STEP) {
    const label = new Text({ text: String(y), style: labelStyle })
    label.position.set(2, y + 2)
    view.addChild(label)
  }

  return view
}

/**
 * Dev-only outline of every configured blocking collider — drawn at the
 * collider's *actual* rect, independent of whatever the object's visual
 * placeholder looks like (COLLISION_SPEC.md: collision is independent from
 * rendering). The caller gates this to `import.meta.env.DEV`; it must never
 * render in production (PERFORMANCE.md).
 */
export function createCollisionDebugOverlay(
  objects: readonly WorldObject[],
): Container {
  const view = new Container({ label: 'CollisionDebugOverlay' })

  for (const object of objects) {
    if (!object.collision) continue

    const outline = new Graphics()
      .rect(
        object.collision.x,
        object.collision.y,
        object.collision.width,
        object.collision.height,
      )
      .stroke({ width: 2, color: 0xff2d2d })
    view.addChild(outline)
  }

  return view
}
