import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas-stub" />,
}))

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renders the foundation placeholder shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /dhawal\.os/i }),
    ).toBeInTheDocument()
  })

  it('renders the conventional portfolio navigation, so every section is reachable without the game', () => {
    render(<App />)

    expect(
      screen.getByRole('navigation', { name: /portfolio sections/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })
})
