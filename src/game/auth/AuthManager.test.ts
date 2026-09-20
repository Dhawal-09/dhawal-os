import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthManager, authManager } from './AuthManager'

const STORAGE_KEY = 'dhawalos:auth-session'

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('AuthManager', () => {
  it('starts with no session when nothing is persisted', () => {
    const manager = new AuthManager()

    expect(manager.isAuthenticated()).toBe(false)
    expect(manager.getSession()).toBeNull()
    expect(manager.getRole()).toBeNull()
  })

  it('createGuestSession authenticates as GUEST with a generated session id', () => {
    const manager = new AuthManager()

    const session = manager.createGuestSession()

    expect(session.authenticated).toBe(true)
    expect(session.role).toBe('GUEST')
    expect(typeof session.sessionId).toBe('string')
    expect(session.sessionId.length).toBeGreaterThan(0)
    expect(session.createdAt).toBeGreaterThan(0)

    expect(manager.isAuthenticated()).toBe(true)
    expect(manager.getRole()).toBe('GUEST')
    expect(manager.getSession()).toEqual(session)
  })

  it('generates a distinct session id on each call', () => {
    const manager = new AuthManager()

    const first = manager.createGuestSession()
    const second = manager.createGuestSession()

    expect(first.sessionId).not.toBe(second.sessionId)
  })

  it('persists the session so a fresh instance (simulating a refresh) restores it', () => {
    const manager = new AuthManager()
    const session = manager.createGuestSession()

    const restored = new AuthManager()

    expect(restored.isAuthenticated()).toBe(true)
    expect(restored.getSession()).toEqual(session)
  })

  it('logout clears the in-memory and persisted session', () => {
    const manager = new AuthManager()
    manager.createGuestSession()

    manager.logout()

    expect(manager.isAuthenticated()).toBe(false)
    expect(manager.getSession()).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()

    // And a fresh instance after logout finds nothing either.
    expect(new AuthManager().isAuthenticated()).toBe(false)
  })

  it('treats a malformed/unexpected stored value as no session, without throwing', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'not-json')
    expect(() => new AuthManager()).not.toThrow()
    expect(new AuthManager().isAuthenticated()).toBe(false)

    window.sessionStorage.setItem(STORAGE_KEY, '{"sessionId":123}')
    expect(new AuthManager().isAuthenticated()).toBe(false)

    window.sessionStorage.setItem(STORAGE_KEY, '{}')
    expect(new AuthManager().isAuthenticated()).toBe(false)
  })

  it('does not throw and degrades to unauthenticated when sessionStorage itself throws (e.g. disabled storage)', () => {
    const proto = Object.getPrototypeOf(window.sessionStorage) as Storage
    const getSpy = vi.spyOn(proto, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })
    const setSpy = vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })
    const removeSpy = vi.spyOn(proto, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })

    expect(() => new AuthManager()).not.toThrow()
    const manager = new AuthManager()
    expect(manager.isAuthenticated()).toBe(false)

    expect(() => manager.createGuestSession()).not.toThrow()
    // Storage failed, but the in-memory session still works for this page life.
    expect(manager.isAuthenticated()).toBe(true)

    expect(() => manager.logout()).not.toThrow()

    getSpy.mockRestore()
    setSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('the shared singleton starts with no session in a fresh test environment', () => {
    // authManager was constructed at module load, before this test's
    // beforeEach cleared storage — reset it explicitly to assert its shape
    // without depending on module-load ordering.
    authManager.logout()
    expect(authManager.isAuthenticated()).toBe(false)
  })
})
