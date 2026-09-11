/**
 * Canonical world coordinate system (see WORLD_SPEC.md). All world-object
 * positions are authored in this space, never in raw screen/viewport pixels.
 *
 * PHASE 10B: expanded from 1440×1024 to 1920×1440 — a genuinely larger
 * explorable room. The browser viewport never defines this; Camera.ts fits
 * a *view into* this fixed space (see CAMERA_SPEC.md).
 */
export const WORLD_WIDTH = 1920
export const WORLD_HEIGHT = 1440

/**
 * Draw-order layers (see WORLD_SPEC.md "World layers"). `player` has no
 * corresponding WorldObject entry — it is reserved for Phase 05 to attach
 * the player display object at the correct depth between objects and
 * foreground.
 */
export type WorldLayer = 'background' | 'object' | 'foreground'
