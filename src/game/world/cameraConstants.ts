/**
 * The two camera modes (CAMERA_SPEC.md). A const object rather than a TS
 * `enum` — the project compiles with `erasableSyntaxOnly`.
 *
 * - EXPLORE: default gameplay. Zoomed in around the player, smooth
 *   deadzone follow.
 * - OVERVIEW: the whole 1920×1440 world fitted to the viewport (zoom 1.0),
 *   centered on the world — the same world, just a different transform.
 */
export const CameraMode = {
  EXPLORE: 'explore',
  OVERVIEW: 'overview',
} as const
export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode]

/**
 * All camera tuning in one place. Zoom values are relative to the
 * "overview" scale — the uniform contain fit of the whole world into the
 * current viewport — so `1.0` always means "entire world visible" and the
 * same zoom reads consistently across screen sizes.
 */
export const CAMERA_CONFIG = {
  /** Default gameplay zoom. Clamped to `exploreZoomRange` — tune within it. */
  exploreZoom: 2,
  exploreZoomRange: { min: 1.35, max: 2.5 },
  /** Whole-world fit. */
  overviewZoom: 1.0,
  /**
   * Absolute floor for the EXPLORE world scale (world units → CSS px). On a
   * phone the contain fit is tiny (~0.2 on a 390px-wide portrait screen),
   * so even the explore zoom of it would be unreadable; EXPLORE never
   * renders below this. OVERVIEW is exempt — it always fits the whole
   * world.
   */
  minExploreScale: 0.6,
  /** Duration of the EXPLORE ⇄ OVERVIEW zoom/pan transition. */
  zoomTransitionMs: 450,
  /**
   * Exponential follow time constant (ms). Each frame closes
   * `1 - exp(-deltaMS / followSmoothingMs)` of the gap, so the feel is
   * frame-rate independent. At walking speed (220 units/s) the camera
   * trails the deadzone edge by ≈ speed × this ≈ 30 world units.
   */
  followSmoothingMs: 140,
  /**
   * Deadzone half-size in CSS pixels around the viewport center, capped at
   * `maxViewportFraction` of the viewport so small screens keep a
   * proportionally small one.
   */
  deadzone: { x: 48, y: 36, maxViewportFraction: 0.1 },
  /** Below this distance (world units) the follow snaps onto its target and stops moving. */
  settleEpsilon: 0.05,
} as const
