import deskLaptopUrl from '../../../assets/world/furniture/desk_laptop.png'
import deskEducationUrl from '../../../assets/world/furniture/desk_education.png'
import deskResumeUrl from '../../../assets/world/furniture/desk_resume_original.png'
import gamingChairUrl from '../../../assets/world/furniture/GamingChair.png'
import bedUrl from '../../../assets/world/structural/Double_bed.png'
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
import bedroomArtUrl from '../../../assets/world/BedRoom/Art.png'
import bedroomWallLampUrl from '../../../assets/world/BedRoom/Bedroomlight.png'
import bedroomJerseyRackUrl from '../../../assets/world/BedRoom/ClothStand.png'
import bedroomHangingShelfUrl from '../../../assets/world/BedRoom/Hanging Shelf.png'
import bedroomBeanbagUrl from '../../../assets/world/BedRoom/SittingRug.png'
import livingTvConsoleUrl from '../../../assets/world/ExpiernceRoom/BelowTv.png'
import livingStorageCabinetUrl from '../../../assets/world/ExpiernceRoom/Desk.png'
import livingRugUrl from '../../../assets/world/ExpiernceRoom/Rug.png'
import livingBookshelfUrl from '../../../assets/world/ExpiernceRoom/Shelf.png'
import livingTvUrl from '../../../assets/world/ExpiernceRoom/TV.png'
import livingBigPlantUrl from '../../../assets/world/special/Big plant.png'
import hobbiesDumbbellRackUrl from '../../../assets/world/HobbiesRoom/Dumbel rack.png'
import hobbiesGymStationUrl from '../../../assets/world/HobbiesRoom/workout-Photoroom.png'
import hobbiesGymFloorUrl from '../../../assets/world/HobbiesRoom/GymFloor.png'
import hobbiesTransitionTrimUrl from '../../../assets/world/HobbiesRoom/TransitionTrim.png'
import hobbiesJerseyUrl from '../../../assets/world/HobbiesRoom/Jersey.png'
import hobbiesScarfUrl from '../../../assets/world/HobbiesRoom/Scarf.png'
import hobbiesArtworkUrl from '../../../assets/world/HobbiesRoom/Artwork.png'
import hobbiesFootballRackUrl from '../../../assets/world/HobbiesRoom/Rack.png'
import hobbiesStorageUrl from '../../../assets/world/HobbiesRoom/Storage2.png'

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
  'furniture.gamingChair': gamingChairUrl,
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
  // Bedroom asset-integration pass — visual placement only (see bedroomRoom.ts).
  'bedroom.art': bedroomArtUrl,
  'bedroom.wallLamp': bedroomWallLampUrl,
  'bedroom.jerseyRack': bedroomJerseyRackUrl,
  'bedroom.hangingShelf': bedroomHangingShelfUrl,
  'bedroom.beanbag': bedroomBeanbagUrl,
  // Experience/living-room asset-integration pass (see livingRoom.ts).
  'living.tvConsole': livingTvConsoleUrl,
  'living.storageCabinet': livingStorageCabinetUrl,
  'living.rug': livingRugUrl,
  'living.bookshelf': livingBookshelfUrl,
  'living.tv': livingTvUrl,
  'living.bigPlant': livingBigPlantUrl,
  // Hobbies/gym asset-integration pass (see hobbiesRoom.ts).
  'hobbies.dumbbellRack': hobbiesDumbbellRackUrl,
  'hobbies.gymStation': hobbiesGymStationUrl,
  'hobbies.gymFloor': hobbiesGymFloorUrl,
  'hobbies.transitionTrim': hobbiesTransitionTrimUrl,
  'hobbies.jersey': hobbiesJerseyUrl,
  'hobbies.scarf': hobbiesScarfUrl,
  'hobbies.artwork': hobbiesArtworkUrl,
  'hobbies.footballRack': hobbiesFootballRackUrl,
  'hobbies.storage': hobbiesStorageUrl,
}

export function getFurnitureAssetUrl(assetId: string): string | undefined {
  return ASSET_MANIFEST[assetId]
}
