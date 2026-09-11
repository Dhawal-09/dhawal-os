import { describe, expect, it } from 'vitest'
import { WORLD_HEIGHT, WORLD_WIDTH } from './worldConstants'

describe('worldConstants (PHASE 10B world expansion)', () => {
  it('the canonical world is 1920x1440', () => {
    expect(WORLD_WIDTH).toBe(1920)
    expect(WORLD_HEIGHT).toBe(1440)
  })

  it('world bounds are positive and well-formed', () => {
    expect(WORLD_WIDTH).toBeGreaterThan(0)
    expect(WORLD_HEIGHT).toBeGreaterThan(0)
    expect(Number.isFinite(WORLD_WIDTH)).toBe(true)
    expect(Number.isFinite(WORLD_HEIGHT)).toBe(true)
  })
})
