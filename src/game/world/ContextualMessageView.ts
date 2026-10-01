import { gsap } from 'gsap'
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import messageIconUrl from '../../../assets/world/special/Message.png'
import { PIXEL_FONT_FAMILY } from '../text/pixelFont'
import type {
  AmbientCandidate,
  InteractableCandidate,
} from './InteractionSystem'
import type { ContextualMessageType } from './WorldObject'
import { ManagedAssetSprite } from './WorldObject'

/**
 * World units between an object's `position` and the prompt's pointer,
 * unless the message sets `elevation`. Clears the head of a player standing
 * at the target (the visible character is ~120 units tall above its
 * collision origin), and the top of most floor-anchored furniture.
 */
export const DEFAULT_MESSAGE_ELEVATION = 130
/**
 * When a prompt appears, its pointer is lifted to at least this far above
 * the player's origin, so it never covers the character's head — e.g. at a
 * marker against the bottom wall, where the player can only stand above it.
 */
export const PLAYER_HEAD_CLEARANCE = 130
/** Keeps the whole box inside the world edges. */
const EDGE_MARGIN = 4
/** An interactable with no configured message keeps the original generic prompt. */
export const DEFAULT_INTERACTIVE_TEXT = 'INTERACT'

export interface ContextualMessageContent {
  type: ContextualMessageType
  text: string
  /** A quieter supporting line under `text` (info/flavor only). */
  secondaryText?: string
  /** Wrap narrower than the default 42 glyphs. */
  wrapGlyphs?: number
  /** World-space point the prompt's pointer sits on. */
  anchor: { x: number; y: number }
}

/**
 * What the camera currently shows of the world, for `fitToView`: the world
 * scale (world units → CSS px) and the visible world x-range.
 */
export interface MessageViewport {
  scale: number
  left: number
  right: number
}

/**
 * What the current interaction/ambient target says, and where: above the
 * target, lifted clear of the player's head as they stand when it appears.
 * Computed once per target change — the prompt then stays fixed in the world.
 */
export function messageForTarget(
  target: InteractableCandidate | AmbientCandidate,
  playerPosition?: { x: number; y: number },
  /** Replaces the configured type/text — a flavor variant, or an `[E]` response. */
  override?: Partial<Pick<ContextualMessageContent, 'type' | 'text'>>,
): ContextualMessageContent {
  const message = target.message
  const elevation = message?.elevation ?? DEFAULT_MESSAGE_ELEVATION
  // An ambient spot may aim its pointer somewhere other than straight above
  // its trigger point (a wall piece approached from the floor).
  const pointer = 'pointer' in target ? target.pointer : undefined
  const x = pointer?.x ?? target.position.x
  let y = pointer?.y ?? target.position.y - elevation
  if (playerPosition) y = Math.min(y, playerPosition.y - PLAYER_HEAD_CLEARANCE)
  const content: ContextualMessageContent = {
    type: message?.type ?? 'interactive',
    text: message?.text ?? DEFAULT_INTERACTIVE_TEXT,
    ...override,
    anchor: { x, y },
  }
  if (message && message.type !== 'interactive' && !override?.text) {
    if (message.secondaryText) content.secondaryText = message.secondaryText
    if (message.wrapGlyphs) content.wrapGlyphs = message.wrapGlyphs
  }
  return content
}

/** `[TAP]` on touch-first devices (the canvas tap is the existing mobile interact path), `[E]` otherwise. */
export function interactHintLabel(): string {
  try {
    if (window.matchMedia?.('(pointer: coarse)').matches) return '[TAP]'
  } catch {
    // No matchMedia — treat as desktop.
  }
  return '[E]'
}

function prefersReducedMotion(): boolean {
  try {
    return (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    )
  } catch {
    return false
  }
}

// DESIGN_SYSTEM.md tokens (src/styles/index.css).
const COLOR_FILL = 0x06142d // --panel-dark
const COLOR_CYAN = 0x27d7ff // --cyan
const COLOR_CYAN_BRIGHT = 0x57e8ff // --cyan-bright
const COLOR_PIXEL_BORDER = 0x1e5fa8 // --pixel-border
const COLOR_TEXT = 0xeaf4ff // --text
const COLOR_TEXT_MUTED = 0x91a9c8 // --text-muted

const FONT_SIZE = 12
/**
 * Longer flavor lines and multi-line `[E]` responses wrap at this width —
 * 42 glyphs, so every one-line prompt (contextualMessages.test.ts) is
 * unaffected.
 */
const WRAP_WIDTH = 42 * FONT_SIZE
const LINE_HEIGHT = FONT_SIZE + 6
/** Space between a message and its secondary line. */
const SECONDARY_GAP = 6
/**
 * The prompt's text never renders smaller than this on screen (CSS px). At
 * the desktop gameplay zoom the world scale is already ≥ 1, so nothing
 * changes there; in the whole-house view and on phones — where the world is
 * drawn well below 1:1 — the prompt is scaled up just enough to stay legible.
 */
const MIN_SCREEN_FONT_PX = 9
const PAD_X = 8
const PAD_Y = 7
const GAP = 8
const BORDER = 2
/** Corner cut, for the stepped pixel-art corners. */
const NOTCH = 2
const GLOW = 2
const CARET_HEIGHT = 4
const ICON_HEIGHT = 12
/** How far the prompt rises into place / sinks away (world units). */
const RISE = 6
const SHOW_SECONDS = 0.16
const HIDE_SECONDS = 0.12

/** A rectangle with square-cut corners — the pixel-art "rounded" box. */
function notchedRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
): Graphics {
  // prettier-ignore
  return g.poly([
    x + n, y,
    x + w - n, y,
    x + w - n, y + n,
    x + w, y + n,
    x + w, y + h - n,
    x + w - n, y + h - n,
    x + w - n, y + h,
    x + n, y + h,
    x + n, y + h - n,
    x, y + h - n,
    x, y + n,
    x + n, y + n,
  ])
}

/**
 * `Message.png` is a large (1592×980) black pixel-art speech-bubble outline
 * on transparency — invisible on the dark prompt and far too big. Resample
 * it once onto its own pixel grid (one texel per art pixel, detected from
 * the outline thickness) and recolor it cyan, giving a tiny crisp icon.
 */
function pixelateIcon(image: HTMLImageElement): Texture | null {
  const source = document.createElement('canvas')
  source.width = image.naturalWidth
  source.height = image.naturalHeight
  const sourceContext = source.getContext('2d')
  if (!sourceContext) return null
  sourceContext.drawImage(image, 0, 0)
  const { data, width, height } = sourceContext.getImageData(
    0,
    0,
    source.width,
    source.height,
  )
  const opaque = (x: number, y: number) => data[(y * width + x) * 4 + 3] > 128

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < 0) return null

  // The top outline's thickness (at the horizontal middle) is one art pixel.
  const midX = Math.round((minX + maxX) / 2)
  let cell = 0
  while (minY + cell <= maxY && opaque(midX, minY + cell)) cell++
  if (cell === 0) return null

  const columns = Math.round((maxX - minX + 1) / cell)
  const rows = Math.round((maxY - minY + 1) / cell)
  const out = document.createElement('canvas')
  out.width = columns
  out.height = rows
  const outContext = out.getContext('2d')
  if (!outContext) return null
  const pixels = outContext.createImageData(columns, rows)
  const r = (COLOR_CYAN >> 16) & 0xff
  const g = (COLOR_CYAN >> 8) & 0xff
  const b = COLOR_CYAN & 0xff
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = Math.min(width - 1, Math.floor(minX + (column + 0.5) * cell))
      const y = Math.min(height - 1, Math.floor(minY + (row + 0.5) * cell))
      if (!opaque(x, y)) continue
      const i = (row * columns + column) * 4
      pixels.data[i] = r
      pixels.data[i + 1] = g
      pixels.data[i + 2] = b
      pixels.data[i + 3] = 255
    }
  }
  outContext.putImageData(pixels, 0, 0)

  const texture = Texture.from(out)
  texture.source.scaleMode = 'nearest'
  return texture
}

let iconTexturePromise: Promise<Texture | null> | null = null

/** Built once per page and shared by every scene (re-entering after EXIT reuses it). */
function loadMessageIconTexture(): Promise<Texture | null> {
  iconTexturePromise ??= new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const image = new Image()
    image.onload = () => {
      try {
        resolve(pixelateIcon(image))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = messageIconUrl
  })
  return iconTexturePromise
}

/**
 * The single in-world contextual prompt (INTERACTION_SPEC.md "Contextual
 * messages"). Lives in world space (added to `World` by `GameScene`), so
 * the Camera transform moves and clips it with its target — no screen
 * coordinates. Purely presentational: `GameScene` decides *what* to show
 * and calls `show`/`hide` only when the target changes, never per frame.
 *
 * - interactive: `[E]`/`[TAP]` badge + text, cyan border.
 * - info/flavor: speech-bubble icon + text, quieter blue border (flavor
 *   text slightly muted), no key hint.
 *
 * Origin is the pointer's tip (bottom-center).
 */
export class ContextualMessageView extends Container {
  private readonly frame = new Graphics()
  private readonly hint = new Text({
    text: '[E]',
    style: {
      fontFamily: PIXEL_FONT_FAMILY,
      fontSize: FONT_SIZE,
      fill: COLOR_CYAN_BRIGHT,
    },
  })
  private readonly body = new Text({
    text: '',
    style: {
      fontFamily: PIXEL_FONT_FAMILY,
      fontSize: FONT_SIZE,
      fill: COLOR_TEXT,
      wordWrap: true,
      wordWrapWidth: WRAP_WIDTH,
      lineHeight: LINE_HEIGHT,
    },
  })
  private readonly secondary = new Text({
    text: '',
    style: {
      fontFamily: PIXEL_FONT_FAMILY,
      fontSize: FONT_SIZE,
      fill: COLOR_TEXT_MUTED,
      wordWrap: true,
      wordWrapWidth: WRAP_WIDTH,
      lineHeight: LINE_HEIGHT,
    },
  })
  private icon: Sprite | null = null
  private content: ContextualMessageContent | null = null
  private readonly worldBounds: { width: number; height: number } | null
  /** Current box height including the pointer, for the top-edge clamp. */
  private boxHeight = 0
  /** Current box width (unscaled), for the horizontal clamp. */
  private boxWidth = 0
  /** How far the box is currently slid sideways off its pointer (unscaled). */
  private boxShift = 0
  /** The visible world x-range from the last `fitToView`, if any. */
  private viewRange: { left: number; right: number } | null = null

  /** `worldBounds`: the world size — the box is kept inside it (the pointer still marks the target). */
  constructor(worldBounds: { width: number; height: number } | null = null) {
    super({ label: 'ContextualMessage' })
    this.worldBounds = worldBounds
    this.eventMode = 'none'
    this.visible = false
    this.alpha = 0
    this.secondary.visible = false
    this.addChild(this.frame, this.hint, this.body, this.secondary)

    void loadMessageIconTexture().then((texture) => {
      if (!texture || this.destroyed) return
      // ManagedAssetSprite: the shared icon texture must survive this
      // scene's teardown (EXIT) for the next one.
      const icon = new ManagedAssetSprite(texture)
      icon.scale.set(ICON_HEIGHT / texture.height)
      this.icon = icon
      this.addChild(icon)
      this.layout()
    })
  }

  /** The message currently shown (or animating in), or null when hidden. */
  get current(): ContextualMessageContent | null {
    return this.content
  }

  show(content: ContextualMessageContent): void {
    this.content = content
    this.layout()

    gsap.killTweensOf(this)
    this.visible = true
    this.x = content.anchor.x
    const y = Math.max(
      content.anchor.y,
      this.boxHeight * this.scale.y + EDGE_MARGIN,
    )
    if (prefersReducedMotion()) {
      this.alpha = 1
      this.y = y
      return
    }
    gsap.fromTo(
      this,
      { alpha: 0, y: y + RISE },
      { alpha: 1, y, duration: SHOW_SECONDS, ease: 'power2.out' },
    )
  }

  hide(): void {
    if (!this.content) return
    this.content = null

    gsap.killTweensOf(this)
    if (prefersReducedMotion()) {
      this.visible = false
      this.alpha = 0
      return
    }
    gsap.to(this, {
      alpha: 0,
      y: this.y + RISE,
      duration: HIDE_SECONDS,
      ease: 'power1.in',
      onComplete: () => {
        this.visible = false
      },
    })
  }

  /**
   * Keeps the prompt legible and on screen for the camera's current view.
   * Called every frame by `GameScene`, but only does work when the answer
   * changes: the world scale dropped low enough to need a larger prompt
   * (whole-house view, phones), or the box would cross the edge of the
   * visible world and has to slide back in (the pointer stays on its target).
   */
  fitToView(viewport: MessageViewport | null): void {
    if (!viewport || !(viewport.scale > 0)) return
    this.viewRange = viewport
    if (!this.content) return

    const scale = Math.max(1, MIN_SCREEN_FONT_PX / (FONT_SIZE * viewport.scale))
    const scaleChanged = Math.abs(scale - this.scale.x) > 0.001
    if (scaleChanged) this.scale.set(scale)

    if (scaleChanged || this.computeShift(this.boxWidth) !== this.boxShift) {
      this.layout()
    }
  }

  /**
   * How far (unscaled units) the box must slide off its pointer to stay
   * inside the world, and inside the visible part of it when known. Never
   * so far that the pointer would leave the box.
   */
  private computeShift(width: number): number {
    const content = this.content
    if (!content) return 0
    let min = -Infinity
    let max = Infinity
    if (this.worldBounds) {
      min = 0
      max = this.worldBounds.width
    }
    if (this.viewRange) {
      min = Math.max(min, this.viewRange.left)
      max = Math.min(max, this.viewRange.right)
    }
    if (min === -Infinity || max === Infinity) return 0

    const scale = this.scale.x
    const half = (width / 2 + GLOW) * scale + EDGE_MARGIN
    const x = content.anchor.x
    // A box wider than the available span is centred on it.
    const clamped =
      max - min < half * 2
        ? (min + max) / 2
        : Math.min(Math.max(x, min + half), max - half)
    // 4 = half the pointer's width.
    const limit = Math.max(0, width / 2 - NOTCH - 4)
    const shift = Math.round((clamped - x) / scale)
    return Math.min(Math.max(shift, -limit), limit)
  }

  private layout(): void {
    const content = this.content
    if (!content) return
    const interactive = content.type === 'interactive'

    this.hint.visible = interactive
    if (interactive) this.hint.text = interactHintLabel()
    if (this.icon) this.icon.visible = !interactive

    const wrapWidth = content.wrapGlyphs
      ? content.wrapGlyphs * FONT_SIZE
      : WRAP_WIDTH
    this.body.style.wordWrapWidth = wrapWidth
    this.body.text = content.text
    this.body.style.fill =
      content.type === 'flavor' ? COLOR_TEXT_MUTED : COLOR_TEXT

    const secondaryText = interactive ? undefined : content.secondaryText
    this.secondary.visible = Boolean(secondaryText)
    if (secondaryText) {
      this.secondary.style.wordWrapWidth = wrapWidth
      this.secondary.text = secondaryText
    }
    const secondaryHeight = secondaryText
      ? SECONDARY_GAP + this.secondary.height
      : 0
    const textWidth = secondaryText
      ? Math.max(this.body.width, this.secondary.width)
      : this.body.width
    const textHeight = this.body.height + secondaryHeight

    const lead = interactive ? this.hint : this.icon
    const leadWidth = lead ? lead.width + GAP : 0
    const innerHeight = Math.max(textHeight, lead ? lead.height : 0)
    const width = PAD_X * 2 + leadWidth + textWidth
    const height = PAD_Y * 2 + innerHeight
    this.boxHeight = height + CARET_HEIGHT + GLOW
    this.boxWidth = width
    // Near a world/view edge, slide the box (not the pointer) back inside.
    const shift = this.computeShift(width)
    this.boxShift = shift
    const left = -width / 2 + shift
    const top = -(height + CARET_HEIGHT)

    const border = interactive ? COLOR_CYAN : COLOR_PIXEL_BORDER
    this.frame.clear()
    notchedRect(
      this.frame,
      left - GLOW,
      top - GLOW,
      width + GLOW * 2,
      height + GLOW * 2,
      NOTCH + 1,
    ).fill({ color: border, alpha: 0.18 })
    notchedRect(this.frame, left, top, width, height, NOTCH).fill(border)
    notchedRect(
      this.frame,
      left + BORDER,
      top + BORDER,
      width - BORDER * 2,
      height - BORDER * 2,
      NOTCH,
    ).fill({ color: COLOR_FILL, alpha: 0.94 })
    // Stepped pixel pointer down to the target.
    this.frame
      .rect(-4, top + height, 8, CARET_HEIGHT / 2)
      .fill(border)
      .rect(-2, top + height + CARET_HEIGHT / 2, 4, CARET_HEIGHT / 2)
      .fill(border)

    const centerY = top + height / 2
    let x = left + PAD_X
    if (lead) {
      // Beside a one-line message the lead is centred; beside a taller block
      // it sits level with the first line.
      const leadY = secondaryText
        ? top + PAD_Y + (FONT_SIZE - lead.height) / 2
        : centerY - lead.height / 2
      lead.position.set(x, leadY)
      x += leadWidth
    }
    const textTop = centerY - textHeight / 2
    this.body.position.set(x, textTop)
    if (secondaryText) {
      this.secondary.position.set(x, textTop + this.body.height + SECONDARY_GAP)
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this)
    super.destroy(options)
  }
}
