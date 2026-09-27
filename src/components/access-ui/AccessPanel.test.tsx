import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { audioManager } from '../../game/audio/AudioManager'
import { authManager } from '../../game/auth/AuthManager'
import { AccessPanel } from './AccessPanel'

beforeEach(() => {
  authManager.logout()
})

afterEach(() => {
  cleanup()
  authManager.logout()
})

describe('AccessPanel', () => {
  it('starts locked, showing the guest identity — no username/password form anywhere', () => {
    render(<AccessPanel onAccessGranted={vi.fn()} />)

    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('GUEST')).toBeInTheDocument()
    expect(screen.getByText('ROLE')).toBeInTheDocument()
    expect(screen.getByText('VISITOR')).toBeInTheDocument()
    expect(screen.getByText(/SESSION: READY/)).toBeInTheDocument()
    expect(screen.getByText(/ACCESS: LOCKED/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /access system/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(false)
  })

  it('requires no keyboard interaction — clicking ACCESS SYSTEM alone walks through to ACCESS GRANTED and creates a real local guest session', async () => {
    const user = userEvent.setup()
    render(<AccessPanel onAccessGranted={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /access system/i }))
    expect(screen.getByText(/AUTHENTICATING GUEST/i)).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getByText(/ACCESS GRANTED/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/SESSION ACTIVE/i)).toBeInTheDocument()
    expect(screen.getByText(/ROLE: GUEST/i)).toBeInTheDocument()
    expect(authManager.isAuthenticated()).toBe(true)
    expect(authManager.getSession()?.role).toBe('GUEST')
  })

  it('ACCESS SYSTEM plays the same SFX as an [E] interaction, once per click', async () => {
    const playOpen = vi.spyOn(audioManager, 'playInteractOpen')
    const user = userEvent.setup()
    render(<AccessPanel onAccessGranted={vi.fn()} />)

    expect(playOpen).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /access system/i }))
    expect(playOpen).toHaveBeenCalledTimes(1)
    playOpen.mockRestore()
  })

  it('calls onAccessGranted exactly once, shortly after reaching ACCESS GRANTED', async () => {
    const onAccessGranted = vi.fn()
    const user = userEvent.setup()
    render(<AccessPanel onAccessGranted={onAccessGranted} />)

    await user.click(screen.getByRole('button', { name: /access system/i }))
    await waitFor(() =>
      expect(screen.getByText(/ACCESS GRANTED/i)).toBeInTheDocument(),
    )

    await waitFor(() => expect(onAccessGranted).toHaveBeenCalledTimes(1))

    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onAccessGranted).toHaveBeenCalledTimes(1)
  })

  it('shows only access essentials — no boot/status dashboard, and no claim of server validation', () => {
    render(<AccessPanel onAccessGranted={vi.fn()} />)

    expect(screen.getByText('DHAWAL.OS')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'SYSTEM ACCESS' }),
    ).toBeInTheDocument()
    expect(screen.getByText('GUEST SESSION')).toBeInTheDocument()

    for (const removed of [
      /SYSTEM STATUS/,
      /RENDERER/,
      /ASSETS/,
      /PROFILE/,
      /SYS 01/,
      /ONLINE/,
    ]) {
      expect(screen.queryByText(removed)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/server/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
