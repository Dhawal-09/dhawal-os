import { describe, expect, it } from 'vitest'
import { ASSET_MANIFEST, getFurnitureAssetUrl } from './assetManifest'

describe('assetManifest', () => {
  it('maps both approved desk asset ids to a resolved, non-empty URL', () => {
    const deskAssetIds = ['furniture.mainWorkDesk', 'furniture.educationDesk']

    for (const id of deskAssetIds) {
      const url = getFurnitureAssetUrl(id)
      expect(typeof url).toBe('string')
      expect(url!.length).toBeGreaterThan(0)
    }
  })

  it('maps both approved structural (bed, door) asset ids to a resolved, non-empty URL (PHASE 09.1)', () => {
    for (const id of ['structural.bed', 'structural.door']) {
      const url = getFurnitureAssetUrl(id)
      expect(typeof url).toBe('string')
      expect(url!.length).toBeGreaterThan(0)
    }
  })

  it('maps the approved floor/background asset id to a resolved, non-empty URL (PHASE 10B)', () => {
    const url = getFurnitureAssetUrl('structural.floor')
    expect(typeof url).toBe('string')
    expect(url!.length).toBeGreaterThan(0)
  })

  it('returns undefined for an asset id with no approved art yet (content areas keep their dev placeholder)', () => {
    expect(getFurnitureAssetUrl('content.projects')).toBeUndefined()
    expect(getFurnitureAssetUrl('nonexistent.asset')).toBeUndefined()
  })

  it('every manifest value is unique — no two logical asset ids point at the same file by mistake', () => {
    const urls = Object.values(ASSET_MANIFEST)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
