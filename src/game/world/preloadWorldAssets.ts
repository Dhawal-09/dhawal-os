import { Assets } from 'pixi.js'
import { PLAYER_SHEET_URLS } from '../player/playerAnimations'
import { ASSET_MANIFEST } from './assetManifest'

/**
 * Longest the boot sequence will wait on the world's artwork. A stalled or
 * very slow connection must never leave the visitor stuck on the loading
 * screen forever — past this the game opens anyway and any still-pending
 * object upgrades from its dev placeholder as soon as its own texture lands
 * (see WorldObject.ts `upgradeToSprite`).
 */
const PRELOAD_TIMEOUT_MS = 30_000

/**
 * Loads every approved world asset into Pixi's shared `Assets` cache before
 * the engine reports ready. Without this, the boot screen only waited on the
 * renderer itself — on a cold first load (empty browser cache, freshly
 * started dev server) the ~70 PNGs were still streaming in while the game
 * was already revealed, so the visitor saw the flat magenta placeholders
 * instead of the room. Once these resolve, every `Assets.load(url)` made
 * later by `World` is an instant cache hit.
 *
 * Never rejects: one missing/broken file must not take the whole world down,
 * so failures are left for `upgradeToSprite`'s own fallback (the placeholder
 * simply stays visible for that one object).
 */
export async function preloadWorldAssets(
  urls: readonly string[] = [
    ...Object.values(ASSET_MANIFEST),
    ...Object.values(PLAYER_SHEET_URLS), // the character sheets (public/assets/character/)
  ],
): Promise<void> {
  const uniqueUrls = [...new Set(urls)]

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, PRELOAD_TIMEOUT_MS)
  })

  try {
    await Promise.race([
      Promise.allSettled(uniqueUrls.map((url) => Assets.load(url))),
      timeout,
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}
