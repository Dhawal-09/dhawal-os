import { describe, expect, it, vi } from 'vitest'
import { GameEventBridge } from './GameEventBridge'

describe('GameEventBridge', () => {
  it('delivers an emitted event to every subscribed listener', () => {
    const bridge = new GameEventBridge()
    const a = vi.fn()
    const b = vi.fn()
    bridge.subscribe(a)
    bridge.subscribe(b)

    bridge.emit('OPEN_PROJECTS')

    expect(a).toHaveBeenCalledWith('OPEN_PROJECTS')
    expect(b).toHaveBeenCalledWith('OPEN_PROJECTS')
  })

  it('stops delivering events once unsubscribed', () => {
    const bridge = new GameEventBridge()
    const listener = vi.fn()
    const unsubscribe = bridge.subscribe(listener)

    unsubscribe()
    bridge.emit('OPEN_RESUME')

    expect(listener).not.toHaveBeenCalled()
  })

  it('does nothing when emitted with no subscribers', () => {
    const bridge = new GameEventBridge()

    expect(() => bridge.emit('CLOSE_OVERLAY')).not.toThrow()
  })

  it('delivers each event in order, to a listener that stays subscribed across multiple emits', () => {
    const bridge = new GameEventBridge()
    const received: string[] = []
    bridge.subscribe((event) => received.push(event))

    bridge.emit('OPEN_ABOUT')
    bridge.emit('RETURN_TO_WORLD')

    expect(received).toEqual(['OPEN_ABOUT', 'RETURN_TO_WORLD'])
  })
})
