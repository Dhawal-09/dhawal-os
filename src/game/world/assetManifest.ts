import deskLaptopUrl from '../../../assets/world/furniture/desk_laptop.png'
import deskEducationUrl from '../../../assets/world/furniture/desk_education.png'
import deskResumeUrl from '../../../assets/world/furniture/desk_resume_original.png'
import bedUrl from '../../../assets/world/structural/Bed.png'
import doorUrl from '../../../assets/world/structural/door.png'
import floorUrl from '../../../assets/world/structural/Background2.png'
import kitchenMainCounterUrl from '../../../assets/world/Kitchen/MainTable.png'
import kitchenSideCounterUrl from '../../../assets/world/Kitchen/Main table2.png'
import kitchenFridgeUrl from '../../../assets/world/Kitchen/Fridge1.png'
import kitchenCooktopUrl from '../../../assets/world/Kitchen/Stove.png'
import kitchenCoffeeMachineUrl from '../../../assets/world/Kitchen/coffee-Makaer.png'
import kitchenHangingPansUrl from '../../../assets/world/Kitchen/Hanging Pans.png'
import kitchenWallShelfUrl from '../../../assets/world/Kitchen/Jars.png'
import kitchenDiningSetUrl from '../../../assets/world/Kitchen/Dining.png'
import kitchenLightUrl from '../../../assets/world/Kitchen/Right.png'
import kitchenPropHolderUrl from '../../../assets/world/Kitchen/Utensil/holder.png'
import kitchenPropSaltUrl from '../../../assets/world/Kitchen/Utensil/salt.png'
import kitchenPropBowlUrl from '../../../assets/world/Kitchen/Utensil/bowl.png'
import kitchenPropPlateUrl from '../../../assets/world/Kitchen/Utensil/plate.png'

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
  // Kitchen furniture placement pass — approved art dropped into the
  // existing tiled-floor kitchen nook of Background2.png, right of the
  // main work desk. Visual only this phase (worldObjects.ts).
  'kitchen.mainCounter': kitchenMainCounterUrl,
  'kitchen.sideCounter': kitchenSideCounterUrl,
  'kitchen.fridge': kitchenFridgeUrl,
  'kitchen.cooktop': kitchenCooktopUrl,
  'kitchen.coffeeMachine': kitchenCoffeeMachineUrl,
  'kitchen.hangingPans': kitchenHangingPansUrl,
  'kitchen.wallShelf': kitchenWallShelfUrl,
  'kitchen.diningSet': kitchenDiningSetUrl,
  'kitchen.light': kitchenLightUrl,
  'kitchen.propHolder': kitchenPropHolderUrl,
  'kitchen.propSalt': kitchenPropSaltUrl,
  'kitchen.propBowl': kitchenPropBowlUrl,
  'kitchen.propPlate': kitchenPropPlateUrl,
}

export function getFurnitureAssetUrl(assetId: string): string | undefined {
  return ASSET_MANIFEST[assetId]
}
