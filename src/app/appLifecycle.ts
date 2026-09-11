/**
 * The application's small, explicit lifecycle (PHASE-08.5 "Application
 * states"). A plain reducer, not a state-machine library — the smallest
 * mechanism that fits: LANDING -> LOADING -> GAME, with an ERROR branch
 * that can retry back to LOADING, and an EXIT branch (GAME -> LANDING,
 * PHASE-08.5 follow-up "Session persistence + exit flow") once the visitor
 * confirms they want to leave. Illegal transitions (e.g. a stray "ready"
 * signal arriving after the app already moved to ERROR) are ignored rather
 * than throwing, since they can genuinely race against an unmount/retry.
 */
export type AppLifecycleState = 'landing' | 'loading' | 'game' | 'error'

export type AppLifecycleAction =
  | { type: 'START_JOURNEY' }
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
      return state === 'landing' ? 'loading' : state
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
