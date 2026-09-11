import deskLaptopUrl from '../../../assets/world/furniture/desk_laptop.png'
import deskEducationUrl from '../../../assets/world/furniture/desk_education.png'
import deskResumeUrl from '../../../assets/world/furniture/desk_resume_original.png'
import bedUrl from '../../../assets/world/structural/Bed.png'
import doorUrl from '../../../assets/world/structural/door.png'
import floorUrl from '../../../assets/world/structural/Floor.png'

/**
 * Maps a WorldObject's stable logical `asset` id (see WorldObject.ts) to the
 * real, approved PNG that ships it (PHASE-10A). An id with no entry here
 * simply keeps rendering as the Phase 04 dev placeholder — adding a mapping
 * is the only step required to "go live" with real art; nothing in
 * World.ts or the object's own configuration has to change.
 *
 * Source files live in the repo-root `assets/` directory (not `public/` or
 * `src/`) and are pulled in here via a plain Vite asset import so the
 * original PNGs are never copied, moved, or re-encoded.
 */
export const ASSET_MANIFEST: Record<string, string> = {
  'furniture.mainWorkDesk': deskLaptopUrl,
  'furniture.educationDesk': deskEducationUrl,
  'furniture.resumeDesk': deskResumeUrl,
  // PHASE 09.1
  'structural.bed': bedUrl,
  'structural.door': doorUrl,
  // PHASE 10B — the room's floor/background artwork (worldPlaceholders.ts).
  'structural.floor': floorUrl,
}

export function getFurnitureAssetUrl(assetId: string): string | undefined {
  return ASSET_MANIFEST[assetId]
}
