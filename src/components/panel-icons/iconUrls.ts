import { useEffect, useState } from 'react'

/** Icon filename -> served URL. */
export type IconUrls = Readonly<Record<string, string>>

export type IconUrlLoader = () => Promise<IconUrls>

/**
 * Turns an eager `import.meta.glob(..., { query: '?url' })` result into a
 * filename-keyed map. Each panel keeps its own tiny `*IconUrls.ts` module
 * built with this, and nothing imports those modules statically — they are
 * only ever reached through `useIconUrls`.
 */
export function toIconUrls(modules: Record<string, string>): IconUrls {
  return Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [
      path.slice(path.lastIndexOf('/') + 1),
      url,
    ]),
  )
}

/** Resolved maps, kept so a re-opened panel renders its icons synchronously. */
const resolved = new Map<IconUrlLoader, IconUrls>()

/**
 * Loads a panel's icon URL map the first time that panel mounts, and never
 * before: neither the map nor any icon is requested during landing, boot,
 * access, view select or the game world. Returns `null` until the map
 * arrives (the panel still lays out fully from each icon's native size);
 * later openings get it immediately and the browser's HTTP cache serves the
 * images. `load` must be a stable, module-level function.
 */
export function useIconUrls(load: IconUrlLoader): IconUrls | null {
  const [urls, setUrls] = useState<IconUrls | null>(
    () => resolved.get(load) ?? null,
  )

  useEffect(() => {
    if (urls) return
    let cancelled = false
    load().then(
      (loaded) => {
        resolved.set(load, loaded)
        if (!cancelled) setUrls(loaded)
      },
      () => {
        // The chunk failed to load (offline): the sized icon slots stay empty.
      },
    )
    return () => {
      cancelled = true
    }
  }, [load, urls])

  return urls
}
