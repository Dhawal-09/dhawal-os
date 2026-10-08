import { describe, expect, it } from 'vitest'
import {
  appLifecycleReducer,
  INITIAL_APP_LIFECYCLE_STATE,
} from './appLifecycle'

describe('appLifecycle', () => {
  it('the initial state is landing', () => {
    expect(INITIAL_APP_LIFECYCLE_STATE).toBe('landing')
  })

  it('START_JOURNEY moves landing -> view-select, without waiting on the game', () => {
    expect(appLifecycleReducer('landing', { type: 'START_JOURNEY' })).toBe(
      'view-select',
    )
  })

  it('VIEW_SELECTED moves view-select -> loading, and is ignored anywhere else', () => {
    expect(appLifecycleReducer('view-select', { type: 'VIEW_SELECTED' })).toBe(
      'loading',
    )
    for (const state of ['landing', 'loading', 'game', 'error'] as const) {
      expect(appLifecycleReducer(state, { type: 'VIEW_SELECTED' })).toBe(state)
    }
  })

  it('GAME_READY moves loading -> game', () => {
    expect(appLifecycleReducer('loading', { type: 'GAME_READY' })).toBe('game')
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
    expect(appLifecycleReducer('landing', { type: 'VIEW_SELECTED' })).toBe(
      'landing',
    )
    expect(appLifecycleReducer('landing', { type: 'GAME_READY' })).toBe(
      'landing',
    )
    expect(appLifecycleReducer('landing', { type: 'GAME_ERROR' })).toBe(
      'landing',
    )
    expect(appLifecycleReducer('landing', { type: 'RETRY' })).toBe('landing')
    expect(appLifecycleReducer('landing', { type: 'EXIT' })).toBe('landing')
    // The engine can finish (or fail) behind VIEW_SELECT — neither may pull
    // the visitor off the screen they are still choosing on.
    expect(appLifecycleReducer('view-select', { type: 'GAME_READY' })).toBe(
      'view-select',
    )
    expect(appLifecycleReducer('view-select', { type: 'GAME_ERROR' })).toBe(
      'view-select',
    )
    expect(appLifecycleReducer('view-select', { type: 'START_JOURNEY' })).toBe(
      'view-select',
    )
    expect(appLifecycleReducer('view-select', { type: 'EXIT' })).toBe(
      'view-select',
    )
    expect(appLifecycleReducer('game', { type: 'START_JOURNEY' })).toBe('game')
    expect(appLifecycleReducer('game', { type: 'GAME_ERROR' })).toBe('game')
    expect(appLifecycleReducer('error', { type: 'START_JOURNEY' })).toBe(
      'error',
    )
    expect(appLifecycleReducer('error', { type: 'GAME_READY' })).toBe('error')
    expect(appLifecycleReducer('error', { type: 'EXIT' })).toBe('error')
    expect(appLifecycleReducer('loading', { type: 'EXIT' })).toBe('loading')
  })
})
