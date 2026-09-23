/**
 * The application's small, explicit lifecycle (PHASE-08.5 "Application
 * states"). A plain reducer, not a state-machine library — the smallest
 * mechanism that fits: LANDING -> LOADING -> ACCESS -> GAME, with an ERROR
 * branch that can retry back to LOADING, and an EXIT branch (GAME ->
 * LANDING, PHASE-08.5 follow-up "Session persistence + exit flow") once the
 * visitor confirms they want to leave. Illegal transitions (e.g. a stray
 * "ready" signal arriving after the app already moved to ERROR) are ignored
 * rather than throwing, since they can genuinely race against an
 * unmount/retry.
 *
 * ACCESS (the DHAWAL.OS guest-access panel, App.tsx/AccessPanel.tsx) sits
 * between LOADING and GAME: once the PixiJS engine itself is ready,
 * `GAME_READY` moves to ACCESS unless the guest already holds a persisted
 * session (a refresh mid-game), in which case it goes straight to GAME —
 * the caller decides which via `alreadyAuthenticated`, since only it knows
 * about `AuthManager`. `ACCESS_GRANTED` then completes the guest session
 * flow and moves ACCESS -> GAME.
 */
export type AppLifecycleState =
  'landing' | 'loading' | 'access' | 'game' | 'error'

export type AppLifecycleAction =
  | { type: 'START_JOURNEY' }
  | { type: 'GAME_READY'; alreadyAuthenticated: boolean }
  | { type: 'ACCESS_GRANTED' }
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
      return state === 'landing' ? 'loading' : state
    case 'GAME_READY':
      if (state !== 'loading') return state
      return action.alreadyAuthenticated ? 'game' : 'access'
    case 'ACCESS_GRANTED':
      return state === 'access' ? 'game' : state
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
