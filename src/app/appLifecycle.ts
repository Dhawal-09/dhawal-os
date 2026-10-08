/**
 * The application's small, explicit lifecycle (PHASE-08.5 "Application
 * states"). A plain reducer, not a state-machine library — the smallest
 * mechanism that fits: LANDING -> VIEW_SELECT -> LOADING -> GAME, with an
 * ERROR branch that can retry back to LOADING, and an EXIT branch (GAME ->
 * LANDING, PHASE-08.5 follow-up "Session persistence + exit flow") once the
 * visitor confirms they want to leave. Illegal transitions (e.g. a stray
 * "ready" signal arriving after the app already moved to ERROR) are ignored
 * rather than throwing, since they can genuinely race against an
 * unmount/retry.
 *
 * VIEW_SELECT (ViewSelectScreen.tsx) comes straight after START JOURNEY —
 * it never waits on the game, and the engine does not exist yet. The
 * visitor picks the starting camera mode (EXPLORE / OVERVIEW) while the
 * game's assets download in the background, and `VIEW_SELECTED` moves
 * VIEW_SELECT -> LOADING.
 *
 * LOADING (the DHAWAL.OS initialization screen, BootScreen.tsx) is where the
 * engine is created and the only state that waits on it: `GAME_READY`
 * moves LOADING -> GAME, and
 * `GAME_ERROR` moves LOADING -> ERROR. A refresh mid-game starts here,
 * skipping LANDING and VIEW_SELECT — the camera can still be switched from
 * the HUD.
 */
export type AppLifecycleState =
  'landing' | 'view-select' | 'loading' | 'game' | 'error'

export type AppLifecycleAction =
  | { type: 'START_JOURNEY' }
  | { type: 'VIEW_SELECTED' }
  | { type: 'GAME_READY' }
  | { type: 'GAME_ERROR' }
  | { type: 'RETRY' }
  | { type: 'EXIT' }

export const INITIAL_APP_LIFECYCLE_STATE: AppLifecycleState = 'landing'

export function appLifecycleReducer(
  state: AppLifecycleState,
  action: AppLifecycleAction,
): AppLifecycleState {
  switch (action.type) {
    case 'START_JOURNEY':
      return state === 'landing' ? 'view-select' : state
    case 'VIEW_SELECTED':
      return state === 'view-select' ? 'loading' : state
    case 'GAME_READY':
      return state === 'loading' ? 'game' : state
    case 'GAME_ERROR':
      return state === 'loading' ? 'error' : state
    case 'RETRY':
      return state === 'error' ? 'loading' : state
    case 'EXIT':
      return state === 'game' ? 'landing' : state
    default:
      return state
  }
}
