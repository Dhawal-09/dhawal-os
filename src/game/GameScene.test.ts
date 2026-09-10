import { describe, expect, it } from 'vitest'
import { GameScene } from './GameScene'

describe('GameScene', () => {
  it('is labeled and starts with no children', () => {
    const scene = new GameScene()

    expect(scene.label).toBe('GameScene')
    expect(scene.children).toHaveLength(0)
  })

  it('update does not throw before any systems are attached', () => {
    const scene = new GameScene()

    expect(() => scene.update(16.6)).not.toThrow()
  })
})
