import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas-stub" />,
}))

describe('App', () => {
  it('renders the foundation placeholder shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /dhawal\.os/i }),
    ).toBeInTheDocument()
  })
})
