import type { HTMLAttributes, ReactNode, Ref } from 'react'
import './GamePanel.css'

export type GamePanelSize = 'small' | 'medium' | 'large'

export interface GameFrameProps extends HTMLAttributes<HTMLDivElement> {
  /** SMALL / MEDIUM / LARGE — three proportions of the one frame, not a scaled copy. */
  size?: GamePanelSize
  /**
   * The header row's contents, after the slanted stripes. Without one the
   * header is just the stripes — a slim top bar.
   */
  header?: ReactNode
  /** Adds the header's Back-button layout (title wraps below on phones). */
  headerHasBack?: boolean
  ref?: Ref<HTMLDivElement>
  /** The content area. */
  bodyRef?: Ref<HTMLDivElement>
  children: ReactNode
}

/**
 * The DHAWAL.OS pixel HUD frame on its own — the stepped-corner,
 * multi-layer border, the header strip, the content screen and the footer
 * strip — with no dialog behaviour. `GamePanel` wraps it for the
 * information panels; anything else that should look like part of the same
 * game interface (the Landing intro) uses it directly. Extra attributes
 * (role, aria-*, tabIndex, className) land on the root element.
 */
export function GameFrame({
  size = 'medium',
  header,
  headerHasBack = false,
  ref,
  bodyRef,
  className,
  children,
  ...rest
}: GameFrameProps) {
  const classes = ['game-panel', `game-panel--${size}`]
  if (className) classes.push(className)
  const headerClasses = ['game-panel-header']
  if (headerHasBack) headerClasses.push('has-back')
  if (!header) headerClasses.push('is-bare')

  return (
    <div ref={ref} className={classes.join(' ')} {...rest}>
      <div className="game-panel-shell">
        <div className={headerClasses.join(' ')}>
          <span className="game-panel-stripes" aria-hidden="true" />
          {header}
        </div>

        <div className="game-panel-screen">
          <div className="game-panel-surface">
            <div ref={bodyRef} className="game-panel-body">
              {children}
            </div>
            <span className="game-panel-dither" aria-hidden="true" />
          </div>
        </div>

        <div className="game-panel-footer" aria-hidden="true">
          <span className="game-panel-segments" />
          <span className="game-panel-dots" />
        </div>
      </div>
    </div>
  )
}

export interface GamePanelProps {
  /** SMALL / MEDIUM / LARGE — three proportions of the one frame, not a scaled copy. */
  size?: GamePanelSize
  title: string
  /** The id the dialog's `aria-labelledby` points at. */
  titleId: string
  /** Optional artwork shown before the title. */
  icon?: ReactNode
  /** Shown before the title when the content has somewhere to go back to. */
  onBack?: () => void
  onClose: () => void
  /** The dialog element itself — what receives focus and the entrance transition. */
  ref?: Ref<HTMLDivElement>
  /** The scrolling content area. */
  bodyRef?: Ref<HTMLDivElement>
  children: ReactNode
}

/** A 7×7 pixel "X" — drawn on a grid so it stays crisp at any size. */
function PixelCross() {
  return (
    <svg
      className="game-panel-x-icon"
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0h1v1H0zM6 0h1v1H6zM1 1h1v1H1zM5 1h1v1H5zM2 2h1v1H2zM4 2h1v1H4zM3 3h1v1H3zM2 4h1v1H2zM4 4h1v1H4zM1 5h1v1H1zM5 5h1v1H5zM0 6h1v1H0zM6 6h1v1H6z" />
    </svg>
  )
}

/** A pixel "◀" for Back, on the same grid as the X. */
function PixelArrow() {
  return (
    <svg
      className="game-panel-back-icon"
      viewBox="0 0 5 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 0h1v1H3zM2 1h2v1H2zM1 2h3v1H1zM0 3h4v1H0zM1 4h3v1H1zM2 5h2v1H2zM3 6h1v1H3z" />
    </svg>
  )
}

/**
 * The DHAWAL.OS in-game panel: `GameFrame` as a modal dialog, with a header
 * of optional Back, optional icon, title and X, around a clean, scrolling
 * content area. The one outer container every information panel renders
 * inside (InteractionOverlay.tsx). It knows nothing about what it holds, and
 * all of the open/close/focus logic stays with the shell that renders it.
 *
 * Built entirely from CSS (clip-path polygons + layered backgrounds) and
 * two tiny inline SVG glyphs — no raster artwork — so it scales cleanly.
 */
export function GamePanel({
  size = 'medium',
  title,
  titleId,
  icon,
  onBack,
  onClose,
  ref,
  bodyRef,
  children,
}: GamePanelProps) {
  return (
    <GameFrame
      ref={ref}
      bodyRef={bodyRef}
      size={size}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      headerHasBack={Boolean(onBack)}
      header={
        <>
          {onBack && (
            <button type="button" className="game-panel-back" onClick={onBack}>
              <PixelArrow />
              <span>Back</span>
            </button>
          )}
          {icon && <span className="game-panel-icon">{icon}</span>}
          <h2 id={titleId} className="game-panel-title">
            {title}
          </h2>
          <button
            type="button"
            className="game-panel-x"
            onClick={onClose}
            aria-label="Close"
          >
            <PixelCross />
          </button>
        </>
      }
    >
      {children}
    </GameFrame>
  )
}
