import { CameraMode } from '../../game/world/cameraConstants'

export interface CameraViewOption {
  mode: CameraMode
  title: string
  /** Label in the in-game HUD camera selector. */
  hudTitle: string
  /** Card copy on the View Selection screen. */
  description: string
  /** Shorter copy for the in-game HUD camera selector. */
  shortDescription: string
  /** A real screenshot of the world at this camera mode (public/assets/opening/). */
  previewSrc: string
}

/** The two camera modes as presented to the visitor — shared by ViewSelectScreen and the HUD selector. */
export const CAMERA_VIEW_OPTIONS: readonly CameraViewOption[] = [
  {
    mode: CameraMode.EXPLORE,
    title: 'EXPLORE VIEW',
    hudTitle: 'EXPLORE',
    description: 'Detailed player-focused view',
    shortDescription: 'Detailed player view',
    previewSrc: '/assets/opening/view-explore.png',
  },
  {
    mode: CameraMode.OVERVIEW,
    title: 'OVERVIEW',
    hudTitle: 'OVERVIEW',
    description: 'See the entire DHAWAL.OS world',
    shortDescription: 'Full house view',
    previewSrc: '/assets/opening/view-overview.png',
  },
]
