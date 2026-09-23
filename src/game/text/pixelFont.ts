/**
 * Matches `--font-pixel` in `src/styles/index.css` — the single source of
 * truth for PixiJS text that must render in DHAWAL.OS's pixel-BIOS display
 * font. Falls back to `monospace` automatically (CSS font-stack matching)
 * whenever Press Start 2P isn't available, so the game world never breaks if the
 * font file is missing.
 */
export const PIXEL_FONT_FAMILY = '"Press Start 2P", monospace'

let loadStarted = false

/**
 * Kicks off loading the Press Start 2P web font as early as possible (call once,
 * at app startup) so it's already available by the time in-world PixiJS
 * text — e.g. Player's `[E] INTERACT` prompt — is first created. Canvas
 * text doesn't repaint itself when a web font finishes loading after the
 * fact, unlike DOM text, so starting this early matters.
 *
 * Fire-and-forget: never awaited by callers, safe in environments without
 * the FontFace API (older browsers, jsdom in tests), and never retried in a
 * loop.
 */
export function preloadPixelFont(): void {
  if (loadStarted || typeof document === 'undefined' || !document.fonts) {
    return
  }
  loadStarted = true
  void document.fonts.load('16px "Press Start 2P"').catch(() => undefined)
}
