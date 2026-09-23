import { describe, expect, it } from 'vitest'
import {
  appLifecycleReducer,
  INITIAL_APP_LIFECYCLE_STATE,
} from './appLifecycle'

describe('appLifecycle', () => {
  it('the initial state is landing', () => {
    expect(INITIAL_APP_LIFECYCLE_STATE).toBe('landing')
  })

  it('START_JOURNEY moves landing -> loading', () => {
    expect(appLifecycleReducer('landing', { type: 'START_JOURNEY' })).toBe(
      'loading',
    )
  })

  it('GAME_READY moves loading -> access when the guest has no session yet', () => {
    expect(
      appLifecycleReducer('loading', {
        type: 'GAME_READY',
        alreadyAuthenticated: false,
      }),
    ).toBe('access')
  })

  it('GAME_READY moves loading -> game directly when the guest already holds a session (refresh mid-game)', () => {
    expect(
      appLifecycleReducer('loading', {
        type: 'GAME_READY',
        alreadyAuthenticated: true,
      }),
    ).toBe('game')
  })

  it('ACCESS_GRANTED moves access -> game', () => {
    expect(appLifecycleReducer('access', { type: 'ACCESS_GRANTED' })).toBe(
      'game',
    )
  })

  it('GAME_ERROR moves loading -> error', () => {
    expect(
      appLifecycleReducer('loading', {
        type: 'GAME_ERROR',
      }),
    ).toBe('error')
  })

  it('RETRY moves error -> loading', () => {
    expect(appLifecycleReducer('error', { type: 'RETRY' })).toBe('loading')
  })

  it('EXIT moves game -> landing', () => {
    expect(appLifecycleReducer('game', { type: 'EXIT' })).toBe('landing')
  })

  it('ignores out-of-order transitions instead of throwing', () => {
    expect(appLifecycleReducer('landing', { type: 'ACCESS_GRANTED' })).toBe(
      'landing',
    )
    expect(
      appLifecycleReducer('landing', {
        type: 'GAME_READY',
        alreadyAuthenticated: false,
      }),
    ).toBe('landing')
    expect(appLifecycleReducer('landing', { type: 'GAME_ERROR' })).toBe(
      'landing',
    )
    expect(appLifecycleReducer('landing', { type: 'RETRY' })).toBe('landing')
    expect(appLifecycleReducer('landing', { type: 'EXIT' })).toBe('landing')
    expect(appLifecycleReducer('game', { type: 'START_JOURNEY' })).toBe('game')
    expect(appLifecycleReducer('game', { type: 'GAME_ERROR' })).toBe('game')
    expect(appLifecycleReducer('game', { type: 'ACCESS_GRANTED' })).toBe('game')
    expect(appLifecycleReducer('error', { type: 'START_JOURNEY' })).toBe(
      'error',
    )
    expect(
      appLifecycleReducer('error', {
        type: 'GAME_READY',
        alreadyAuthenticated: false,
      }),
    ).toBe('error')
    expect(appLifecycleReducer('error', { type: 'EXIT' })).toBe('error')
    expect(appLifecycleReducer('loading', { type: 'EXIT' })).toBe('loading')
    expect(appLifecycleReducer('access', { type: 'START_JOURNEY' })).toBe(
      'access',
    )
    expect(
      appLifecycleReducer('access', {
        type: 'GAME_READY',
        alreadyAuthenticated: false,
      }),
    ).toBe('access')
    expect(appLifecycleReducer('access', { type: 'EXIT' })).toBe('access')
  })
})
