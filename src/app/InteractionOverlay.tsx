import { gsap } from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AboutPanel } from '../components/about-ui/AboutPanel'
import { CatPanel } from '../components/cat-ui/CatPanel'
import { CertificatesPanel } from '../components/certificates-ui/CertificatesPanel'
import { ContactPanel } from '../components/contact-ui/ContactPanel'
import { EducationPanel } from '../components/education-ui/EducationPanel'
import { ExperiencePanel } from '../components/experience-ui/ExperiencePanel'
import { ProjectsPanel } from '../components/project-ui/ProjectsPanel'
import { ResumePanel } from '../components/resume-ui/ResumePanel'
import { SkillsPanel } from '../components/skills-ui/SkillsPanel'
import {
  gameEventBridge,
  OPEN_EVENTS,
  type GameEvent,
} from '../game/events/GameEventBridge'
import './InteractionOverlay.css'
import type { PanelContent, PanelHeader } from './panelHeader'

const TITLE_BY_EVENT: Partial<Record<GameEvent, string>> = {
  OPEN_PROJECTS: 'Projects',
  OPEN_EXPERIENCE: 'Experience',
  OPEN_SKILLS: 'Skills',
  OPEN_EDUCATION: 'Education',
  OPEN_CERTIFICATES: 'Certificates',
  OPEN_RESUME: 'Resume',
  OPEN_ABOUT: 'About Me',
  OPEN_CONTACT: 'Contact',
  OPEN_CAT: 'GINGER',
}

const PANEL_BY_EVENT: Partial<Record<GameEvent, PanelContent>> = {
  OPEN_PROJECTS: ProjectsPanel,
  OPEN_EXPERIENCE: ExperiencePanel,
  OPEN_SKILLS: SkillsPanel,
  OPEN_EDUCATION: EducationPanel,
  OPEN_CERTIFICATES: CertificatesPanel,
  OPEN_RESUME: ResumePanel,
  OPEN_ABOUT: AboutPanel,
  OPEN_CONTACT: ContactPanel,
  OPEN_CAT: CatPanel,
}

/**
 * Sections rendered in "window" mode: the panel draws its own system-window
 * frame and title bar (including Close), and the shell only supplies the
 * dialog semantics, focus trap, Escape, and pause/resume. Everything else
 * keeps the shared header + panel chrome.
 */
const WINDOW_EVENTS: ReadonlySet<GameEvent> = new Set<GameEvent>(['OPEN_ABOUT'])

const TITLE_ID = 'portfolio-panel-title'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * The single reusable portfolio panel/modal shell (ACCESSIBILITY.md /
 * PHASE-08-PORTFOLIO-UI.md "Panel architecture" — one dialog implementation,
 * not eight independent ones). Subscribes to `GameEventBridge`, tracks
 * which section is currently active, and renders the matching pure content
 * component from `components/*-ui`. Closing emits `RETURN_TO_WORLD`, which
 * `GameScene` also listens for to resume world input — the game world is
 * never destroyed/recreated here.
 */
export function InteractionOverlay() {
  const [openEvent, setOpenEvent] = useState<GameEvent | null>(null)
  const [header, setHeader] = useState<PanelHeader | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const isOpen = openEvent !== null

  useEffect(() => {
    return gameEventBridge.subscribe((event) => {
      if (OPEN_EVENTS.has(event)) {
        setOpenEvent(event)
      } else if (event === 'CLOSE_OVERLAY' || event === 'RETURN_TO_WORLD') {
        setOpenEvent(null)
      }
    })
  }, [])

  const close = useCallback(() => {
    setOpenEvent(null)
    gameEventBridge.emit('RETURN_TO_WORLD')
  }, [])

  // Focus restoration: remember what had focus the moment the panel opens,
  // restore it once the panel fully closes (not on every section switch).
  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [isOpen])

  // Move focus into the panel, and play a brief entrance transition, every
  // time the active section changes (open, or switching to a different
  // section without closing first).
  useEffect(() => {
    if (!openEvent || !dialogRef.current) return
    const node = dialogRef.current

    // GSAP's tween setup must run before `focus()` — creating a tween after
    // focusing the node resets `document.activeElement` back to the
    // document (observed empirically; order matters here).
    if (prefersReducedMotion()) {
      gsap.set(node, { opacity: 1, y: 0 })
    } else {
      gsap.fromTo(
        node,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
      )
    }
    node.focus()
  }, [openEvent])

  // A panel navigating internally (Projects home → list → detail) swaps
  // content without the shell re-opening: start each view at the top and
  // put focus back on the dialog so the removed button doesn't drop focus
  // to <body>.
  const headerTitle = header?.title
  useEffect(() => {
    const node = dialogRef.current
    if (!node || headerTitle === undefined) return
    node.scrollTop = 0
    node.focus()
  }, [headerTitle])

  useEffect(() => {
    if (!openEvent) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openEvent, close])

  if (!openEvent) return null

  const PanelContent = PANEL_BY_EVENT[openEvent]
  const defaultTitle = TITLE_BY_EVENT[openEvent]
  if (!PanelContent || !defaultTitle) return null
  const title = header?.title ?? defaultTitle
  const onBack = header?.onBack

  if (WINDOW_EVENTS.has(openEvent)) {
    return (
      <div className="interaction-overlay is-window">
        <div
          ref={dialogRef}
          className="interaction-overlay-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby={TITLE_ID}
          tabIndex={-1}
        >
          <PanelContent
            setHeader={setHeader}
            title={defaultTitle}
            titleId={TITLE_ID}
            onClose={close}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="interaction-overlay">
      <div
        ref={dialogRef}
        className="interaction-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
      >
        <div className={onBack ? 'panel-header has-back' : 'panel-header'}>
          {onBack && (
            <button
              type="button"
              className="panel-close panel-back"
              onClick={onBack}
            >
              Back
            </button>
          )}
          <h2 id={TITLE_ID}>{title}</h2>
          <button type="button" className="panel-close" onClick={close}>
            Close
          </button>
        </div>
        <div className="panel-body">
          <PanelContent
            setHeader={setHeader}
            title={defaultTitle}
            titleId={TITLE_ID}
            onClose={close}
          />
        </div>
      </div>
    </div>
  )
}
