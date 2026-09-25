import { CanvasTextMetrics } from 'pixi.js'

/**
 * jsdom has no canvas 2D context, so Pixi can't measure text — reading a
 * `Text`'s width/height throws. Tests that lay out text (e.g. the in-world
 * ContextualMessageView) import this once for a deterministic monospace
 * approximation: every glyph is `fontSize` wide and tall, which is exactly
 * true of the "Press Start 2P" pixel font the game uses.
 */
CanvasTextMetrics.measureText = ((text = ' ', style) => {
  const size = Number(style?.fontSize) || 12
  return { width: text.length * size, height: size }
}) as typeof CanvasTextMetrics.measureText
