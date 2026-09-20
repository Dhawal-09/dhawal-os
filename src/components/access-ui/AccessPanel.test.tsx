import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('never claims a server validated anything — an honest local-guest-session disclaimer is present', () => {
    render(<AccessPanel onAccessGranted={vi.fn()} />)

    expect(screen.getByText(/local guest session/i)).toBeInTheDocument()
    expect(screen.getByText(/local demo/i)).toBeInTheDocument()
  })
})
