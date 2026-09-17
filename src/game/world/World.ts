import { Container } from 'pixi.js'
import {
  createWorldObjectView,
  type Collider,
  type WorldObject,
} from './WorldObject'
import type { WorldLayer } from './worldConstants'
import {
  createCollisionDebugOverlay,
  createDebugGrid,
  createDevWorldBoundsAnnotation,
  createWorldBoundsPlaceholder,
} from './worldPlaceholders'

/**
 * The canonical `1920x1440` room, structured into the four draw-order layers
 * from WORLD_SPEC.md. Rendering (this file) and collision (CollisionSystem)
 * stay independent: World never performs a collision test or decides what
 * blocks the player — it only ever reads `WorldObject.collision` to draw a
 * dev-only debug outline, the same data CollisionSystem independently reads
 * to build its actual obstacle list.
 */
export class World extends Container {
  readonly backgroundLayer = new Container({ label: 'BACKGROUND' })
  readonly objectsLayer = new Container({ label: 'OBJECTS' })
  /** Reserved for Phase 05 — no WorldObject ever targets this layer. */
  readonly playerLayer = new Container({ label: 'PLAYER' })
  readonly foregroundLayer = new Container({ label: 'FOREGROUND' })

  /**
   * `extraColliders` (PHASE 10B.1) lets the dev collision-debug overlay
   * also outline non-WorldObject obstacles — namely the room's own
   * perimeter walls (`ROOM_BOUNDARY_COLLIDERS` in worldObjects.ts), which
   * CollisionSystem resolves against but which have no WorldObject entry.
   * Defaults to none, so every existing caller/test that only passes
   * `objects` is unaffected.
   *
   * `debugCollisionOverlay` is a separate opt-in on top of
   * `import.meta.env.DEV` — the overlay is off by default even in
   * `npm run dev`, so a normal player (or developer) never sees red
   * collider outlines during ordinary gameplay. GameScene.ts turns this on
   * only when the `VITE_DEBUG_COLLISION` env var is explicitly set;
   * `import.meta.env.DEV` remains a hard, unconditional gate too, so no
   * caller mistake can ever make it render in a production build.
   */
  constructor(
    objects: readonly WorldObject[],
    extraColliders: readonly Collider[] = [],
    debugCollisionOverlay = false,
  ) {
    super({ label: 'World' })

    this.addChild(
      this.backgroundLayer,
      this.objectsLayer,
      this.playerLayer,
      this.foregroundLayer,
    )

    this.backgroundLayer.addChild(createWorldBoundsPlaceholder())
    if (import.meta.env.DEV) {
      this.backgroundLayer.addChild(createDevWorldBoundsAnnotation())
      this.backgroundLayer.addChild(createDebugGrid())
    }

    for (const object of objects) {
      this.layerFor(object.layer).addChild(createWorldObjectView(object))
    }

    // Drawn last (on top of everything) so collider outlines are never
    // hidden behind objects/foreground. Dev-only AND opt-in — see
    // PERFORMANCE.md and the constructor doc comment above.
    if (import.meta.env.DEV && debugCollisionOverlay) {
      this.addChild(createCollisionDebugOverlay(objects, extraColliders))
    }
  }

  private layerFor(layer: WorldLayer): Container {
    switch (layer) {
      case 'background':
        return this.backgroundLayer
      case 'object':
        return this.objectsLayer
      case 'foreground':
        return this.foregroundLayer
    }
  }
}
