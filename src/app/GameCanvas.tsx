import { useEffect, useRef, useState } from 'react'
import { GameApp } from '../game/GameApp'
import './GameCanvas.css'

type Status = 'loading' | 'ready' | 'error'

/**
 * Owns the Pixi application lifecycle: mounts the canvas, keeps it sized to
 * this host element, and tears everything down on unmount. Renders no
 * per-frame React state — `status` only changes on init success/failure.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let gameApp: GameApp | null = null
    let resizeObserver: ResizeObserver | null = null
    let resizeFrame: number | null = null

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

        resizeObserver = new ResizeObserver(scheduleResize)
        resizeObserver.observe(host)

        setStatus('ready')
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize the Pixi application.', error)
          setStatus('error')
        }
      }
    }

    void init()

    return () => {
      cancelled = true
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
      resizeObserver?.disconnect()
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
