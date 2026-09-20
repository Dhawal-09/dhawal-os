import { Assets, Container, Graphics, Text, type Texture } from 'pixi.js'
import { getFurnitureAssetUrl } from './assetManifest'
import type { Collider } from './WorldObject'
import { ManagedAssetSprite, type WorldObject } from './WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

const GRID_STEP = 200

/** The approved floor/background artwork's logical asset id (see assetManifest.ts, PHASE 10B). */
const WORLD_BACKGROUND_ASSET_ID = 'structural.floor'

/**
 * Swaps the flat placeholder rect for the real floor/background artwork
 * once it loads — the same fire-and-forget upgrade pattern as
 * WorldObject.ts's `upgradeToSprite` (PHASE 10B "floor background"; see
 * that function's docs for why every failure path is swallowed here too).
 * Anchored at the world's own origin (0, 0) and scaled *uniformly* — the
 * larger of the two fit ratios, so the art always fully covers the
 * 1920×1440 world with at most a few px of harmless overflow past the far
 * edge, never a visible gap and never independent x/y stretching, even
 * though the source PNG (1446×1087) isn't pixel-exact to the world's own
 * aspect ratio.
 */
async function upgradeToBackgroundSprite(
  view: Container,
  url: string,
): Promise<void> {
  try {
    const texture = await Assets.load<Texture>(url)
    if (view.destroyed) return

    const scale = Math.max(
      WORLD_WIDTH / texture.width,
      WORLD_HEIGHT / texture.height,
    )
    const sprite = new ManagedAssetSprite(texture)
    sprite.label = 'WorldBackground'
    sprite.scale.set(scale)

    for (const child of view.removeChildren()) child.destroy()
    view.addChild(sprite)
  } catch {
    // Real background failed to load — the flat placeholder rect (still
    // this view's only child) remains visible instead of a blank world.
  }
}

/**
 * Neutral placeholder fill for the room background, upgraded in place to
 * the real approved floor artwork once `structural.floor` resolves through
 * the same asset-manifest mechanism as every other world object (PHASE
 * 10B) — an id with no manifest entry (e.g. in a test fixture) simply keeps
 * this flat rect forever, so nothing else in `World.ts` depends on its
 * contents either way. Deliberately plain in every build (no magenta
 * stroke, no label) — PHASE 09 "production output must not display...
 * magenta world border... development placeholder text". The dev-only
 * magenta annotation that makes this obviously-not-final is
 * `createDevWorldBoundsAnnotation` below.
 */
export function createWorldBoundsPlaceholder(): Container {
  const view = new Container({ label: 'WorldBoundsPlaceholder' })

  const bounds = new Graphics()
    .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    .fill({ color: 0x141414 })
  view.addChild(bounds)

  const assetUrl = getFurnitureAssetUrl(WORLD_BACKGROUND_ASSET_ID)
  if (assetUrl) {
    void upgradeToBackgroundSprite(view, assetUrl)
  }

  return view
}

/**
 * The magenta "this is not final art" outline + label, layered over
 * `createWorldBoundsPlaceholder()`. The caller gates this to
 * `import.meta.env.DEV` — it must never render in production
 * (PERFORMANCE.md / PHASE 09 "Important development vs production").
 */
export function createDevWorldBoundsAnnotation(): Container {
  const view = new Container({ label: 'DevWorldBoundsAnnotation' })

  const outline = new Graphics()
    .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    .stroke({ width: 4, color: 0xff00ff })
  view.addChild(outline)

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
 * rendering) — plus, for each WorldObject, its id/position/collision size
 * and (where configured) its interaction radius. The caller gates this to
 * `import.meta.env.DEV`; it must never render in production
 * (PERFORMANCE.md).
 */
export function createCollisionDebugOverlay(
  objects: readonly WorldObject[],
  extraColliders: readonly Collider[] = [],
): Container {
  const view = new Container({ label: 'CollisionDebugOverlay' })

  for (const collider of extraColliders) {
    view.addChild(createColliderOutline(collider))
  }

  for (const object of objects) {
    if (!object.collision && !object.interaction) continue
    view.addChild(createObjectDebugEntry(object))
  }

  return view
}

/**
 * Always-on (dev-only) bright outline for colliders the author is actively
 * placing/tuning — unlike `createCollisionDebugOverlay`, no env var needed.
 * Yellow with a light fill so it stands apart from the red debug boxes.
 */
export function createVisibleColliderOutlines(
  colliders: readonly Collider[],
): Container {
  const view = new Container({ label: 'VisibleColliders' })
  for (const collider of colliders) {
    view.addChild(
      new Graphics()
        .rect(collider.x, collider.y, collider.width, collider.height)
        .fill({ color: 0xffe14d, alpha: 0.25 })
        .stroke({ width: 3, color: 0xffe14d }),
    )
  }
  return view
}

function createColliderOutline(collider: Collider): Graphics {
  return new Graphics()
    .rect(collider.x, collider.y, collider.width, collider.height)
    .stroke({ width: 2, color: 0xff2d2d })
}

/** One WorldObject's full debug picture, grouped into a single child so overlay.children stays one-entry-per-object regardless of how many debug primitives it draws. */
function createObjectDebugEntry(object: WorldObject): Container {
  const entry = new Container({ label: `ColliderDebug:${object.id}` })

  if (object.collision) {
    entry.addChild(createColliderOutline(object.collision))

    const visualSize = object.transform
      ? `${object.transform.width ?? 'auto'}×${object.transform.height ?? 'auto'}`
      : 'native'
    const label = new Text({
      text: `${object.id}\npos: ${Math.round(object.position.x)}, ${Math.round(object.position.y)}\nvisual: ${visualSize}\ncollision: ${Math.round(object.collision.width)}×${Math.round(object.collision.height)}`,
      style: { fontFamily: 'monospace', fontSize: 10, fill: 0xff2d2d },
    })
    label.position.set(object.collision.x + 2, object.collision.y + 2)
    entry.addChild(label)
  }

  if (object.interaction) {
    const circle = new Graphics()
      .circle(object.position.x, object.position.y, object.interaction.radius)
      .stroke({ width: 1, color: 0x00e5ff, alpha: 0.6 })
    entry.addChild(circle)
  }

  return entry
}
