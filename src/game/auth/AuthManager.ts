/**
 * Local, honest "guest session" auth for DHAWAL.OS — a portfolio demo of
 * authentication/session *concepts*, never a real login. There is no
 * backend, no credentials, and no server that validates anything: creating
 * a session only ever means "a visitor chose to enter as a guest," and nothing
 * here should ever be presented as protecting a real resource.
 *
 * `createGuestSession()` is the only way a session becomes authenticated;
 * everything else here just reads or clears that state. The public shape
 * (`createGuestSession`/`getSession`/`isAuthenticated`/`getRole`/`logout`) is
 * deliberately provider-agnostic, so a real auth provider could replace
 * `createGuestSession`'s body later without changing any caller.
 *
 * Persisted the same way `gameSession.ts` persists "has the visitor entered
 * the game" — `sessionStorage`, wrapped defensively, so a malformed or
 * blocked value degrades to "not authenticated" rather than throwing.
 */

export type AuthRole = 'GUEST'

export interface AuthSession {
  authenticated: boolean
  role: AuthRole
  sessionId: string
  createdAt: number
}

const AUTH_SESSION_STORAGE_KEY = 'dhawalos:auth-session'

interface PersistedAuthSession {
  sessionId: string
  createdAt: number
}

function generateSessionId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID — still unique
  // enough for a local, non-security-sensitive demo session id.
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isPersistedAuthSession(
  value: unknown,
): value is PersistedAuthSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { sessionId?: unknown }).sessionId === 'string' &&
    typeof (value as { createdAt?: unknown }).createdAt === 'number'
  )
}

/** Any other/missing/malformed stored value is treated as "no session", never as a crash — same defensive shape as `gameSession.ts`. */
function readPersistedSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isPersistedAuthSession(parsed)) return null
    return {
      authenticated: true,
      role: 'GUEST',
      sessionId: parsed.sessionId,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

function persistSession(session: AuthSession): void {
  try {
    const persisted: PersistedAuthSession = {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
    }
    window.sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify(persisted),
    )
  } catch {
    // sessionStorage unavailable — the session still works for the rest of
    // this page life, it just won't survive a refresh (same degrade-gracefully
    // reasoning as gameSession.ts).
  }
}

function clearPersistedSession(): void {
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  } catch {
    // Same reasoning as persistSession.
  }
}

/**
 * The single owner of guest-session state. Never talks to a network — see
 * the module doc comment above. One shared instance (`authManager`, below)
 * is used across the whole app; tests that want isolation should construct
 * their own `new AuthManager()`.
 */
export class AuthManager {
  private session: AuthSession | null

  constructor() {
    this.session = readPersistedSession()
  }

  /** The only way a session becomes authenticated. Always succeeds — there is nothing to reject. */
  createGuestSession(): AuthSession {
    const session: AuthSession = {
      authenticated: true,
      role: 'GUEST',
      sessionId: generateSessionId(),
      createdAt: Date.now(),
    }
    this.session = session
    persistSession(session)
    return session
  }

  getSession(): AuthSession | null {
    return this.session
  }

  isAuthenticated(): boolean {
    return this.session?.authenticated ?? false
  }

  getRole(): AuthRole | null {
    return this.session?.role ?? null
  }

  /** Clears the in-memory and persisted session. No UI currently calls this (SECURITY/HONESTY: no visible logout yet) — kept available for future use. */
  logout(): void {
    this.session = null
    clearPersistedSession()
  }
}

/** Shared instance — same singleton pattern as `gameEventBridge`. */
export const authManager = new AuthManager()
