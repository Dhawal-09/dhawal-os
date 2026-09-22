import { Texture, TextureSource } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import type { Direction } from './PlayerAnimator'
import {
  createPlayerFrames,
  IDLE_FRAME_INDEX,
  PLAYER_SHEET_URLS,
  PLAYER_SPRITE_ANCHOR,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_SHEET,
} from './playerAnimations'
import { PLAYER_SPRITE_HEIGHT, WALK_ANIMATION_FPS } from './playerConstants'

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

/** Four stand-in sheet textures with the real sheet dimensions (a 2048×1152 source). */
function fakeSheets(): Record<Direction, Texture> {
  const sheets = {} as Record<Direction, Texture>
  for (const direction of DIRECTIONS) {
    sheets[direction] = new Texture({
      source: new TextureSource({ width: 2048, height: 1152 }),
    })
  }
  return sheets
}

describe('player character sheets', () => {
  it('points at the four directional sheets in public/assets/character/', () => {
    for (const direction of DIRECTIONS) {
      expect(PLAYER_SHEET_URLS[direction]).toMatch(
        new RegExp(`assets/character/character-${direction}\\.png$`),
      )
    }
  })

  it('walks at a sensible cadence (6–10 fps), independent of movement speed', () => {
    expect(WALK_ANIMATION_FPS).toBeGreaterThanOrEqual(6)
    expect(WALK_ANIMATION_FPS).toBeLessThanOrEqual(10)
    expect(PLAYER_SPRITE_SHEET.frameDurationMs).toBeCloseTo(
      1000 / WALK_ANIMATION_FPS,
    )
    expect(PLAYER_SPRITE_SHEET.framesPerState).toBe(4)
  })

  it('slices each sheet into 4 distinct frames, left to right, on the 512px grid', () => {
    const frames = createPlayerFrames(fakeSheets())

    for (const direction of DIRECTIONS) {
      expect(frames[direction]).toHaveLength(4)
      expect(new Set(frames[direction]).size).toBe(4)

      frames[direction].forEach((texture, index) => {
        // Cropped 16px in from each side of its 512px cell, full 1152px tall.
        expect(texture.frame.x).toBe(index * 512 + 16)
        expect(texture.frame.width).toBe(480)
        expect(texture.frame.height).toBe(1152)
      })
    }
  })

  it('reuses the same sliced textures for the same sheet — nothing is rebuilt on a later scene', () => {
    const sheets = fakeSheets()

    expect(createPlayerFrames(sheets).down).toBe(
      createPlayerFrames(sheets).down,
    )
  })

  it('every direction has a valid idle frame', () => {
    for (const direction of DIRECTIONS) {
      expect(IDLE_FRAME_INDEX[direction]).toBeGreaterThanOrEqual(0)
      expect(IDLE_FRAME_INDEX[direction]).toBeLessThan(4)
    }
  })

  it('sizes and anchors the sprite so its feet stand on the anchor point at the configured height', () => {
    // Feet baseline is measured at row 1105 of the 1152px frames; the
    // visible art (head→feet) is ≈1025px tall.
    expect(PLAYER_SPRITE_ANCHOR.x).toBe(0.5)
    expect(PLAYER_SPRITE_ANCHOR.y).toBeCloseTo(1105 / 1152)
    expect(1025 * PLAYER_SPRITE_SCALE).toBeCloseTo(PLAYER_SPRITE_HEIGHT)
  })
})
