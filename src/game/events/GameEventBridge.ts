/**
 * Canonical Pixi <-> React events (see ARCHITECTURE.md / INTERACTION_SPEC.md).
 * The `OPEN_*` events are emitted by the game layer when a proximity
 * interaction triggers; `CLOSE_OVERLAY`/`RETURN_TO_WORLD` are emitted by
 * React when the visitor dismisses whatever opened. `PAUSE_WORLD` is the
 * generic counterpart to `OPEN_*` for a React modal that isn't a portfolio
 * panel (currently: the exit confirmation dialog, PHASE-08.5 follow-up) —
 * it still resumes via the existing `RETURN_TO_WORLD`/`CLOSE_OVERLAY`, so
 * no second pause/resume vocabulary is introduced.
 */
export type GameEvent =
  | 'OPEN_PROJECTS'
  | 'OPEN_EXPERIENCE'
  | 'OPEN_SKILLS'
  | 'OPEN_EDUCATION'
  | 'OPEN_CERTIFICATES'
  | 'OPEN_RESUME'
  | 'OPEN_ABOUT'
  | 'OPEN_CONTACT'
  | 'OPEN_CAT'
  | 'PAUSE_WORLD'
  | 'CLOSE_OVERLAY'
  | 'RETURN_TO_WORLD'

export type GameEventListener = (event: GameEvent) => void

/**
 * Every event that opens a React portfolio panel — shared by GameScene
 * (to pause world input while a panel is open) and the React panel host
 * (to know which events open something), so the set of "open" events is
 * defined once instead of duplicated per consumer.
 */
export const OPEN_EVENTS: ReadonlySet<GameEvent> = new Set<GameEvent>([
  'OPEN_PROJECTS',
  'OPEN_EXPERIENCE',
  'OPEN_SKILLS',
  'OPEN_EDUCATION',
  'OPEN_CERTIFICATES',
  'OPEN_RESUME',
  'OPEN_ABOUT',
  'OPEN_CONTACT',
  'OPEN_CAT',
])

/**
 * The explicit event bridge between the Pixi game layer and the React UI
 * layer (INTERACTION_SPEC.md "Responsibility split"). Framework-agnostic —
 * it holds no application state and renders nothing; it only relays events.
 * The game layer never renders portfolio UI directly, and React never polls
 * player position to decide what to show.
 */
export class GameEventBridge {
  private readonly listeners = new Set<GameEventListener>()

  emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  /** Returns an unsubscribe function. */
  subscribe(listener: GameEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

/**
 * One game instance is ever mounted at a time (see GameCanvas.tsx), so a
 * shared singleton is the simplest way for the Pixi and React layers to
 * reach the same bridge without prop-drilling or React context. Tests that
 * want isolation should construct their own `new GameEventBridge()`.
 */
export const gameEventBridge = new GameEventBridge()
