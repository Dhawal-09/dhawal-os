import { Container } from 'pixi.js'
import { createWorldObjectPlaceholder, type WorldObject } from './WorldObject'
import type { WorldLayer } from './worldConstants'
import {
  createDebugGrid,
  createWorldBoundsPlaceholder,
} from './worldPlaceholders'

/**
 * The canonical `1440x1024` room, structured into the four draw-order layers
 * from WORLD_SPEC.md. Rendering (this file), collision (Phase 06), and
 * interaction (Phase 07) stay independent: this class only ever reads
 * `WorldObject.position`/`layer`, never `collision`/`interaction`.
 */
export class World extends Container {
  readonly backgroundLayer = new Container({ label: 'BACKGROUND' })
  readonly objectsLayer = new Container({ label: 'OBJECTS' })
  /** Reserved for Phase 05 — no WorldObject ever targets this layer. */
  readonly playerLayer = new Container({ label: 'PLAYER' })
  readonly foregroundLayer = new Container({ label: 'FOREGROUND' })

  constructor(objects: readonly WorldObject[]) {
    super({ label: 'World' })

    this.addChild(
      this.backgroundLayer,
      this.objectsLayer,
      this.playerLayer,
      this.foregroundLayer,
    )

    this.backgroundLayer.addChild(createWorldBoundsPlaceholder())
    if (import.meta.env.DEV) {
      this.backgroundLayer.addChild(createDebugGrid())
    }

    for (const object of objects) {
      this.layerFor(object.layer).addChild(createWorldObjectPlaceholder(object))
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
