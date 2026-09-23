import type { CSSProperties } from 'react'
import type { PanelContentProps } from '../../app/panelHeader'
import { about, CHARACTER_PHOTO, characterId } from '../../data/about'
import './AboutPanel.css'

/**
 * About Me as a compact DHAWAL.OS CHARACTER ID card — photo on the left,
 * identity on the right. Rendered by `InteractionOverlay` in "window"
 * mode, so it draws its own frame and title bar (the × is the real Close);
 * the shell still owns the dialog semantics, focus trap, Escape, and world
 * pause/resume. All content comes from `src/data/about.ts`.
 */
export function AboutPanel({ titleId, onClose }: PanelContentProps) {
  return (
    <div className="id-card">
      <span className="id-tick id-tick-tl" aria-hidden="true" />
      <span className="id-tick id-tick-tr" aria-hidden="true" />
      <span className="id-tick id-tick-bl" aria-hidden="true" />
      <span className="id-tick id-tick-br" aria-hidden="true" />

      <header className="id-header">
        <span className="id-brand">
          <span className="id-brand-dot" aria-hidden="true" />
          DHAWAL.OS
        </span>
        <div className="id-header-right">
          {/* The section is still "About Me" for assistive tech and the
              dialog label; the card itself reads CHARACTER ID. */}
          <h2 id={titleId} className="id-doc-title">
            <span className="id-visually-hidden">About Me</span>
            <span aria-hidden="true">Character ID</span>
          </h2>
          <button
            type="button"
            className="id-close"
            onClick={onClose}
            aria-label="Close"
          >
            X
          </button>
        </div>
      </header>
      <div className="id-divider" aria-hidden="true" />

      <div className="id-body">
        <figure className="id-photo-block">
          <div className="id-photo-frame">
            <span className="id-tick id-tick-tl" aria-hidden="true" />
            <span className="id-tick id-tick-tr" aria-hidden="true" />
            <span className="id-tick id-tick-bl" aria-hidden="true" />
            <span className="id-tick id-tick-br" aria-hidden="true" />
            <div
              className="id-photo"
              style={
                {
                  '--id-photo': `url("${CHARACTER_PHOTO}")`,
                } as CSSProperties
              }
              role="img"
              aria-label={`Pixel-art portrait of ${about.name}`}
            />
          </div>
          <figcaption className="id-photo-caption" aria-hidden="true">
            <span>Photo</span>
            <span>Ref 01</span>
          </figcaption>
        </figure>

        <div className="id-info">
          <p className="id-name">{about.name}</p>
          <p className="id-role">{about.title}</p>
          <div className="id-accent" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <dl className="id-rows">
            {characterId.rows.map((row) => (
              <div key={row.label} className="id-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <footer className="id-footer">
        <span className="id-number">
          <span className="id-muted">ID:</span> {characterId.id}
        </span>
        <span className="id-sys" aria-hidden="true">
          <span className="id-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          DHAWAL.OS // SYS-ID
        </span>
        <span className="id-status">
          <span className="id-led" aria-hidden="true" />
          {characterId.status}
        </span>
      </footer>
    </div>
  )
}
