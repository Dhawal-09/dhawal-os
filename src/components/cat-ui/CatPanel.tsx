import { useState } from 'react'
import { cat, WHISKERS_PORTRAIT_PATH } from '../../data/cat'
import './CatPanel.css'

/**
 * Renders only from `src/data/cat.ts` — the Education room's easter-egg
 * cat, not a portfolio section. The ID portrait is a pending asset
 * (`WHISKERS_PORTRAIT_PATH` — see `data/cat.ts`): this shows a clearly
 * placeholder frame until that file exists, and upgrades to the real image
 * automatically the moment it's added, with no code change required (same
 * "pending asset" pattern as `ResumePanel`/`RESUME_PDF_PATH`).
 */
export function CatPanel() {
  const [portraitFailed, setPortraitFailed] = useState(false)

  return (
    <div className="cat-panel">
      <div className="cat-panel-top">
        <div className="cat-portrait-frame">
          {portraitFailed ? (
            <div className="cat-portrait-placeholder" aria-hidden="true">
              <span>CAT ID</span>
              <span>PORTRAIT</span>
            </div>
          ) : (
            <img
              className="cat-portrait-image"
              src={WHISKERS_PORTRAIT_PATH}
              alt=""
              onError={() => setPortraitFailed(true)}
            />
          )}
        </div>

        <div className="cat-identity">
          <h4>{cat.name}</h4>
          <p className="cat-role">{cat.title}</p>
        </div>
      </div>

      <p className="cat-summary">{cat.summary}</p>
    </div>
  )
}
