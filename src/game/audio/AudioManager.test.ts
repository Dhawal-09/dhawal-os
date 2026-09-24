import { describe, expect, it, vi } from 'vitest'
import {
  AudioManager,
  DEFAULT_SFX_VOLUME,
  type SfxContext,
  DEFAULT_MUSIC_VOLUME,
  MUSIC_TRACKS,
  WALKING_AUDIO_START_TIME,
  WALKING_AUDIO_URL,
  WALKING_AUDIO_VOLUME,
  type LoopingAudio,
} from './AudioManager'

function createFakeAudio() {
  const audio = {
    loop: false,
    volume: 1,
    paused: true,
    currentTime: 0,
    play: vi.fn(() => {
      audio.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(() => {
      audio.paused = true
    }),
  }
  return audio
}

function setup() {
  const audio = createFakeAudio()
  const createAudio = vi.fn(() => audio as unknown as LoopingAudio)
  return { audio, createAudio, manager: new AudioManager(createAudio) }
}

describe('AudioManager walking audio', () => {
  it('creates nothing until the player first moves', () => {
    const { createAudio, manager } = setup()
    manager.setWalking(false)
    expect(createAudio).not.toHaveBeenCalled()
  })

  it('preloadWalking creates the one instance ahead of time, positioned past the leading silence, without playing it', () => {
    const { audio, createAudio, manager } = setup()
    manager.preloadWalking()
    manager.preloadWalking()
    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(audio.play).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(WALKING_AUDIO_START_TIME)

    manager.setWalking(true)
    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('starts one looping instance and does not replay it every frame', () => {
    const { audio, createAudio, manager } = setup()
    for (let i = 0; i < 10; i++) manager.setWalking(true)

    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.loop).toBe(true)
    expect(audio.volume).toBe(WALKING_AUDIO_VOLUME)
  })

  it('stops and rewinds immediately when movement stops, then restarts cleanly', () => {
    const { audio, createAudio, manager } = setup()
    manager.setWalking(true)
    audio.currentTime = 1.4
    manager.setWalking(false)

    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(WALKING_AUDIO_START_TIME)

    // Rapid tapping reuses the same instance.
    manager.setWalking(true)
    manager.setWalking(false)
    manager.setWalking(true)
    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(3)
  })

  it('never plays while muted, and stops on mute', () => {
    const { audio, manager } = setup()
    manager.setWalking(true)
    manager.setMuted(true)
    expect(audio.paused).toBe(true)

    manager.setWalking(true)
    expect(audio.play).toHaveBeenCalledTimes(1)

    manager.setMuted(false)
    manager.setWalking(true)
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('swallows a rejected play() without throwing', async () => {
    const { audio, manager } = setup()
    audio.play.mockReturnValueOnce(Promise.reject(new Error('NotAllowed')))
    expect(() => manager.setWalking(true)).not.toThrow()
    await Promise.resolve()
  })

  it('notifies mute subscribers until unsubscribed', () => {
    const { manager } = setup()
    const listener = vi.fn()
    const unsubscribe = manager.subscribeMute(listener)
    manager.setMuted(true)
    unsubscribe()
    manager.setMuted(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(true)
  })
})

describe('AudioManager background music', () => {
  function setupChannels() {
    const created = new Map<string, ReturnType<typeof createFakeAudio>>()
    const createAudio = vi.fn((url: string) => {
      const audio = createFakeAudio()
      created.set(url, audio)
      return audio as unknown as LoopingAudio
    })
    const manager = new AudioManager(createAudio)
    return {
      manager,
      createAudio,
      music: () => created.get(MUSIC_TRACKS['house-theme'])!,
      walking: () => created.get(WALKING_AUDIO_URL)!,
    }
  }

  it('plays one looping, quiet instance and never restarts it on repeat calls', () => {
    const { manager, createAudio, music } = setupChannels()
    manager.playMusic('house-theme')
    manager.playMusic('house-theme')

    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(music().play).toHaveBeenCalledTimes(1)
    expect(music().loop).toBe(true)
    expect(music().volume).toBe(DEFAULT_MUSIC_VOLUME)
  })

  it('stopMusic pauses and rewinds; playing again reuses the same instance', () => {
    const { manager, createAudio, music } = setupChannels()
    manager.playMusic('house-theme')
    music().currentTime = 42
    manager.stopMusic()

    expect(music().paused).toBe(true)
    expect(music().currentTime).toBe(0)

    manager.playMusic('house-theme')
    expect(createAudio).toHaveBeenCalledTimes(1)
    expect(music().play).toHaveBeenCalledTimes(2)
  })

  it('is independent of footsteps — walking starts/stops never touch the music', () => {
    const { manager, music, walking } = setupChannels()
    manager.playMusic('house-theme')
    manager.setWalking(true)
    manager.setWalking(false)
    manager.setWalking(true)

    expect(walking()).not.toBe(music())
    expect(music().play).toHaveBeenCalledTimes(1)
    expect(music().pause).not.toHaveBeenCalled()
    expect(music().paused).toBe(false)
  })

  it('pauses on mute and resumes (without rewinding) on unmute', () => {
    const { manager, music } = setupChannels()
    manager.playMusic('house-theme')
    music().currentTime = 12
    manager.setMuted(true)
    expect(music().paused).toBe(true)
    expect(music().currentTime).toBe(12)

    manager.setMuted(false)
    expect(music().paused).toBe(false)
    expect(music().play).toHaveBeenCalledTimes(2)
  })

  it('does not start while muted, but starts once unmuted', () => {
    const { manager, music } = setupChannels()
    manager.setMuted(true)
    manager.playMusic('house-theme')
    expect(music().play).not.toHaveBeenCalled()

    manager.setMuted(false)
    expect(music().play).toHaveBeenCalledTimes(1)
  })

  it('clamps setMusicVolume and applies it to the playing track', () => {
    const { manager, music } = setupChannels()
    manager.playMusic('house-theme')
    manager.setMusicVolume(0.5)
    expect(music().volume).toBe(0.5)
    manager.setMusicVolume(3)
    expect(music().volume).toBe(1)
  })

  it('retries once on the first page interaction when autoplay is blocked', async () => {
    const { manager, music } = setupChannels()
    manager.playMusic('house-theme')
    manager.stopMusic()
    music().play.mockImplementationOnce(() =>
      Promise.reject(new Error('NotAllowedError')),
    )
    manager.playMusic('house-theme')
    await Promise.resolve()
    await Promise.resolve()
    expect(music().paused).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(music().paused).toBe(false)

    // The unlock listeners were removed — further input doesn't replay.
    const plays = music().play.mock.calls.length
    music().pause()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(music().play).toHaveBeenCalledTimes(plays)
    manager.stopMusic()
  })
})

describe('AudioManager procedural UI SFX', () => {
  function createFakeParam() {
    return {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    }
  }

  function createFakeContext(state: AudioContextState = 'running') {
    const oscillators: {
      type: string
      frequency: ReturnType<typeof createFakeParam>
      onended: (() => void) | null
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
      connect: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
    }[] = []
    const gains: { gain: ReturnType<typeof createFakeParam> }[] = []
    const context = {
      currentTime: 10,
      state,
      destination: {},
      resume: vi.fn(() => Promise.resolve()),
      createOscillator: vi.fn(() => {
        const oscillator = {
          type: 'sine',
          frequency: createFakeParam(),
          onended: null,
          start: vi.fn(),
          stop: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
        }
        oscillators.push(oscillator)
        return oscillator
      }),
      createGain: vi.fn(() => {
        const gain = {
          gain: createFakeParam(),
          connect: vi.fn(),
          disconnect: vi.fn(),
        }
        gains.push(gain)
        return gain
      }),
    }
    return { context, oscillators, gains }
  }

  function setupSfx(state?: AudioContextState) {
    const fake = createFakeContext(state)
    const createContext = vi.fn(() => fake.context as unknown as SfxContext)
    const manager = new AudioManager(
      () => createFakeAudio() as unknown as LoopingAudio,
      createContext,
    )
    /** The shared SFX master gain is the first gain node created. */
    const master = () => fake.gains[0].gain
    return { ...fake, createContext, manager, master }
  }

  it('creates no AudioContext until the first SFX plays', () => {
    const { createContext } = setupSfx()
    expect(createContext).not.toHaveBeenCalled()
  })

  it('reuses one AudioContext and one master gain across every SFX', () => {
    const { createContext, context, manager, master } = setupSfx()
    manager.playInteractOpen()
    manager.playInteractClose()
    manager.playInteractOpen()

    expect(createContext).toHaveBeenCalledTimes(1)
    expect(master().setValueAtTime).toHaveBeenLastCalledWith(
      DEFAULT_SFX_VOLUME,
      context.currentTime,
    )
  })

  it('open = soft sine pop (320 -> 140 Hz) + D5/A5 chime, all done within ~0.4s', () => {
    const { manager, oscillators } = setupSfx()
    manager.playInteractOpen()

    expect(oscillators.map((o) => o.type)).toEqual(['sine', 'triangle', 'sine'])
    const [pop, d5, a5] = oscillators
    expect(pop.frequency.setValueAtTime.mock.calls[0][0]).toBe(320)
    expect(pop.frequency.exponentialRampToValueAtTime.mock.calls[0][0]).toBe(
      140,
    )
    expect(d5.frequency.setValueAtTime.mock.calls[0][0]).toBeCloseTo(587.33)
    expect(a5.frequency.setValueAtTime.mock.calls[0][0]).toBe(880)
    // Staggered: the chime tones start after the pop, D5 before A5.
    const starts = oscillators.map((o) => o.start.mock.calls[0][0] as number)
    expect(starts[1]).toBeGreaterThan(starts[0])
    expect(starts[2]).toBeGreaterThan(starts[1])
    for (const o of oscillators) {
      expect((o.stop.mock.calls[0][0] as number) - 10).toBeLessThan(0.4)
    }
  })

  it('close = two soft descending tones, shorter than the open', () => {
    const { manager, oscillators } = setupSfx()
    manager.playInteractClose()

    expect(oscillators).toHaveLength(2)
    for (const o of oscillators) {
      expect(['sine', 'triangle']).toContain(o.type)
      const from = o.frequency.setValueAtTime.mock.calls[0][0] as number
      const to = o.frequency.exponentialRampToValueAtTime.mock
        .calls[0][0] as number
      expect(to).toBeLessThan(from)
      expect((o.stop.mock.calls[0][0] as number) - 10).toBeLessThan(0.26)
    }
  })

  it('each voice disconnects itself once it ends (no lingering nodes)', () => {
    const { manager, oscillators } = setupSfx()
    manager.playInteractOpen()
    for (const o of oscillators) {
      o.onended?.()
      expect(o.disconnect).toHaveBeenCalledTimes(1)
    }
  })

  it('plays nothing while muted, and zeroes the master gain on mute', () => {
    const { context, manager, master, oscillators } = setupSfx()
    manager.playInteractOpen()
    const count = oscillators.length

    manager.setMuted(true)
    expect(master().setValueAtTime).toHaveBeenLastCalledWith(
      0,
      context.currentTime,
    )
    manager.playInteractOpen()
    manager.playInteractClose()
    expect(oscillators).toHaveLength(count)
  })

  it('setSfxVolume clamps and drives the master gain', () => {
    const { context, manager, master } = setupSfx()
    manager.playInteractOpen()
    manager.setSfxVolume(0.15)
    expect(master().setValueAtTime).toHaveBeenLastCalledWith(
      0.15,
      context.currentTime,
    )
    manager.setSfxVolume(5)
    expect(master().setValueAtTime).toHaveBeenLastCalledWith(
      1,
      context.currentTime,
    )
  })

  it('resumes a suspended context, swallowing a rejected resume()', async () => {
    const { context, manager } = setupSfx('suspended')
    context.resume.mockReturnValueOnce(Promise.reject(new Error('blocked')))
    expect(() => manager.playInteractOpen()).not.toThrow()
    expect(context.resume).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })

  it('without Web Audio support, SFX are silently skipped (and not retried)', () => {
    const createContext = vi.fn(() => null)
    const manager = new AudioManager(
      () => createFakeAudio() as unknown as LoopingAudio,
      createContext,
    )
    expect(() => {
      manager.playInteractOpen()
      manager.playInteractClose()
    }).not.toThrow()
    expect(createContext).toHaveBeenCalledTimes(1)
  })
})
