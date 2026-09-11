import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGameSession,
  isGameSessionActive,
  markGameSessionActive,
} from './gameSession'

const STORAGE_KEY = 'dhawalos:game-session-active'

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('gameSession', () => {
  it('reports no active session when nothing has been written (fresh visit -> landing)', () => {
    expect(isGameSessionActive()).toBe(false)
  })

  it('markGameSessionActive sets the flag, and isGameSessionActive then reports true (refresh -> game bootstrap)', () => {
    markGameSessionActive()

    expect(isGameSessionActive()).toBe(true)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('clearGameSession removes the flag', () => {
    markGameSessionActive()
    expect(isGameSessionActive()).toBe(true)

    clearGameSession()

    expect(isGameSessionActive()).toBe(false)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats a malformed/unexpected stored value as no active session, without throwing', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'yes-please')

    expect(() => isGameSessionActive()).not.toThrow()
    expect(isGameSessionActive()).toBe(false)

    window.sessionStorage.setItem(STORAGE_KEY, '{"active":true}')
    expect(isGameSessionActive()).toBe(false)

    window.sessionStorage.setItem(STORAGE_KEY, '')
    expect(isGameSessionActive()).toBe(false)
  })

  it('does not throw and degrades to false/no-op when sessionStorage itself throws (e.g. disabled storage)', () => {
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

    expect(() => isGameSessionActive()).not.toThrow()
    expect(isGameSessionActive()).toBe(false)
    expect(() => markGameSessionActive()).not.toThrow()
    expect(() => clearGameSession()).not.toThrow()

    getSpy.mockRestore()
    setSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
