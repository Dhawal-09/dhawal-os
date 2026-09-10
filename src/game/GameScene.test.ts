import { describe, expect, it } from 'vitest'
import { GameScene } from './GameScene'
import { World } from './world/World'

describe('GameScene', () => {
  it('is labeled and mounts exactly the World', () => {
    const scene = new GameScene()

    expect(scene.label).toBe('GameScene')
    expect(scene.world).toBeInstanceOf(World)
    expect(scene.children).toHaveLength(1)
    expect(scene.children[0]).toBe(scene.world)
  })

  it('resize does not throw and is safe to call before/after any viewport size', () => {
    const scene = new GameScene()

    expect(() => {
      scene.resize(1280, 720)
      scene.resize(0, 0)
      scene.resize(390, 844)
    }).not.toThrow()
  })

  it('update does not throw before any systems are attached', () => {
    const scene = new GameScene()

    expect(() => scene.update(16.6)).not.toThrow()
  })
})
