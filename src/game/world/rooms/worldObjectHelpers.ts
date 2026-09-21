import type { Collider } from '../WorldObject'
import { WORLD_HEIGHT, WORLD_WIDTH } from '../worldConstants'

/**
 * Shared, generic helpers for building room-object collision footprints and
 * render-size targets (PHASE 10B.1 origin; relocated here so every room file
 * can reuse the same math without duplicating it — see the "asset scaling"
 * refactor). Nothing here is room-specific; a room file that needs
 * bespoke math keeps it local to itself instead of growing this file.
 */

/** Placeholder collider footprint for content-area "furniture"/markers — deliberately independent of the visual placeholder size in WorldObject.ts (COLLISION_SPEC.md "collision is independent from rendering"). */
export const PLACEHOLDER_COLLIDER_SIZE = 96

/** Placeholder proximity radius (INTERACTION_SPEC.md example uses a comparable value) — independently tunable per object later. */
export const INTERACTION_RADIUS = 70

export function centeredCollider(
  position: { x: number; y: number },
  size: number = PLACEHOLDER_COLLIDER_SIZE,
): Collider {
  return {
    x: position.x - size / 2,
    y: position.y - size / 2,
    width: size,
    height: size,
  }
}

/**
 * A `centeredCollider` whose bottom edge is clipped to never exceed
 * `bottomLimit`. Used only where a marker's default symmetric box would
 * otherwise redundantly overlap an adjacent obstacle (e.g. the
 * "education"/"resume" markers vs. the bottom room-boundary wall). Only the
 * bottom edge moves; the top/left/right edges are byte-for-byte identical to
 * `centeredCollider`.
 */
export function centeredColliderClippedToBottom(
  position: { x: number; y: number },
  size: number,
  bottomLimit: number,
): Collider {
  const full = centeredCollider(position, size)
  const bottom = Math.min(full.y + full.height, bottomLimit)
  return { ...full, height: bottom - full.y }
}

/**
 * Converts a desired *rendered width* (world px) into the uniform scale that
 * produces it — used only for collision-footprint math (`deskCollider`,
 * `contentAlignedCollider` below); the actual rendered Sprite sizes itself
 * independently via `WorldObject.transform` + `resolveAssetSize`, per
 * COLLISION_SPEC.md "collision is independent from rendering".
 */
export function scaleForWidth(
  naturalSize: { readonly width: number },
  targetWidth: number,
): number {
  return targetWidth / naturalSize.width
}

/** Same idea as `scaleForWidth`, but pick the target by height instead — for assets where height is the dimension that actually matters (e.g. a door's height against the wall). */
export function scaleForHeight(
  naturalSize: { readonly height: number },
  targetHeight: number,
): number {
  return targetHeight / naturalSize.height
}

/**
 * Places a padded-canvas asset by its *visible content* rather than its
 * canvas: the returned `transform.width` makes the measured `contentBBox`
 * render `visibleWidth` world px wide (uniform scale — no stretching), and
 * `position` is the sprite's bottom-center anchor corrected so the visible
 * content's own bottom-center lands exactly on `visibleBottomCenter`.
 * Handles both the padding below the content and any left/right offset of
 * the content within its canvas, so a piece can be positioned by "where it
 * visibly sits" without redoing the padding math by hand. Visual placement
 * only — collision, where wanted, still comes from `contentAlignedCollider`.
 */
export function placeByVisibleContent(
  naturalSize: { readonly width: number; readonly height: number },
  contentBBox: {
    readonly minX: number
    readonly maxX: number
    readonly maxY: number
  },
  visibleWidth: number,
  visibleBottomCenter: { x: number; y: number },
): { position: { x: number; y: number }; transform: { width: number } } {
  const scale = visibleWidth / (contentBBox.maxX - contentBBox.minX)
  const contentCenterX = (contentBBox.minX + contentBBox.maxX) / 2
  return {
    position: {
      x: visibleBottomCenter.x + (naturalSize.width / 2 - contentCenterX) * scale,
      y: visibleBottomCenter.y + (naturalSize.height - contentBBox.maxY) * scale,
    },
    transform: { width: naturalSize.width * scale },
  }
}

/**
 * Room-boundary (perimeter wall) collision. Floor.png's visible architectural
 * walls sit *inset* from the canonical 1920×1440 canvas edge; these four
 * insets mark the wall's *inner* edge — where the walkable tile floor
 * actually begins — measured directly from Floor.png's pixel data. Where the
 * measured inset varied along a wall, the deeper (safer) value was kept.
 *
 * Intentionally not WorldObject entries: a wall isn't a positioned, labeled,
 * asset-bearing thing the way furniture is — it resolves through the exact
 * same AABB obstacle list via `CollisionSystem.fromWorldObjects`'s
 * `extraObstacles` parameter, never a change to the collision algorithm
 * itself. This is independent, hand-authored geometry describing what the
 * art *depicts*, per COLLISION_SPEC.md "collision is independent from
 * rendering" — and it belongs to the whole world, not any single room.
 */
export const TOP_WALL_INNER_Y = 310
export const BOTTOM_WALL_INNER_Y = 1200
export const LEFT_WALL_INNER_X = 140
export const RIGHT_WALL_INNER_X = 1850

/**
 * The `door` WorldObject (entrance.ts) is decorative/physical-only — no
 * open/close/teleport behavior. It sits embedded in this same bottom wall
 * band, so the boundary stays fully solid here: no opening is carved for it.
 */
export const ROOM_BOUNDARY_COLLIDERS: readonly Collider[] = [
  // top
  { x: 0, y: 0, width: WORLD_WIDTH, height: TOP_WALL_INNER_Y },
  // bottom
  {
    x: 0,
    y: BOTTOM_WALL_INNER_Y,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT - BOTTOM_WALL_INNER_Y,
  },
  // left
  { x: 0, y: 0, width: LEFT_WALL_INNER_X, height: WORLD_HEIGHT },
  // right
  {
    x: RIGHT_WALL_INNER_X,
    y: 0,
    width: WORLD_WIDTH - RIGHT_WALL_INNER_X,
    height: WORLD_HEIGHT,
  },
]

/** The desk-body/legs area is roughly this fraction of the full rendered sprite — tuned by eye against the approved art, independently adjustable per desk later. */
export const DESK_FOOTPRINT = { widthFraction: 0.7, heightFraction: 0.32 }

/**
 * A desk's collision footprint is the physical desk/legs area near the
 * bottom of the art — not the full sprite bounds, which also cover the
 * monitors/lamp/books rising above the desktop (PHASE-10A "Collision": the
 * visual PNG bounds and collision bounds are not necessarily identical).
 * Anchored to match the sprite's own (0.5, 1) anchor: `position` is the
 * floor point, so the collider's bottom edge sits flush with `position.y`
 * and its top edge only covers a fraction of the rendered height.
 */
export function deskCollider(
  position: { x: number; y: number },
  naturalSize: { readonly width: number; readonly height: number },
  scale: number,
  footprint: { widthFraction: number; heightFraction: number },
): Collider {
  const renderedWidth = naturalSize.width * scale
  const renderedHeight = naturalSize.height * scale
  const width = renderedWidth * footprint.widthFraction
  const height = renderedHeight * footprint.heightFraction
  return {
    x: position.x - width / 2,
    y: position.y - height,
    width,
    height,
  }
}

/**
 * A collision box derived from an asset's *actual visible content*, not its
 * full (possibly padded) canvas — for art with a soft vignette border where a
 * simple bottom-anchored fraction (`deskCollider`) would be inaccurate.
 * `contentBBox` is measured once from the real pixel data and mapped into
 * world space the same way the Sprite's own (0.5, 1) anchor maps the canvas
 * into world space.
 */
export function contentAlignedCollider(
  position: { x: number; y: number },
  naturalCanvasSize: { readonly width: number; readonly height: number },
  contentBBox: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  },
  scale: number,
): Collider {
  // Anchor (0.5, 1): the canvas's horizontal center and bottom edge sit at `position`.
  const anchorX = naturalCanvasSize.width / 2
  const anchorY = naturalCanvasSize.height

  const worldX = (naturalX: number) => position.x + (naturalX - anchorX) * scale
  const worldY = (naturalY: number) => position.y + (naturalY - anchorY) * scale

  const x = worldX(contentBBox.minX)
  const y = worldY(contentBBox.minY)
  return {
    x,
    y,
    width: worldX(contentBBox.maxX) - x,
    height: worldY(contentBBox.maxY) - y,
  }
}
