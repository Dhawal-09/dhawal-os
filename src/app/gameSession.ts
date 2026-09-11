/**
 * The only place that touches `sessionStorage` for the "has the visitor
 * already entered the game this browser session" flag (PHASE-08.5 follow-up
 * "Session persistence"). Deliberately `sessionStorage`, not
 * `localStorage` — this is session-level ("survive a refresh"), not
 * permanent ("survive closing the tab").
 *
 * Every access is wrapped defensively: `sessionStorage` can throw (private
 * browsing in some older browsers, storage disabled by policy) and can
 * contain a value this app never wrote (cleared by other code, a browser
 * extension, or a future format change) — neither should crash the app.
 * Callers only ever see a plain boolean; the raw key/value never leaks
 * beyond this module.
 */

const GAME_SESSION_STORAGE_KEY = 'dhawalos:game-session-active'
const ACTIVE_VALUE = 'true'

/** True only for the exact value this module writes — any other/missing/malformed value is treated as "no active session", never as a crash. */
export function isGameSessionActive(): boolean {
  try {
    return (
      window.sessionStorage.getItem(GAME_SESSION_STORAGE_KEY) === ACTIVE_VALUE
    )
  } catch {
    return false
  }
}

/** Called once the game has actually finished initializing (GAME_READY) — never on START_JOURNEY alone, so a refresh mid-LOADING doesn't falsely persist "entered". */
export function markGameSessionActive(): void {
  try {
    window.sessionStorage.setItem(GAME_SESSION_STORAGE_KEY, ACTIVE_VALUE)
  } catch {
    // sessionStorage unavailable — degrade to "next refresh shows landing again" rather than throwing.
  }
}

/** Called on a confirmed EXIT, before transitioning back to LANDING. */
export function clearGameSession(): void {
  try {
    window.sessionStorage.removeItem(GAME_SESSION_STORAGE_KEY)
  } catch {
    // Same reasoning as markGameSessionActive.
  }
}
