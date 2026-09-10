/**
 * Canonical world coordinate system (see WORLD_SPEC.md). All world-object
 * positions are authored in this space, never in raw screen/viewport pixels.
 */
export const WORLD_WIDTH = 1440
export const WORLD_HEIGHT = 1024

/**
 * Draw-order layers (see WORLD_SPEC.md "World layers"). `player` has no
 * corresponding WorldObject entry — it is reserved for Phase 05 to attach
 * the player display object at the correct depth between objects and
 * foreground.
 */
export type WorldLayer = 'background' | 'object' | 'foreground'
