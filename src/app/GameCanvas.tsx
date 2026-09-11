import { useEffect, useRef, useState } from 'react'
import { GameApp } from '../game/GameApp'
import './GameCanvas.css'

type Status = 'loading' | 'ready' | 'error'

export interface GameCanvasProps {
  /** Called exactly once, the moment GameApp finishes initializing successfully (PHASE-08.5 "GameApp initialization lifecycle"). */
  onReady?: () => void
  /** Called exactly once if GameApp initialization fails. Never called for a StrictMode phantom double-invoke. */
  onError?: (error: unknown) => void
}

/**
 * Owns the Pixi application lifecycle: mounts the canvas, keeps it sized to
 * this host element, and tears everything down on unmount. Renders no
 * per-frame React state — `status` only changes on init success/failure.
 * `onReady`/`onError` are optional observers for a parent that wants to
 * drive its own application-lifecycle state (PHASE-08.5) — GameCanvas
 * itself remains the single owner of GameApp creation/teardown.
 */
export function GameCanvas({ onReady, onError }: GameCanvasProps = {}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  // Refs, not deps — GameApp must initialize exactly once regardless of how
  // many times a parent passes a new onReady/onError closure across renders.
  // Synced in an effect (not during render) to keep the render pure.
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onReadyRef.current = onReady
    onErrorRef.current = onError
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let gameApp: GameApp | null = null
    let resizeObserver: ResizeObserver | null = null
    let resizeFrame: number | null = null

    // Minimal mobile "tap to interact" stub (INTERACTION_SPEC.md "[TAP]
    // INTERACT"; full touch UX lands in Phase 09) — scoped to the canvas
    // host only, not the whole window. Restricted to actual touch/pen input:
    // a desktop mouse click on the canvas is how a visitor gives it keyboard
    // focus (see e2e), and since Phase 08 pauses world input while a panel
    // is open, treating that click as an interact-tap could open a panel the
    // visitor never asked for and then get "stuck" (world paused) until they
    // close it.
    const handlePointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse') return
      gameApp?.scene.triggerInteractTap()
    }

    const applyResize = (): void => {
      if (!gameApp) return
      gameApp.resize(host.clientWidth, host.clientHeight)
    }

    const scheduleResize = (): void => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(applyResize)
    }

    const init = async (): Promise<void> => {
      try {
        const app = await GameApp.create({
          width: host.clientWidth || 1,
          height: host.clientHeight || 1,
        })

        if (cancelled) {
          app.destroy()
          return
        }

        gameApp = app
        host.appendChild(app.canvas)
        host.addEventListener('pointerdown', handlePointerDown)

        resizeObserver = new ResizeObserver(scheduleResize)
        resizeObserver.observe(host)

        setStatus('ready')
        onReadyRef.current?.()
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize the Pixi application.', error)
          setStatus('error')
          onErrorRef.current?.(error)
        }
      }
    }

    void init()

    return () => {
      cancelled = true
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
      resizeObserver?.disconnect()
      host.removeEventListener('pointerdown', handlePointerDown)
      gameApp?.destroy()
      gameApp = null
    }
  }, [])

  return (
    <div ref={hostRef} className="game-canvas-host">
      {status === 'error' && (
        <p role="alert" className="game-canvas-fallback">
          Interactive world unavailable.
        </p>
      )}
    </div>
  )
}
