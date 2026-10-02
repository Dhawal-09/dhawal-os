import { Assets, Rectangle, Texture } from 'pixi.js'
import type { Direction, SpriteSheetConfig } from './PlayerAnimator'
import { PLAYER_SPRITE_HEIGHT, WALK_ANIMATION_FPS } from './playerConstants'

/**
 * The four approved character sheets (public/assets/character/) — one
 * 2048×1152 PNG per direction, four 512×1152 walking frames left to right.
 * Served from `public/`, so referenced by URL (respecting Vite's base path)
 * rather than imported like the world artwork in assetManifest.ts.
 */
const BASE_URL = import.meta.env.BASE_URL
export const PLAYER_SHEET_URLS: Record<Direction, string> = {
  up: `${BASE_URL}assets/character/character-up.png`,
  down: `${BASE_URL}assets/character/character-down.png`,
  left: `${BASE_URL}assets/character/character-left.png`,
  right: `${BASE_URL}assets/character/character-right.png`,
}

/** Sheet layout, read directly from the source files. */
const SHEET_FRAME_WIDTH = 512
const SHEET_FRAME_HEIGHT = 1152
const FRAMES_PER_SHEET = 4

/**
 * Each frame is cropped 16px in from both sides of its 512px cell. Every
 * frame's art sits well inside that (measured: 23–497px across all 16
 * frames), so this trims only empty padding — but it drops a few stray
 * pixels the sheets carry right on the cell boundaries. Symmetric, so the
 * cropped frame's center is still the art's center (anchor x = 0.5).
 */
const FRAME_INSET_X = 16

/**
 * Feet baseline inside a frame (measured: every frame's lowest opaque row is
 * 1105, or 1113 mid-stride) and the visible art's height from head to feet
 * (≈1025). With these, `PLAYER_SPRITE_HEIGHT` is the character's real
 * on-screen height and the anchor sits exactly on the feet.
 */
const FEET_Y = 1105
const VISIBLE_ART_HEIGHT = 1025
export const PLAYER_SPRITE_ANCHOR = { x: 0.5, y: FEET_Y / SHEET_FRAME_HEIGHT }
export const PLAYER_SPRITE_SCALE = PLAYER_SPRITE_HEIGHT / VISIBLE_ART_HEIGHT

/** Frame timing/shape for `PlayerAnimator` — 4 frames per direction, looped at `WALK_ANIMATION_FPS`. */
export const PLAYER_SPRITE_SHEET: SpriteSheetConfig = {
  frameWidth: SHEET_FRAME_WIDTH,
  frameHeight: SHEET_FRAME_HEIGHT,
  framesPerState: FRAMES_PER_SHEET,
  frameDurationMs: 1000 / WALK_ANIMATION_FPS,
}

/**
 * The frame shown while standing still, per direction — there are no
 * separate idle sheets, so each direction reuses its most neutral walking
 * pose (feet together / arms down), picked by eye from the sheets: the
 * side views' narrowest frame (right #2, and left #3 — left is a mirror of
 * right), down's upright frame, and up's first frame.
 */
export const IDLE_FRAME_INDEX: Record<Direction, number> = {
  up: 0,
  down: 2,
  left: 2,
  right: 1,
}

/** Four textures per direction, sliced once and reused — never rebuilt per frame. */
export type PlayerFrames = Record<Direction, readonly Texture[]>

const DIRECTIONS = Object.keys(PLAYER_SHEET_URLS) as Direction[]

/** Sliced frames per sheet, so re-creating the scene (EXIT → START JOURNEY) reuses the same small Texture objects. */
const slicedSheets = new WeakMap<Texture, readonly Texture[]>()

function sliceSheet(sheet: Texture): readonly Texture[] {
  const cached = slicedSheets.get(sheet)
  if (cached) return cached

  const frames: Texture[] = []
  for (let index = 0; index < FRAMES_PER_SHEET; index++) {
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(
          index * SHEET_FRAME_WIDTH + FRAME_INSET_X,
          0,
          SHEET_FRAME_WIDTH - FRAME_INSET_X * 2,
          SHEET_FRAME_HEIGHT,
        ),
      }),
    )
  }
  slicedSheets.set(sheet, frames)
  return frames
}

export function createPlayerFrames(
  sheets: Record<Direction, Texture>,
): PlayerFrames {
  return {
    up: sliceSheet(sheets.up),
    down: sliceSheet(sheets.down),
    left: sliceSheet(sheets.left),
    right: sliceSheet(sheets.right),
  }
}

/**
 * The frames, only if all four sheets are already in Pixi's `Assets` cache —
 * which they are once `preloadWorldAssets` has run (GameApp.create), so the
 * player is built with its real art from the very first frame. Synchronous
 * so `GameScene`'s constructor doesn't have to become async.
 */
export function getCachedPlayerFrames(): PlayerFrames | null {
  const sheets: Partial<Record<Direction, Texture>> = {}
  for (const direction of DIRECTIONS) {
    const url = PLAYER_SHEET_URLS[direction]
    if (!Assets.cache.has(url)) return null
    sheets[direction] = Assets.get<Texture>(url)
  }
  return createPlayerFrames(sheets as Record<Direction, Texture>)
}

/** Loads (or reuses) the four sheets and slices them. Rejects if any sheet fails to load. */
export async function loadPlayerFrames(): Promise<PlayerFrames> {
  const textures = await Promise.all(
    DIRECTIONS.map((direction) =>
      Assets.load<Texture>(PLAYER_SHEET_URLS[direction]),
    ),
  )
  const sheets = {} as Record<Direction, Texture>
  DIRECTIONS.forEach((direction, i) => {
    sheets[direction] = textures[i]
  })
  return createPlayerFrames(sheets)
}
