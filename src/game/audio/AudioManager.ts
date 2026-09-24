/**
 * Served from `public/`, so referenced by URL (respecting Vite's base path)
 * — same convention as the character sheets in playerAnimations.ts.
 */
const AUDIO_BASE_URL = `${import.meta.env.BASE_URL}assets/audio/`
export const WALKING_AUDIO_URL = `${AUDIO_BASE_URL}player/walking-steps.mp3`
export const WALKING_AUDIO_VOLUME = 0.3
/**
 * The recording opens with ~0.4s of silence before its first footfall.
 * Every start (and every stop's rewind) jumps just ahead of it, so the
 * first step lands the moment the player moves instead of trailing behind.
 */
export const WALKING_AUDIO_START_TIME = 0.35

export const MUSIC_TRACKS = {
  'house-theme': `${AUDIO_BASE_URL}ambient/house-theme.mp3`,
} as const
export type MusicTrack = keyof typeof MUSIC_TRACKS
/** Ambience — sits well underneath the footsteps. */
export const DEFAULT_MUSIC_VOLUME = 0.2

/** The slice of HTMLAudioElement AudioManager uses — lets tests pass a plain fake. */
export type LoopingAudio = Pick<
  HTMLAudioElement,
  'loop' | 'volume' | 'paused' | 'currentTime' | 'play' | 'pause'
>

/** UI SFX master level — subtle, under the footsteps. */
export const DEFAULT_SFX_VOLUME = 0.2

/** The slice of AudioContext the procedural SFX use — lets tests pass a plain fake. */
export type SfxContext = Pick<
  AudioContext,
  | 'currentTime'
  | 'state'
  | 'destination'
  | 'resume'
  | 'createGain'
  | 'createOscillator'
>

function createDefaultSfxContext(): SfxContext | null {
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  return Context ? new Context() : null
}

/** One enveloped oscillator voice of a procedural SFX, timed relative to the SFX start. */
interface Voice {
  type: OscillatorType
  /** Start / end frequency (Hz) — exponential glide between them. */
  from: number
  to: number
  /** Seconds after the SFX start. */
  start: number
  /** How long the pitch glide takes. */
  glide: number
  /** Peak level, relative to the SFX master gain. */
  peak: number
  /** When the voice has fully decayed and stops. */
  end: number
}

const ATTACK = 0.006
/** Scheduling slack, so the first ramp never starts in the past. */
const LEAD = 0.005

/**
 * OPEN: a soft digital pop (sine, 320 -> 140 Hz, ~0.08s), then a tiny warm
 * D5/A5 chime, slightly staggered, decaying out by ~0.36s.
 */
const INTERACT_OPEN_VOICES: readonly Voice[] = [
  {
    type: 'sine',
    from: 320,
    to: 140,
    start: 0,
    glide: 0.08,
    peak: 0.9,
    end: 0.085,
  },
  {
    type: 'triangle',
    from: 587.33,
    to: 587.33,
    start: 0.04,
    glide: 0,
    peak: 0.32,
    end: 0.33,
  },
  {
    type: 'sine',
    from: 880,
    to: 880,
    start: 0.09,
    glide: 0,
    peak: 0.26,
    end: 0.36,
  },
]

/**
 * CLOSE: the open chime's mirror — A5 then D5, each gliding gently down,
 * a touch quieter, gone by ~0.23s.
 */
const INTERACT_CLOSE_VOICES: readonly Voice[] = [
  {
    type: 'sine',
    from: 880,
    to: 698.46,
    start: 0,
    glide: 0.12,
    peak: 0.26,
    end: 0.15,
  },
  {
    type: 'triangle',
    from: 587.33,
    to: 440,
    start: 0.06,
    glide: 0.15,
    peak: 0.24,
    end: 0.23,
  },
]

type MuteListener = (muted: boolean) => void

/** Page interactions that grant the browser's autoplay permission. */
const UNLOCK_EVENTS = ['pointerdown', 'keydown'] as const

/**
 * Starts playback, swallowing failures — autoplay policy or a pause()
 * racing the load rejects the promise, and environments without media
 * playback (e.g. jsdom) throw synchronously. Audio must never break the game.
 */
function tryPlay(audio: LoopingAudio, onRejected?: () => void): void {
  try {
    void audio.play()?.catch(() => onRejected?.())
  } catch {
    // No media playback available.
  }
}

/**
 * The game's single audio owner: the global mute state (driven by the HUD's
 * SoundToggle) plus two independent looping channels, each one persistent
 * Audio instance created lazily on first use:
 *
 * - player: footsteps. Preloaded when GameScene is built; GameScene then
 *   reports the player's *actual* movement each frame via `setWalking`; the
 *   element is only touched on a start/stop transition, never per frame.
 * - music: background track. Started by App on entering GAME
 *   (`playMusic`), stopped on leaving it (`stopMusic`). Movement, panels and
 *   footsteps never touch it.
 *
 * Plus procedural one-shot UI SFX (`playInteractOpen`/`playInteractClose`)
 * synthesized on one shared, lazily created AudioContext through a single
 * SFX gain node. Each SFX builds a few short-lived oscillators that
 * disconnect themselves when they end — nothing runs between sounds.
 */
export class AudioManager {
  private readonly createAudio: (url: string) => LoopingAudio
  private walkingAudio: LoopingAudio | null = null
  private walking = false
  private musicAudio: LoopingAudio | null = null
  private musicTrack: MusicTrack | null = null
  /** True between `playMusic` and `stopMusic` — lets unmute / an autoplay unlock resume it. */
  private musicWanted = false
  private musicVolume = DEFAULT_MUSIC_VOLUME
  private readonly createSfxContext: () => SfxContext | null
  private sfxContext: SfxContext | null = null
  private sfxGainNode: GainNode | null = null
  /** Set once creating the AudioContext fails, so it isn't retried on every interaction. */
  private sfxUnavailable = false
  private sfxVolume = DEFAULT_SFX_VOLUME
  private muted = false
  private readonly muteListeners = new Set<MuteListener>()

  constructor(
    createAudio: (url: string) => LoopingAudio = (url) => new Audio(url),
    createSfxContext: () => SfxContext | null = createDefaultSfxContext,
  ) {
    this.createAudio = createAudio
    this.createSfxContext = createSfxContext
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    if (muted === this.muted) return
    this.muted = muted
    if (muted) {
      // If the player is still walking when unmuted, the next frame's
      // `setWalking(true)` starts footsteps again cleanly.
      this.stopWalking()
      this.musicAudio?.pause()
    } else if (this.musicWanted) {
      this.resumeMusic()
    }
    // Also silences an SFX that's mid-flight.
    this.applySfxGain()
    for (const listener of this.muteListeners) listener(muted)
  }

  subscribeMute(listener: MuteListener): () => void {
    this.muteListeners.add(listener)
    return () => this.muteListeners.delete(listener)
  }

  /**
   * Fetches and decodes the footstep file ahead of the first move (without
   * playing anything), so that first step isn't delayed by a network load.
   */
  preloadWalking(): void {
    this.getWalkingAudio()
  }

  /** Idempotent — safe (and intended) to call every frame with the player's current movement state. */
  setWalking(walking: boolean): void {
    if (!walking) {
      this.stopWalking()
      return
    }
    if (this.walking || this.muted) return
    this.walking = true

    const audio = this.getWalkingAudio()
    // A rejection just means the next start transition retries.
    if (audio.paused) tryPlay(audio)
  }

  /** Pauses and rewinds immediately, so the next move starts on the first footfall. */
  stopWalking(): void {
    if (!this.walking) return
    this.walking = false
    const audio = this.walkingAudio
    if (!audio) return
    audio.pause()
    audio.currentTime = WALKING_AUDIO_START_TIME
  }

  /** Idempotent — calling it again for the already-playing track never restarts it. */
  playMusic(track: MusicTrack): void {
    if (this.musicTrack !== track) {
      this.stopMusic()
      const audio = this.createAudio(MUSIC_TRACKS[track])
      audio.loop = true
      audio.volume = this.musicVolume
      this.musicAudio = audio
      this.musicTrack = track
    }
    this.musicWanted = true
    this.resumeMusic()
  }

  /** Stops and rewinds, so the next `playMusic` starts from the top. */
  stopMusic(): void {
    this.musicWanted = false
    this.removeUnlockListeners()
    const audio = this.musicAudio
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume))
    if (this.musicAudio) this.musicAudio.volume = this.musicVolume
  }

  private resumeMusic(): void {
    const audio = this.musicAudio
    if (!audio || this.muted || !audio.paused) return
    // Blocked by autoplay policy (e.g. a refresh restored the game with no
    // click yet) — retry on the visitor's first interaction with the page.
    tryPlay(audio, () => {
      if (this.musicWanted) this.addUnlockListeners()
    })
  }

  /** Played by GameScene only when an [E] interaction actually fires. */
  playInteractOpen(): void {
    this.playSfx(INTERACT_OPEN_VOICES)
  }

  /** Played by the panel host only on a real OPEN -> CLOSED transition. */
  playInteractClose(): void {
    this.playSfx(INTERACT_CLOSE_VOICES)
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume))
    this.applySfxGain()
  }

  private playSfx(voices: readonly Voice[]): void {
    if (this.muted) return
    try {
      const context = this.getSfxContext()
      if (!context || !this.sfxGainNode) return
      if (context.state === 'suspended') {
        // Every caller runs off a user keypress/click, so this is allowed.
        void context.resume().catch(() => {})
      }
      const t0 = context.currentTime + LEAD
      for (const voice of voices) {
        this.playVoice(context, this.sfxGainNode, voice, t0)
      }
    } catch {
      // Audio must never break gameplay.
    }
  }

  private playVoice(
    context: SfxContext,
    output: AudioNode,
    voice: Voice,
    t0: number,
  ): void {
    const start = t0 + voice.start
    const end = t0 + voice.end
    const oscillator = context.createOscillator()
    const envelope = context.createGain()

    oscillator.type = voice.type
    oscillator.frequency.setValueAtTime(voice.from, start)
    if (voice.to !== voice.from) {
      oscillator.frequency.exponentialRampToValueAtTime(
        voice.to,
        start + voice.glide,
      )
    }

    // Short linear attack (no click), smooth exponential decay to silence.
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(voice.peak, start + ATTACK)
    envelope.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(envelope)
    envelope.connect(output)
    oscillator.onended = () => {
      oscillator.disconnect()
      envelope.disconnect()
    }
    oscillator.start(start)
    oscillator.stop(end + 0.01)
  }

  private getSfxContext(): SfxContext | null {
    if (this.sfxContext || this.sfxUnavailable) return this.sfxContext
    try {
      const context = this.createSfxContext()
      if (!context) {
        this.sfxUnavailable = true
        return null
      }
      const gain = context.createGain()
      gain.connect(context.destination)
      this.sfxContext = context
      this.sfxGainNode = gain
      this.applySfxGain()
    } catch {
      this.sfxUnavailable = true
    }
    return this.sfxContext
  }

  private applySfxGain(): void {
    if (!this.sfxGainNode || !this.sfxContext) return
    this.sfxGainNode.gain.setValueAtTime(
      this.muted ? 0 : this.sfxVolume,
      this.sfxContext.currentTime,
    )
  }

  private readonly handleUnlock = (): void => {
    this.removeUnlockListeners()
    if (this.musicWanted) this.resumeMusic()
  }

  private addUnlockListeners(): void {
    // Same listener reference every time, so repeat calls never duplicate it.
    for (const type of UNLOCK_EVENTS) {
      window.addEventListener(type, this.handleUnlock)
    }
  }

  private removeUnlockListeners(): void {
    for (const type of UNLOCK_EVENTS) {
      window.removeEventListener(type, this.handleUnlock)
    }
  }

  private getWalkingAudio(): LoopingAudio {
    if (!this.walkingAudio) {
      const audio = this.createAudio(WALKING_AUDIO_URL)
      audio.loop = true
      audio.volume = WALKING_AUDIO_VOLUME
      // `new Audio(url)` starts fetching immediately (preload="auto"); set
      // before metadata loads, this becomes the default start position.
      audio.currentTime = WALKING_AUDIO_START_TIME
      this.walkingAudio = audio
    }
    return this.walkingAudio
  }
}

/** Shared by App (music), GameScene (footsteps) and the HUD's SoundToggle (mute), which live on opposite sides of the React/Pixi boundary. */
export const audioManager = new AudioManager()
