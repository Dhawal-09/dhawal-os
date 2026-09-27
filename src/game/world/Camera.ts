import type { Container } from 'pixi.js'
import { CAMERA_CONFIG, CameraMode } from './cameraConstants'

export interface CameraBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Snapshot for the dev-only camera debug overlay. */
export interface CameraDebugState {
  mode: CameraMode
  zoom: number
  scale: number
  cameraX: number
  cameraY: number
  viewportWidth: number
  viewportHeight: number
  worldWidth: number
  worldHeight: number
  bounds: CameraBounds
}

interface Transition {
  elapsedMS: number
  fromZoom: number
  fromX: number
  fromY: number
}

/**
 * The single camera for the canonical world (see CAMERA_SPEC.md). It only
 * ever writes the World container's scale and position — one renderer, one
 * world, one set of sprites. The React HUD and panels live outside Pixi and
 * stay screen-space.
 *
 * Two modes (`CameraMode`):
 * - EXPLORE — zoomed in (`CAMERA_CONFIG.exploreZoom`); `follow()` reports
 *   the player, `update()` eases toward it through a small deadzone with
 *   frame-rate-independent smoothing.
 * - OVERVIEW — zoom 1.0 (the whole world contain-fitted), centered on the
 *   world, not the player.
 *
 * Switching modes runs one eased zoom + pan transition. Returning to
 * EXPLORE pans back onto the follow point — the player's position is never
 * touched.
 *
 * `cameraX`/`cameraY` is the world point drawn at the viewport center,
 * always clamped so the view never shows space beyond the world. On an axis
 * where the scaled world is smaller than the viewport, that axis is locked
 * to the world's center (letterboxed).
 */
export class Camera {
  private readonly target: Container
  private readonly worldWidth: number
  private readonly worldHeight: number

  private viewportWidth = 0
  private viewportHeight = 0
  /** World scale at zoom 1.0 — the uniform contain fit for the current viewport. */
  private overviewScale = 1

  private currentMode: CameraMode = CameraMode.EXPLORE
  /** Zoom relative to `overviewScale`; the rendered scale is `overviewScale * zoom`. */
  private zoom = 1
  private transition: Transition | null = null

  /** Current camera center, world space. */
  private cameraX: number
  private cameraY: number
  /** Last reported follow point (normally the player), world space. */
  private focusX: number
  private focusY: number
  /** False until the first valid `resize()` — that one snaps straight onto the focus (spawn framing). */
  private initialized = false

  constructor(target: Container, worldWidth: number, worldHeight: number) {
    this.target = target
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.focusX = this.cameraX = worldWidth / 2
    this.focusY = this.cameraY = worldHeight / 2
  }

  get mode(): CameraMode {
    return this.currentMode
  }

  /** True while an EXPLORE ⇄ OVERVIEW transition is running. */
  get transitioning(): boolean {
    return this.transition !== null
  }

  /**
   * Recomputes scale and bounds for the given viewport (CSS pixel)
   * dimensions — call on every GameCanvas resize. The first call snaps onto
   * the focus point; later calls keep the mode and the current camera
   * position, only re-clamping it to the new bounds (no teleport).
   */
  resize(viewportWidth: number, viewportHeight: number): void {
    if (viewportWidth <= 0 || viewportHeight <= 0) return
    this.viewportWidth = viewportWidth
    this.viewportHeight = viewportHeight
    this.overviewScale = Math.min(
      viewportWidth / this.worldWidth,
      viewportHeight / this.worldHeight,
    )

    if (!this.initialized) {
      this.initialized = true
      this.zoom = this.targetZoom()
      this.cameraX = this.clampX(this.focusX)
      this.cameraY = this.clampY(this.focusY)
      this.apply()
      return
    }
    // A resize changes what the explore zoom / scale floor resolve to;
    // mid-transition, the next `update()` re-derives the zoom anyway.
    if (!this.transition) this.zoom = this.targetZoom()
    this.cameraX = this.clampX(this.cameraX)
    this.cameraY = this.clampY(this.cameraY)
    this.apply()
  }

  /**
   * Reports the world-space point EXPLORE mode follows (the player). Cheap —
   * the actual movement happens in `update()`.
   */
  follow(worldX: number, worldY: number): void {
    this.focusX = worldX
    this.focusY = worldY
  }

  /** Starts a smooth transition into `mode`. No-op if already there (or heading there). */
  setMode(mode: CameraMode): void {
    if (mode === this.currentMode) return
    this.currentMode = mode
    this.transition = {
      elapsedMS: 0,
      fromZoom: this.zoom,
      fromX: this.cameraX,
      fromY: this.cameraY,
    }
  }

  /** Advances the camera by one frame. Called from the Pixi ticker (GameScene.update). */
  update(deltaMS: number): void {
    if (!this.initialized || deltaMS <= 0) return

    const prevZoom = this.zoom
    let nextX: number
    let nextY: number

    if (this.transition) {
      const tr = this.transition
      tr.elapsedMS += deltaMS
      const progress = Math.min(
        1,
        tr.elapsedMS / CAMERA_CONFIG.zoomTransitionMs,
      )
      const eased = easeInOutCubic(progress)
      const endZoom = this.targetZoom()
      // Set before clamping below — bounds depend on the in-flight scale.
      this.zoom = lerp(tr.fromZoom, endZoom, eased)
      const [toX, toY] = this.modeTarget(endZoom)
      nextX = lerp(tr.fromX, toX, eased)
      nextY = lerp(tr.fromY, toY, eased)
      if (progress >= 1) this.transition = null
    } else if (this.currentMode === CameraMode.EXPLORE) {
      const t = 1 - Math.exp(-deltaMS / CAMERA_CONFIG.followSmoothingMs)
      nextX = approach(
        this.cameraX,
        deadzoneTarget(this.cameraX, this.focusX, this.deadzoneHalf('x')),
        t,
      )
      nextY = approach(
        this.cameraY,
        deadzoneTarget(this.cameraY, this.focusY, this.deadzoneHalf('y')),
        t,
      )
    } else {
      nextX = this.worldWidth / 2
      nextY = this.worldHeight / 2
    }

    nextX = this.clampX(nextX)
    nextY = this.clampY(nextY)
    if (
      nextX === this.cameraX &&
      nextY === this.cameraY &&
      this.zoom === prevZoom
    ) {
      return
    }
    this.cameraX = nextX
    this.cameraY = nextY
    this.apply()
  }

  /** The valid range of camera centers at the current scale — world space. */
  get bounds(): CameraBounds {
    const [minX, maxX] = axisRange(
      this.viewportWidth,
      this.worldWidth,
      this.scale,
    )
    const [minY, maxY] = axisRange(
      this.viewportHeight,
      this.worldHeight,
      this.scale,
    )
    return { minX, maxX, minY, maxY }
  }

  get debugState(): CameraDebugState {
    return {
      mode: this.currentMode,
      zoom: this.zoom,
      scale: this.scale,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      bounds: this.bounds,
    }
  }

  private get scale(): number {
    return this.overviewScale * this.zoom
  }

  /** The zoom the current mode settles at, for the current viewport. */
  private targetZoom(): number {
    if (this.currentMode === CameraMode.OVERVIEW) {
      return CAMERA_CONFIG.overviewZoom
    }
    const { exploreZoom, exploreZoomRange, minExploreScale } = CAMERA_CONFIG
    const zoom = Math.min(
      exploreZoomRange.max,
      Math.max(exploreZoomRange.min, exploreZoom),
    )
    return Math.max(zoom, minExploreScale / this.overviewScale)
  }

  /**
   * Where the current mode wants the camera at the end of a transition,
   * clamped for the scale it will end at: the world center for OVERVIEW,
   * the follow point for EXPLORE.
   */
  private modeTarget(endZoom: number): [number, number] {
    if (this.currentMode === CameraMode.OVERVIEW) {
      return [this.worldWidth / 2, this.worldHeight / 2]
    }
    const endScale = this.overviewScale * endZoom
    return [
      clampAxis(this.focusX, this.viewportWidth, this.worldWidth, endScale),
      clampAxis(this.focusY, this.viewportHeight, this.worldHeight, endScale),
    ]
  }

  private deadzoneHalf(axis: 'x' | 'y'): number {
    const { deadzone } = CAMERA_CONFIG
    const viewport = axis === 'x' ? this.viewportWidth : this.viewportHeight
    return (
      Math.min(deadzone[axis], viewport * deadzone.maxViewportFraction) /
      this.scale
    )
  }

  private clampX(x: number): number {
    return clampAxis(x, this.viewportWidth, this.worldWidth, this.scale)
  }

  private clampY(y: number): number {
    return clampAxis(y, this.viewportHeight, this.worldHeight, this.scale)
  }

  /**
   * Writes the transform onto the World container. Offsets are whole CSS
   * pixels so the nearest-neighbour pixel art never lands on a subpixel
   * boundary while the camera glides.
   */
  private apply(): void {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return
    this.target.scale.set(this.scale)
    this.target.position.set(
      this.pixelOffset(this.viewportWidth, this.worldWidth, this.cameraX),
      this.pixelOffset(this.viewportHeight, this.worldHeight, this.cameraY),
    )
  }

  /**
   * Whole-pixel draw offset for one axis. When the world overflows the
   * viewport, rounding is kept inside `[viewport - scaledWorld, 0]` so a
   * fractional scale can never expose a sliver beyond the world edge.
   */
  private pixelOffset(
    viewportSize: number,
    worldSize: number,
    camera: number,
  ): number {
    const offset = Math.round(viewportSize / 2 - camera * this.scale)
    const scaledWorldSize = worldSize * this.scale
    if (scaledWorldSize < viewportSize) return offset
    return Math.min(
      0,
      Math.max(Math.ceil(viewportSize - scaledWorldSize), offset),
    )
  }
}

/**
 * [min, max] camera center on one axis so the view never shows space
 * beyond the world. If the scaled world fits the viewport on this axis,
 * both are the world's center (letterboxed, no panning).
 */
function axisRange(
  viewportSize: number,
  worldSize: number,
  scale: number,
): [number, number] {
  const halfView = viewportSize / scale / 2
  if (halfView * 2 >= worldSize) return [worldSize / 2, worldSize / 2]
  return [halfView, worldSize - halfView]
}

function clampAxis(
  value: number,
  viewportSize: number,
  worldSize: number,
  scale: number,
): number {
  const [min, max] = axisRange(viewportSize, worldSize, scale)
  return Math.min(Math.max(value, min), max)
}

/** Where the camera center must be for `focus` to sit on the deadzone's edge (unchanged if it's inside). */
function deadzoneTarget(camera: number, focus: number, half: number): number {
  if (focus > camera + half) return focus - half
  if (focus < camera - half) return focus + half
  return camera
}

/** One smoothing step from `current` toward `target`, snapping once within `settleEpsilon`. */
function approach(current: number, target: number, t: number): number {
  const next = current + (target - current) * t
  return Math.abs(target - next) < CAMERA_CONFIG.settleEpsilon ? target : next
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}
