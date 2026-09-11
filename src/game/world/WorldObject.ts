import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from 'pixi.js'
import { getFurnitureAssetUrl } from './assetManifest'
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
  /**
   * Uniform render scale applied to the real asset once it loads (never
   * independent x/y — PHASE-10A "Asset scale" forbids distortion).
   * Ignored by the dev placeholder, which always draws at PLACEHOLDER_SIZE.
   * Defaults to 1 (native pixel size) when omitted.
   */
  scale?: number
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

/**
 * A Sprite whose texture came from Pixi's shared `Assets` cache
 * (`Assets.load()` in `upgradeToSprite` below) rather than being owned
 * outright by this Sprite. `Container.destroy({ texture: true,
 * textureSource: true })` — which `GameApp.destroy()` passes when tearing
 * down the whole scene (e.g. on EXIT) — cascades to every descendant
 * Sprite/Text and, by default, destroys its texture too. For an
 * `Assets`-cached texture that corrupts the shared cache for any *future*
 * scene: PixiJS itself warns "A TextureSource managed by Assets was
 * destroyed instead of unloaded!", and the next `Assets.load()` for the
 * same URL (e.g. START JOURNEY again after EXIT, without a full page
 * reload — PHASE 09.1/10B's session-persistence flow) then resolves a
 * broken texture. This override tears down the Sprite's own display-object
 * resources exactly as normal but always strips `texture`/`textureSource`
 * from whatever destroy options cascade down to it, leaving the shared
 * texture itself alone — Pixi's own `Assets` system remains the sole owner
 * of its lifetime.
 */
export class ManagedAssetSprite extends Sprite {
  override destroy(options?: Parameters<Sprite['destroy']>[0]): void {
    const safeOptions =
      typeof options === 'boolean'
        ? { children: options, texture: false, textureSource: false }
        : { ...options, texture: false, textureSource: false }
    super.destroy(safeOptions)
  }
}

/**
 * Builds the real furniture Sprite from a loaded texture. Anchored at
 * (0.5, 1) — bottom-center — so `object.position` always represents the
 * point where the object meets the floor (PHASE-10A "Anchor convention"),
 * the same point `createWorldObjectPlaceholder` centers its box on. `scale`
 * is applied uniformly to both axes — never independent x/y — so the art
 * never distorts.
 */
export function createDeskSprite(texture: Texture, scale = 1): Sprite {
  const sprite = new ManagedAssetSprite(texture)
  sprite.label = 'DeskSprite'
  sprite.anchor.set(0.5, 1)
  sprite.scale.set(scale)
  return sprite
}

/**
 * Swaps a placeholder view's contents for the real asset once it loads.
 * Fire-and-forget by design — `createWorldObjectView` never awaits this, so
 * every failure path is caught internally here: a slow, missing, or broken
 * asset can never surface as an unhandled rejection, and the dev placeholder
 * (deliberately "unfinished-looking") just stays visible instead of a blank
 * object, per PHASE-10A "Asset validation".
 */
async function upgradeToSprite(
  view: Container,
  url: string,
  scale: number,
): Promise<void> {
  try {
    const texture = await Assets.load<Texture>(url)
    if (view.destroyed) return
    for (const child of view.removeChildren()) child.destroy()
    view.addChild(createDeskSprite(texture, scale))
  } catch {
    // Real asset failed to load — leave the dev placeholder in place rather
    // than silently swallowing the problem into a blank/missing object.
  }
}

/**
 * The view `World.ts` actually places into a layer: the dev placeholder,
 * upgraded in place to the real approved asset when `object.asset` has an
 * entry in assetManifest.ts. Objects with no mapped asset keep rendering as
 * the placeholder indefinitely — adding a manifest mapping is the only step
 * required to "go live," never a change to World.ts or this object's own
 * configuration.
 */
export function createWorldObjectView(object: WorldObject): Container {
  const view = createWorldObjectPlaceholder(object)

  const assetUrl = getFurnitureAssetUrl(object.asset)
  if (assetUrl) {
    void upgradeToSprite(view, assetUrl, object.scale ?? 1)
  }

  return view
}
